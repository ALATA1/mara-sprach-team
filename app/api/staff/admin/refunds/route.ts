import { NextResponse } from "next/server";
import Stripe from "stripe";
import { authorizeStaff } from "@/lib/auth/staff";
import { reconcileStripeRefund } from "@/lib/payments/stripe";

const isUuid = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const refundReasons = ["requested_by_customer", "duplicate", "fraudulent"] as const;

export async function POST(request: Request) {
  const authorization = await authorizeStaff(["admin"]);
  if (authorization.response) return authorization.response;
  const { user, admin } = authorization.context;

  let body: { paymentId?: unknown; requestId?: unknown; confirmation?: unknown; reason?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "La requête reçue est invalide." }, { status: 400 });
  }
  if (!isUuid(body.paymentId) || !isUuid(body.requestId) || body.confirmation !== "REMBOURSER" ||
    typeof body.reason !== "string" || !refundReasons.includes(body.reason as typeof refundReasons[number])) {
    return NextResponse.json({ error: "Confirmez le remboursement et indiquez un motif valide." }, { status: 400 });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return NextResponse.json({ error: "Stripe n’est pas configuré sur le serveur." }, { status: 503 });
  const { data: payment, error: paymentError } = await admin.from("payments")
    .select("id, status, provider, provider_payment_intent_id, amount_cents")
    .eq("id", body.paymentId)
    .maybeSingle();
  if (paymentError) {
    console.error("Unable to load payment for refund", paymentError);
    return NextResponse.json({ error: "Impossible de vérifier ce paiement." }, { status: 503 });
  }
  if (!payment) return NextResponse.json({ error: "Paiement introuvable." }, { status: 404 });
  if (payment.provider !== "stripe" || !payment.provider_payment_intent_id) {
    return NextResponse.json({ error: "Ce paiement ne peut pas être remboursé depuis Stripe." }, { status: 409 });
  }
  const { data: existingAction, error: actionLookupError } = await admin
    .from("admin_refund_actions").select("*").eq("id", body.requestId).maybeSingle();
  if (actionLookupError) {
    console.error("Unable to check idempotent refund request", actionLookupError);
    return NextResponse.json({ error: "Impossible de vérifier la demande de remboursement." }, { status: 503 });
  }
  let action = existingAction;
  if (action && (action.payment_id !== payment.id || action.requested_by !== user.id || action.reason !== body.reason)) {
    return NextResponse.json({ error: "Cet identifiant de remboursement est déjà utilisé." }, { status: 409 });
  }
  if (action?.status === "failed") {
    return NextResponse.json({ error: "Stripe a refusé cette demande. Vérifiez la situation avant d’en créer une nouvelle." }, { status: 409 });
  }
  if (payment.status !== "succeeded" && !(action?.status === "succeeded" && action.stripe_refund_id)) {
    return NextResponse.json({ error: "Seuls les paiements encaissés et non remboursés peuvent être remboursés." }, { status: 409 });
  }
  if (!action) {
    const { data, error } = await admin.from("admin_refund_actions").insert({
      id: body.requestId,
      payment_id: payment.id,
      requested_by: user.id,
      reason: body.reason,
      status: "pending",
    }).select("*").single();
    if (error) {
      console.error("Unable to record refund request", error);
      return NextResponse.json({ error: "Impossible d’enregistrer la demande de remboursement." }, { status: 503 });
    }
    action = data;
  }

  const stripe = new Stripe(stripeKey);
  try {
    const refund = action.status === "succeeded" && action.stripe_refund_id
      ? await stripe.refunds.retrieve(action.stripe_refund_id)
      : await stripe.refunds.create({
        payment_intent: payment.provider_payment_intent_id,
        reason: body.reason as typeof refundReasons[number],
        metadata: { mara_refund_request_id: body.requestId, payment_id: payment.id },
      }, { idempotencyKey: `mara-admin-refund-${body.requestId}` });

    const refundStatus = refund.status === "succeeded" ? "succeeded" : refund.status === "failed" || refund.status === "canceled"
      ? "failed"
      : "pending";
    const { error: actionUpdateError } = await admin.from("admin_refund_actions").update({
      status: refundStatus,
      stripe_refund_id: refund.id,
      updated_at: new Date().toISOString(),
    }).eq("id", body.requestId);
    if (actionUpdateError) throw new Error("Le remboursement est fait dans Stripe, mais son suivi local n’a pas été mis à jour.");

    if (refundStatus === "pending") {
      return NextResponse.json({ refunded: false, pending: true, refundId: refund.id }, { status: 202 });
    }
    if (refundStatus === "failed") {
      return NextResponse.json({ error: "Stripe n’a pas pu effectuer le remboursement. Vérifiez l’état avant toute nouvelle demande." }, { status: 502 });
    }
    if (!refund.charge) throw new Error("Stripe n’a pas renvoyé le paiement associé au remboursement.");
    const charge = await stripe.charges.retrieve(
      typeof refund.charge === "string" ? refund.charge : refund.charge.id,
    );
    await reconcileStripeRefund(stripe, admin, charge);
    return NextResponse.json({ refunded: true, refundId: refund.id });
  } catch (error) {
    console.error("Stripe refund processing failed", error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Stripe n’a pas pu effectuer le remboursement.",
      retryWithSameRequestId: true,
    }, { status: 502 });
  }
}
