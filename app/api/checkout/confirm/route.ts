import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const sessionId = requestUrl.searchParams.get("session_id");
  const supabase = await createServerSupabaseClient();
  const admin = createSupabaseAdminClient();
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const redirect = (status: "confirmed" | "error") =>
    NextResponse.redirect(new URL(`/?payment=${status}`, requestUrl.origin));

  if (!sessionId || !supabase || !admin || !stripeKey) return redirect("error");

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return redirect("error");

  try {
    const stripe = new Stripe(stripeKey);
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const sessionUserId = session.metadata?.user_id ?? session.client_reference_id;
    if (sessionUserId !== user.id || session.mode !== "payment" || session.payment_status !== "paid") {
      return redirect("error");
    }

    const { error } = await admin.from("memberships").upsert({
      user_id: user.id,
      status: "active",
      amount_cents: session.amount_total ?? 1000,
      activated_at: new Date().toISOString(),
      stripe_session_id: session.id,
    }, { onConflict: "user_id" });

    return redirect(error ? "error" : "confirmed");
  } catch {
    return redirect("error");
  }
}
