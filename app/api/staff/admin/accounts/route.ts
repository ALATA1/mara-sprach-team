import { NextResponse } from "next/server";
import { authorizeStaff } from "@/lib/auth/staff";

const roles = ["beneficiary", "teacher", "volunteer", "admin"] as const;

export async function GET(request: Request) {
  const authorization = await authorizeStaff(["admin"]);
  if (authorization.response) return authorization.response;
  const { admin } = authorization.context;

  const url = new URL(request.url);
  const page = Math.max(1, Math.min(1000, Number(url.searchParams.get("page")) || 1));
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 50 });
  if (error) {
    console.error("Unable to list admin-managed accounts", error);
    return NextResponse.json({ error: "Impossible de charger les comptes." }, { status: 503 });
  }
  const ids = data.users.map((account) => account.id);
  const { data: profiles, error: profileError } = ids.length
    ? await admin.from("profiles")
      .select("id, first_name, last_name, role, created_at")
      .in("id", ids)
    : { data: [], error: null };
  const { data: memberships, error: membershipError } = ids.length
    ? await admin.from("memberships").select("user_id, status").in("user_id", ids)
    : { data: [], error: null };
  const { data: subscriptions, error: subscriptionError } = ids.length
    ? await admin.from("course_subscriptions")
      .select("user_id, plan_id, status, current_period_end")
      .in("user_id", ids)
      .order("created_at", { ascending: false })
    : { data: [], error: null };
  if (profileError || membershipError || subscriptionError) {
    console.error("Unable to load account administration details", profileError ?? membershipError ?? subscriptionError);
    return NextResponse.json({ error: "Impossible de charger les informations des comptes." }, { status: 503 });
  }

  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const membershipById = new Map((memberships ?? []).map((membership) => [membership.user_id, membership.status]));
  const subscriptionById = new Map<string, { plan_id: string; status: string; current_period_end: string | null }>();
  for (const subscription of subscriptions ?? []) {
    if (!subscriptionById.has(subscription.user_id)) subscriptionById.set(subscription.user_id, subscription);
  }

  return NextResponse.json({
    page,
    hasMore: data.nextPage !== null,
    accounts: data.users.map((account) => {
      const profile = profileById.get(account.id);
      return {
        id: account.id,
        email: account.email ?? "",
        firstName: profile?.first_name ?? "",
        lastName: profile?.last_name ?? "",
        role: profile?.role ?? "beneficiary",
        createdAt: account.created_at,
        emailConfirmed: Boolean(account.email_confirmed_at),
        membershipStatus: membershipById.get(account.id) ?? "unknown",
        subscription: subscriptionById.get(account.id) ?? null,
      };
    }),
  });
}

export async function PATCH(request: Request) {
  const authorization = await authorizeStaff(["admin"]);
  if (authorization.response) return authorization.response;
  const { user, admin } = authorization.context;

  let body: { userId?: unknown; role?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "La requête reçue est invalide." }, { status: 400 });
  }
  if (typeof body.userId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.userId) ||
    typeof body.role !== "string" || !roles.includes(body.role as typeof roles[number])) {
    return NextResponse.json({ error: "Sélectionnez un compte et un rôle valides." }, { status: 400 });
  }

  const { error } = await admin.rpc("admin_set_profile_role", {
    p_actor_id: user.id,
    p_target_id: body.userId,
    p_new_role: body.role,
  });
  if (error) {
    if (error.code === "42501") {
      return NextResponse.json({ error: "Seuls les administrateurs peuvent gérer les rôles." }, { status: 403 });
    }
    if (error.code === "P0002") return NextResponse.json({ error: "Compte introuvable." }, { status: 404 });
    if (error.code === "23514") {
      return NextResponse.json({ error: "Impossible de retirer le dernier rôle administrateur." }, { status: 409 });
    }
    console.error("Unable to change account role", error);
    return NextResponse.json({ error: "Impossible de modifier le rôle du compte." }, { status: 503 });
  }
  return NextResponse.json({ updated: true });
}
