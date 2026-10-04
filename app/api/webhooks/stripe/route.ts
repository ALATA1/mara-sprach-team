import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

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
  try {
    const event = stripe.webhooks.constructEvent(body, signature, secret);
    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded"
    ) {
      const session = event.data.object;
      const userId = session.metadata?.user_id ?? session.client_reference_id;
      if (session.mode !== "payment" || !userId) {
        return NextResponse.json({ error: "Type de session ou identité client invalide" }, { status: 400 });
      }
      if (session.payment_status !== "paid") return NextResponse.json({ received: true });

      const { error } = await supabase.from("memberships").upsert({
        user_id: userId,
        status: "active",
        amount_cents: session.amount_total ?? 1000,
        activated_at: new Date().toISOString(),
        stripe_session_id: session.id,
      }, { onConflict: "user_id" });

      if (error) return NextResponse.json({ error: "Impossible d’activer l’adhésion" }, { status: 500 });
    }
    return NextResponse.json({ received: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Webhook invalide" },
      { status: 400 },
    );
  }
}
