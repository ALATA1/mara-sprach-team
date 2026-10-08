import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { reconcileStripeCheckoutSession, reconcileStripeRefund } from "@/lib/payments/stripe";

export async function POST(req: Request) {
  const key = process.env.STRIPE_SECRET_KEY,
    secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!key || !secret) return NextResponse.json({ error: "Stripe non configuré" }, { status: 503 });
  const supabase = createSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ error: "Supabase serveur non configuré" }, { status: 503 });

  const stripe = new Stripe(key);
  const body = await req.text(),
    signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Signature absente" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Webhook invalide" },
      { status: 400 },
    );
  }

  try {
    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded" ||
      event.type === "checkout.session.async_payment_failed" ||
      event.type === "checkout.session.expired"
    ) {
      const session = event.data.object;
      const statusOverride = event.type === "checkout.session.async_payment_failed"
        ? "failed"
        : event.type === "checkout.session.expired" ? "canceled" : undefined;
      await reconcileStripeCheckoutSession(stripe, supabase, session, statusOverride);
    } else if (event.type === "charge.refunded") {
      await reconcileStripeRefund(stripe, supabase, event.data.object);
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook processing failed", error);
    return NextResponse.json({ error: "Impossible d’enregistrer l’événement de paiement." }, { status: 500 });
  }
}
