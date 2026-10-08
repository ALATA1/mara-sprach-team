import { NextResponse } from "next/server";
import Stripe from "stripe";
import { authorizeStaff } from "@/lib/auth/staff";

const isUuid = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

export async function POST(request: Request) {
  const authorization = await authorizeStaff(["admin"]);
  if (authorization.response) return authorization.response;
  const { user, admin } = authorization.context;

  let body: { userId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "La requête reçue est invalide." }, { status: 400 });
  }
  if (!isUuid(body.userId)) {
    return NextResponse.json({ error: "Sélectionnez un compte valide." }, { status: 400 });
  }
  const key = process.env.STRIPE_SECRET_KEY;
  const configurationId = process.env.STRIPE_BILLING_PORTAL_CONFIGURATION_ID;
  if (!key || !configurationId) {
    return NextResponse.json({ error: "Le portail de facturation Stripe n’est pas configuré." }, { status: 503 });
  }

  const { data: subscription, error } = await admin.from("course_subscriptions")
    .select("provider_customer_id")
    .eq("user_id", body.userId)
    .eq("provider", "stripe")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("Unable to load Stripe customer for admin support", error);
    return NextResponse.json({ error: "Impossible de retrouver le compte de facturation." }, { status: 503 });
  }
  if (!subscription) return NextResponse.json({ error: "Ce compte n’a pas de client Stripe." }, { status: 404 });

  const site = (process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin).replace(/\/$/, "");
  try {
    const stripe = new Stripe(key);
    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.provider_customer_id,
      configuration: configurationId,
      return_url: `${site}/staff/admin`,
    });
    const { error: auditError } = await admin.from("staff_audit_log").insert({
      actor_id: user.id,
      action: "billing.portal.opened",
      target_type: "account",
      target_id: body.userId,
    });
    if (auditError) {
      console.error("Unable to audit admin billing portal access", auditError);
      return NextResponse.json({ error: "L’accès Stripe a été créé mais n’a pas pu être journalisé." }, { status: 503 });
    }
    return NextResponse.json({ url: session.url });
  } catch (stripeError) {
    console.error("Unable to create admin Stripe billing portal session", stripeError);
    return NextResponse.json({ error: "Impossible d’ouvrir le portail de facturation Stripe." }, { status: 502 });
  }
}
