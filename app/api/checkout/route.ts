import { NextResponse } from "next/server";
import Stripe from "stripe";
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

  const key = process.env.STRIPE_SECRET_KEY;
  const price = process.env.STRIPE_PRICE_ID;
  if (!key || !price) {
    return NextResponse.json({ error: "Le paiement Stripe n’est pas configuré sur le serveur." }, { status: 503 });
  }

  const site = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  try {
    const stripe = new Stripe(key);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price, quantity: 1 }],
      client_reference_id: user.id,
      customer_email: user.email,
      success_url: `${site}/api/checkout/confirm?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${site}/?payment=cancelled`,
      metadata: { product: "ensemble-access", user_id: user.id },
    });

    return NextResponse.json({ url: session.url });
  } catch {
    return NextResponse.json({ error: "Stripe n’a pas pu créer la session de paiement." }, { status: 502 });
  }
}
