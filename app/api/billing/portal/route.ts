import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Supabase Auth n’est pas configuré." }, { status: 503 });

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Connectez-vous pour gérer vos factures." }, { status: 401 });

  const admin = createSupabaseAdminClient();
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const configuration = process.env.STRIPE_BILLING_PORTAL_CONFIGURATION_ID;
  if (!admin || !stripeKey || !configuration) {
    return NextResponse.json({ error: "Le portail de facturation n’est pas configuré sur le serveur." }, { status: 503 });
  }

  const { data: subscription, error } = await admin
    .from("course_subscriptions")
    .select("provider_customer_id")
    .eq("user_id", user.id)
    .eq("provider", "stripe")
    .not("provider_customer_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return NextResponse.json({ error: "Impossible de retrouver votre compte de facturation." }, { status: 503 });
  if (!subscription?.provider_customer_id) {
    return NextResponse.json({ error: "Aucun abonnement ou facture n’est associé à ce compte." }, { status: 404 });
  }

  try {
    const stripe = new Stripe(stripeKey);
    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.provider_customer_id,
      configuration,
      return_url: `${(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "")}/`,
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe billing portal session creation failed", error);
    return NextResponse.json({ error: "Impossible d’ouvrir le portail de facturation Stripe." }, { status: 502 });
  }
}
