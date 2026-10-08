import Stripe from "stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type SupabaseAdminClient = NonNullable<ReturnType<typeof createSupabaseAdminClient>>;
type CheckoutSyncStatus = "succeeded" | "processing" | "failed" | "canceled" | "refunded" | "ignored";
type SubscriptionStatus = "checkout_pending" | "checkout_failed" | Stripe.Subscription.Status;
type PlanId = "discovery" | "standard" | "premium";

const getStripeObjectId = (value: string | { id: string } | null): string | null =>
  typeof value === "string" ? value : value?.id ?? null;

const isPlanId = (value: string | undefined): value is PlanId =>
  value === "discovery" || value === "standard" || value === "premium";

const getSubscriptionPeriodEnd = (subscription: Stripe.Subscription): string | null => {
  const periodEnd = subscription.items.data.reduce(
    (latest, item) => Math.max(latest, item.current_period_end),
    0,
  );
  return periodEnd ? new Date(periodEnd * 1000).toISOString() : null;
};

export async function syncStripeSubscription(
  admin: SupabaseAdminClient,
  subscription: Stripe.Subscription,
  checkoutSessionId?: string,
): Promise<void> {
  const userId = subscription.metadata.user_id;
  const planId = subscription.metadata.plan_id;
  if (!userId || !isPlanId(planId)) {
    throw new Error("L’abonnement Stripe ne contient pas d’utilisateur ou de formule valide.");
  }

  const values = {
    user_id: userId,
    provider: "stripe",
    provider_customer_id: getStripeObjectId(subscription.customer) ?? "",
    provider_subscription_id: subscription.id,
    ...(checkoutSessionId ? { provider_checkout_session_id: checkoutSessionId } : {}),
    plan_id: planId,
    status: subscription.status as SubscriptionStatus,
    cancel_at_period_end: subscription.cancel_at_period_end,
    current_period_end: getSubscriptionPeriodEnd(subscription),
    canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
    updated_at: new Date().toISOString(),
  };

  let existing = await admin.from("course_subscriptions").select("id, provider_subscription_id")
    .eq("provider_subscription_id", subscription.id).maybeSingle();
  if (existing.error) throw new Error("Impossible de retrouver l’abonnement Supabase.");
  if (!existing.data && checkoutSessionId) {
    existing = await admin.from("course_subscriptions").select("id, provider_subscription_id")
      .eq("provider_checkout_session_id", checkoutSessionId).maybeSingle();
    if (existing.error) throw new Error("Impossible de retrouver la session d’abonnement Supabase.");
  }
  if (!existing.data) {
    existing = await admin.from("course_subscriptions").select("id, provider_subscription_id")
      .eq("user_id", userId)
      .eq("provider_customer_id", getStripeObjectId(subscription.customer) ?? "")
      .eq("plan_id", planId)
      .eq("status", "checkout_pending")
      .maybeSingle();
  }
  if (existing.error) throw new Error("Impossible de retrouver l’abonnement Supabase.");

  const result = existing.data
    ? await admin.from("course_subscriptions").update(values).eq("id", existing.data.id)
    : await admin.from("course_subscriptions").upsert(values, { onConflict: "provider_subscription_id" });
  if (result.error) throw new Error("Impossible d’enregistrer l’abonnement Stripe.");
}

export async function syncStripeInvoice(
  stripe: Stripe,
  admin: SupabaseAdminClient,
  invoice: Stripe.Invoice,
  eventType: "invoice.finalized" | "invoice.payment_succeeded" | "invoice.payment_failed" | "invoice.voided",
): Promise<void> {
  if (!invoice.id) throw new Error("La facture Stripe n’a pas d’identifiant.");
  const currentInvoice = await stripe.invoices.retrieve(invoice.id, {
    expand: ["payments.data.payment.payment_intent"],
  });
  const subscriptionId = currentInvoice.parent?.subscription_details?.subscription;
  if (!subscriptionId) return;

  const subscription = typeof subscriptionId === "string"
    ? await stripe.subscriptions.retrieve(subscriptionId)
    : subscriptionId;
  await syncStripeSubscription(admin, subscription);

  const userId = subscription.metadata.user_id;
  const planId = subscription.metadata.plan_id;
  if (!userId || !isPlanId(planId)) {
    throw new Error("La facture Stripe ne correspond pas à une formule de cours connue.");
  }

  const { data: previousPayment, error: previousPaymentError } = await admin
    .from("payments")
    .select("status")
    .eq("provider_invoice_id", currentInvoice.id)
    .maybeSingle();
  if (previousPaymentError) throw new Error("Impossible de vérifier l’état précédent de la facture.");

  const intent = currentInvoice.payments?.data
    .map((payment) => payment.payment.payment_intent)
    .find((payment): payment is string | Stripe.PaymentIntent => Boolean(payment));
  const paymentIntentId = intent ? getStripeObjectId(intent) : null;
  const status = currentInvoice.status === "paid" || eventType === "invoice.payment_succeeded"
    ? "succeeded"
    : currentInvoice.status === "void" || eventType === "invoice.voided"
      ? "canceled"
      : eventType === "invoice.payment_failed"
        ? "failed"
        : previousPayment?.status === "failed" || previousPayment?.status === "canceled"
          ? previousPayment.status
          : "processing";
  const { error: paymentError } = await admin.from("payments").upsert({
    user_id: userId,
    provider: "stripe",
    product_type: "course_plan",
    status,
    amount_cents: Math.max(currentInvoice.total, 1),
    currency: currentInvoice.currency,
    provider_customer_id: getStripeObjectId(currentInvoice.customer),
    provider_invoice_id: currentInvoice.id,
    provider_payment_intent_id: paymentIntentId,
    hosted_invoice_url: currentInvoice.hosted_invoice_url ?? null,
    invoice_pdf_url: currentInvoice.invoice_pdf ?? null,
    metadata: { plan_id: planId, subscription_id: subscription.id, billing_reason: currentInvoice.billing_reason },
    ...(status === "succeeded" ? { paid_at: new Date().toISOString() } : {}),
    updated_at: new Date().toISOString(),
  }, { onConflict: "provider_invoice_id" });
  if (paymentError) throw new Error("Impossible d’enregistrer la facture dans Supabase.");

  if (eventType === "invoice.payment_succeeded" && subscription.metadata.membership_fee_included === "true") {
    const { error } = await admin.from("memberships").upsert({
      user_id: userId,
      status: "active",
      amount_cents: 1000,
      activated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    if (error) throw new Error("Impossible d’activer l’adhésion après paiement de la première facture.");
  }
}

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
