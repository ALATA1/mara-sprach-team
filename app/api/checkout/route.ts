import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { coursePlans, isCoursePlanId } from "@/lib/payments/plans";

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Supabase Auth n’est pas configuré." }, { status: 503 });

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Connectez-vous avant de choisir une formule." }, { status: 401 });

  let body: { planId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Choisissez une formule de cours valide." }, { status: 400 });
  }
  if (!isCoursePlanId(body.planId)) {
    return NextResponse.json({ error: "Choisissez une formule de cours valide." }, { status: 400 });
  }
  const plan = coursePlans[body.planId];

  const [{ data: profile, error: profileError }, { data: membership, error: membershipError }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
    supabase.from("memberships").select("status").eq("user_id", user.id).maybeSingle(),
  ]);
  if (profileError || !profile || membershipError || !membership) {
    return NextResponse.json({ error: "Impossible de vérifier le compte étudiant et son adhésion." }, { status: 503 });
  }
  if (profile.role === "teacher" || profile.role === "admin") {
    return NextResponse.json({ error: "Les comptes formateur et administrateur n’ont pas besoin d’une formule étudiante." }, { status: 403 });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "Le service de paiement Supabase n’est pas configuré." }, { status: 503 });

  const key = process.env.STRIPE_SECRET_KEY;
  const monthlyPriceId = process.env[plan.priceEnv];
  const membershipPriceId = process.env.STRIPE_PRICE_ID;
  const site = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  if (!key || !monthlyPriceId || (membership.status !== "active" && !membershipPriceId)) {
    return NextResponse.json({ error: "La formule Stripe n’est pas configurée sur le serveur." }, { status: 503 });
  }

  let subscriptionRowId: string | null = null;
  try {
    const stripe = new Stripe(key);
    const [{ data: activeSubscription, error: subscriptionError }, { data: previousSubscription, error: previousSubscriptionError }] = await Promise.all([
      admin.from("course_subscriptions")
        .select("id")
        .eq("user_id", user.id)
        .in("status", ["checkout_pending", "incomplete", "trialing", "active", "past_due", "unpaid", "paused"])
        .maybeSingle(),
      admin.from("course_subscriptions")
        .select("provider_customer_id")
        .eq("user_id", user.id)
        .eq("provider", "stripe")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    if (subscriptionError || previousSubscriptionError) {
      return NextResponse.json({ error: "Impossible de vérifier vos abonnements existants." }, { status: 503 });
    }
    if (activeSubscription) {
      return NextResponse.json({ error: "Un abonnement existe déjà. Gérez-le depuis votre espace facturation." }, { status: 409 });
    }

    const monthlyPrice = await stripe.prices.retrieve(monthlyPriceId);
    if (!monthlyPrice.active || monthlyPrice.recurring?.interval !== "month" ||
      monthlyPrice.currency !== "eur" || monthlyPrice.unit_amount !== plan.amountCents) {
      return NextResponse.json({ error: "Le prix mensuel Stripe de cette formule ne correspond pas à sa configuration." }, { status: 503 });
    }

    const customerId = previousSubscription?.provider_customer_id ??
      (await stripe.customers.create({
        ...(user.email ? { email: user.email } : {}),
        metadata: { user_id: user.id },
      }, { idempotencyKey: `mara-customer-${user.id}` })).id;

    const { data: subscriptionRow, error: insertError } = await admin
      .from("course_subscriptions")
      .insert({
        user_id: user.id,
        provider: "stripe",
        provider_customer_id: customerId,
        plan_id: body.planId,
        status: "checkout_pending",
      })
      .select("id")
      .single();
    if (insertError || !subscriptionRow) {
      if (insertError?.code === "23505") {
        return NextResponse.json({ error: "Une formule est déjà en cours de paiement ou active." }, { status: 409 });
      }
      console.error("Unable to create subscription record in Supabase", insertError);
      return NextResponse.json({ error: "Impossible d’enregistrer la demande d’abonnement." }, { status: 503 });
    }
    subscriptionRowId = subscriptionRow.id;

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      { price: monthlyPriceId, quantity: 1 },
    ];
    const membershipFeeIncluded = membership.status !== "active";
    if (membershipFeeIncluded && membershipPriceId) {
      const membershipPrice = await stripe.prices.retrieve(membershipPriceId);
      if (!membershipPrice.active || membershipPrice.recurring ||
        membershipPrice.currency !== "eur" || membershipPrice.unit_amount !== 1000) {
        throw new Error("Le prix ponctuel de l’adhésion doit être actif et fixé à 10 €.");
      }
      lineItems.push({ price: membershipPriceId, quantity: 1 });
    }

    const metadata = {
      user_id: user.id,
      plan_id: body.planId,
      course_subscription_id: subscriptionRow.id,
      membership_fee_included: String(membershipFeeIncluded),
    };
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: lineItems,
      client_reference_id: user.id,
      customer: customerId,
      success_url: `${site}/api/checkout/confirm?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${site}/?payment=cancelled`,
      metadata,
      subscription_data: { metadata },
    }, { idempotencyKey: subscriptionRow.id });

    const { error: updateError } = await admin.from("course_subscriptions").update({
      provider_checkout_session_id: session.id,
      updated_at: new Date().toISOString(),
    }).eq("id", subscriptionRow.id);
    if (updateError) {
      console.error("Unable to save the Stripe Checkout session", updateError);
      let sessionExpired = false;
      try {
        await stripe.checkout.sessions.expire(session.id);
        sessionExpired = true;
      } catch (error) {
        console.error("Unable to expire the unrecorded Stripe Checkout session", error);
      }
      if (sessionExpired) {
        const { error: markError } = await admin.from("course_subscriptions").update({
          status: "checkout_failed",
          updated_at: new Date().toISOString(),
        }).eq("id", subscriptionRow.id);
        if (markError) console.error("Unable to release the failed subscription attempt", markError);
      }
      return NextResponse.json({ error: "La session Stripe a été créée mais n’a pas pu être enregistrée." }, { status: 503 });
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe subscription Checkout creation failed", error);
    if (subscriptionRowId) {
      const { error: updateError } = await admin.from("course_subscriptions").update({
        status: "checkout_failed",
        updated_at: new Date().toISOString(),
      }).eq("id", subscriptionRowId);
      if (updateError) console.error("Unable to mark the subscription attempt as failed", updateError);
    }
    return NextResponse.json({ error: "Stripe n’a pas pu préparer l’abonnement." }, { status: 502 });
  }
}
