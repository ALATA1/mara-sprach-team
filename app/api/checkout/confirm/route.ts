import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { reconcileStripeCheckoutSession } from "@/lib/payments/stripe";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const sessionId = requestUrl.searchParams.get("session_id");
  const supabase = await createServerSupabaseClient();
  const admin = createSupabaseAdminClient();
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const redirect = (status: "confirmed" | "pending" | "refunded" | "error") =>
    NextResponse.redirect(new URL(`/?payment=${status}`, requestUrl.origin));

  if (!sessionId || !supabase || !admin || !stripeKey) return redirect("error");

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return redirect("error");

  try {
    const stripe = new Stripe(stripeKey);
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const sessionUserId = session.metadata?.user_id ?? session.client_reference_id;
    if (sessionUserId !== user.id) return redirect("error");

    const status = await reconcileStripeCheckoutSession(stripe, admin, session);
    if (status === "succeeded") return redirect("confirmed");
    if (status === "processing") return redirect("pending");
    if (status === "refunded") return redirect("refunded");
    return redirect("error");
  } catch (error) {
    console.error("Stripe Checkout confirmation failed", error);
    return redirect("error");
  }
}
