import { NextResponse } from "next/server";
import Stripe from "stripe";
export async function POST() {
  const key = process.env.STRIPE_SECRET_KEY,
    price = process.env.STRIPE_PRICE_ID,
    site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  if (!key || !price) return NextResponse.json({ demo: true });
  const stripe = new Stripe(key);
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ price, quantity: 1 }],
    success_url: `${site}/?payment=success`,
    cancel_url: `${site}/?payment=cancelled`,
    metadata: { product: "ensemble-access" },
  });
  return NextResponse.json({ url: session.url });
}
