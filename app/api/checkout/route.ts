import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Supabase Auth n’est pas configuré." }, { status: 503 });

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Connectez-vous avant de payer." }, { status: 401 });

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError || !profile) {
    return NextResponse.json({ error: "Le profil étudiant est introuvable. Vérifiez la migration 003_auth_roles_and_memberships.sql." }, { status: 409 });
  }
  if (profile.role === "teacher" || profile.role === "admin") {
    return NextResponse.json({ error: "Ce compte utilise l’accès enseignant et n’a pas besoin d’une adhésion étudiante." }, { status: 403 });
  }

  const { data: membership, error: membershipError } = await supabase
    .from("memberships")
    .select("status")
    .eq("user_id", user.id)
    .maybeSingle();
  if (membershipError) return NextResponse.json({ error: "Impossible de vérifier l’adhésion." }, { status: 503 });
  if (membership?.status === "active") return NextResponse.json({ alreadyActive: true });

  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "Le service de paiement Supabase n’est pas configuré." }, { status: 503 });

  const key = process.env.STRIPE_SECRET_KEY;
  const price = process.env.STRIPE_PRICE_ID;
  if (!key || !price) {
    return NextResponse.json({ error: "Le paiement Stripe n’est pas configuré sur le serveur." }, { status: 503 });
  }

  const site = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  let paymentId: string | null = null;
  try {
    const stripe = new Stripe(key);
    const stripePrice = await stripe.prices.retrieve(price);
    if (!stripePrice.active || stripePrice.recurring || stripePrice.unit_amount === null || stripePrice.unit_amount <= 0) {
      return NextResponse.json({ error: "Le prix Stripe doit être actif et ponctuel." }, { status: 503 });
    }

    const { data: previousPayment, error: previousPaymentError } = await admin
      .from("payments")
      .select("provider_customer_id")
      .eq("user_id", user.id)
      .eq("provider", "stripe")
      .not("provider_customer_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (previousPaymentError) {
      return NextResponse.json({ error: "Impossible de préparer le compte de paiement." }, { status: 503 });
    }

    let customerId = previousPayment?.provider_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        ...(user.email ? { email: user.email } : {}),
        metadata: { user_id: user.id },
      }, { idempotencyKey: `mara-customer-${user.id}` });
      customerId = customer.id;
    }

    const { data: payment, error: paymentError } = await admin
      .from("payments")
      .insert({
        user_id: user.id,
        provider: "stripe",
        product_type: "membership",
        status: "pending",
        amount_cents: stripePrice.unit_amount,
        currency: stripePrice.currency,
        provider_customer_id: customerId,
      })
      .select("id")
      .single();
    if (paymentError || !payment) {
      console.error("Unable to create the payment record in Supabase", paymentError);
      return NextResponse.json({ error: "Impossible d’enregistrer la demande de paiement." }, { status: 503 });
    }
    paymentId = payment.id;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price, quantity: 1 }],
      client_reference_id: user.id,
      customer: customerId,
      success_url: `${site}/api/checkout/confirm?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${site}/?payment=cancelled`,
      metadata: { product: "ensemble-access", user_id: user.id, payment_id: payment.id },
      payment_intent_data: {
        metadata: { product: "ensemble-access", user_id: user.id, payment_id: payment.id },
      },
    }, { idempotencyKey: payment.id });

    const { error: updateError } = await admin.from("payments").update({
      provider_session_id: session.id,
      updated_at: new Date().toISOString(),
    }).eq("id", payment.id);
    if (updateError) {
      console.error("Unable to save the Stripe Checkout session", updateError);
      return NextResponse.json({ error: "La session de paiement a été créée mais n’a pas pu être enregistrée." }, { status: 503 });
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe Checkout session creation failed", error);
    if (paymentId) {
      const { error: updateError } = await admin.from("payments").update({
        status: "failed",
        updated_at: new Date().toISOString(),
      }).eq("id", paymentId);
      if (updateError) console.error("Unable to mark the payment attempt as failed", updateError);
    }
    return NextResponse.json({ error: "Stripe n’a pas pu créer la session de paiement." }, { status: 502 });
  }
}
