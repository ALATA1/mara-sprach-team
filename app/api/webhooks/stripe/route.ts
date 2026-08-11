import { NextResponse } from "next/server";
import Stripe from "stripe";
export async function POST(req: Request) {
  const key = process.env.STRIPE_SECRET_KEY,
    secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!key || !secret) return NextResponse.json({ error: "Stripe non configuré" }, { status: 503 });
  const stripe = new Stripe(key);
  const body = await req.text(),
    signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Signature absente" }, { status: 400 });
  try {
    const event = stripe.webhooks.constructEvent(body, signature, secret);
    if (event.type === "checkout.session.completed") {
      /* TODO production: activer memberships via Supabase service role. */
    }
    return NextResponse.json({ received: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Webhook invalide" },
      { status: 400 },
    );
  }
}
