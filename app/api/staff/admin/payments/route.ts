import { NextResponse } from "next/server";
import { authorizeStaff } from "@/lib/auth/staff";

export async function GET() {
  const authorization = await authorizeStaff(["admin"]);
  if (authorization.response) return authorization.response;
  const { admin } = authorization.context;

  const [{ data: payments, error: paymentError }, { data: subscriptions, error: subscriptionError }] =
    await Promise.all([
      admin.from("payments")
        .select("id, user_id, product_type, status, amount_cents, currency, provider_session_id, provider_payment_intent_id, hosted_invoice_url, invoice_pdf_url, created_at, paid_at, refunded_at")
        .order("created_at", { ascending: false }).limit(100),
      admin.from("course_subscriptions")
        .select("id, user_id, provider_customer_id, plan_id, status, current_period_end, cancel_at_period_end, updated_at")
        .order("updated_at", { ascending: false }).limit(100),
    ]);
  if (paymentError || subscriptionError) {
    console.error("Unable to load admin billing data", paymentError ?? subscriptionError);
    return NextResponse.json({ error: "Impossible de charger les paiements et abonnements." }, { status: 503 });
  }

  const userIds = [...new Set([
    ...(payments ?? []).map((payment) => payment.user_id),
    ...(subscriptions ?? []).map((subscription) => subscription.user_id),
  ])];
  const { data: profiles, error: profileError } = userIds.length
    ? await admin.from("profiles").select("id, first_name, last_name").in("id", userIds)
    : { data: [], error: null };
  const { data: refunds, error: refundError } = (payments ?? []).length
    ? await admin.from("admin_refund_actions").select("id, payment_id, status, stripe_refund_id, created_at")
      .in("payment_id", (payments ?? []).map((payment) => payment.id))
      .order("created_at", { ascending: false })
    : { data: [], error: null };
  if (profileError || refundError) {
    console.error("Unable to load admin billing details", profileError ?? refundError);
    return NextResponse.json({ error: "Impossible de charger les détails de facturation." }, { status: 503 });
  }

  const names = new Map((profiles ?? []).map((profile) => [
    profile.id,
    [profile.first_name, profile.last_name].filter(Boolean).join(" "),
  ]));
  return NextResponse.json({
    payments: (payments ?? []).map((payment) => ({
      ...payment,
      customerName: names.get(payment.user_id) ?? "",
      refundActions: (refunds ?? []).filter((refund) => refund.payment_id === payment.id),
    })),
    subscriptions: (subscriptions ?? []).map((subscription) => ({
      ...subscription,
      customerName: names.get(subscription.user_id) ?? "",
      hasStripeCustomer: Boolean(subscription.provider_customer_id),
    })),
  });
}
