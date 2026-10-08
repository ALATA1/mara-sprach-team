import Stripe from "stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type SupabaseAdminClient = NonNullable<ReturnType<typeof createSupabaseAdminClient>>;
type CheckoutSyncStatus = "succeeded" | "processing" | "failed" | "canceled" | "refunded" | "ignored";

const getStripeObjectId = (value: string | { id: string } | null): string | null =>
  typeof value === "string" ? value : value?.id ?? null;

export async function reconcileStripeCheckoutSession(
  stripe: Stripe,
  admin: SupabaseAdminClient,
  session: Stripe.Checkout.Session,
  statusOverride?: "failed" | "canceled",
): Promise<CheckoutSyncStatus> {
  const paymentId = session.metadata?.payment_id;
  const userId = session.metadata?.user_id ?? session.client_reference_id;
  const isPaid = session.payment_status === "paid";

  if (session.mode !== "payment") throw new Error("La session Stripe n’est pas un paiement ponctuel.");
  if (!paymentId && session.metadata?.product !== "ensemble-access") return "ignored";
  if (!userId) throw new Error("La session Stripe ne contient pas d’identité client.");

  let productType = "membership";
  let amountCents = session.amount_total ?? 0;
  let paymentCurrency = session.currency ?? "eur";

  if (paymentId) {
    const { data: payment, error } = await admin
      .from("payments")
      .select("user_id, provider, product_type, status, provider_session_id, amount_cents, currency")
      .eq("id", paymentId)
      .maybeSingle();

    if (error) throw new Error("Impossible de retrouver le paiement dans Supabase.");
    if (!payment || payment.user_id !== userId || payment.provider !== "stripe") {
      throw new Error("Le paiement ne correspond pas à l’identité client.");
    }
    if (payment.provider_session_id && payment.provider_session_id !== session.id) {
      throw new Error("La session Stripe ne correspond pas au paiement enregistré.");
    }
    if (payment.status === "refunded") return "refunded";

    productType = payment.product_type;
    amountCents = session.amount_total ?? payment.amount_cents;
    paymentCurrency = session.currency ?? payment.currency;

    const paymentIntentId = getStripeObjectId(session.payment_intent);
    let paymentMethodType: string | null = session.payment_method_types.length === 1
      ? session.payment_method_types[0]
      : null;

    if (isPaid && paymentIntentId) {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
        expand: ["payment_method"],
      });
      if (paymentIntent.payment_method && typeof paymentIntent.payment_method !== "string") {
        paymentMethodType = paymentIntent.payment_method.type;
      }
    }

    const nextStatus = payment.status === "partially_refunded"
      ? "partially_refunded"
      : isPaid ? "succeeded"
      : statusOverride ?? (session.status === "expired" ? "canceled" : "processing");
    const update = await admin.from("payments").update({
      status: nextStatus,
      amount_cents: amountCents,
      currency: paymentCurrency,
      provider_session_id: session.id,
      provider_payment_intent_id: paymentIntentId,
      provider_customer_id: getStripeObjectId(session.customer),
      ...(paymentMethodType ? { payment_method_type: paymentMethodType } : {}),
      ...(isPaid ? { paid_at: new Date().toISOString() } : {}),
      updated_at: new Date().toISOString(),
    }).eq("id", paymentId);

    if (update.error) throw new Error("Impossible de mettre à jour le paiement dans Supabase.");
  }

  if (!isPaid) return statusOverride ?? (session.status === "expired" ? "canceled" : "processing");
  if (productType === "membership") {
    const { error } = await admin.from("memberships").upsert({
      user_id: userId,
      status: "active",
      amount_cents: amountCents,
      activated_at: new Date().toISOString(),
      stripe_session_id: session.id,
    }, { onConflict: "user_id" });

    if (error) throw new Error("Impossible d’activer l’adhésion après le paiement.");
  }

  return "succeeded";
}

export async function reconcileStripeRefund(
  stripe: Stripe,
  admin: SupabaseAdminClient,
  charge: Stripe.Charge,
): Promise<void> {
  const paymentIntentId = getStripeObjectId(charge.payment_intent);
  if (!paymentIntentId) return;

  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  const paymentId = paymentIntent.metadata.payment_id;
  const paymentQuery = admin
    .from("payments")
    .select("id, user_id, product_type, provider_session_id")
    .eq("provider", "stripe");
  const { data: payment, error: lookupError } = paymentId
    ? await paymentQuery.eq("id", paymentId).maybeSingle()
    : await paymentQuery.eq("provider_payment_intent_id", paymentIntentId).maybeSingle();

  if (lookupError) throw new Error("Impossible de retrouver le paiement remboursé.");
  if (!payment) return;

  const fullyRefunded = charge.amount_refunded >= charge.amount;
  const { error: updateError } = await admin.from("payments").update({
    status: fullyRefunded ? "refunded" : "partially_refunded",
    refunded_at: fullyRefunded ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  }).eq("id", payment.id);

  if (updateError) throw new Error("Impossible d’enregistrer le remboursement.");

  if (fullyRefunded && payment.product_type === "membership" && payment.provider_session_id) {
    const { error } = await admin.from("memberships")
      .update({ status: "refunded" })
      .eq("user_id", payment.user_id)
      .eq("stripe_session_id", payment.provider_session_id);
    if (error) throw new Error("Impossible de mettre à jour l’adhésion remboursée.");
  }
}
