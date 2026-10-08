import { NextResponse } from "next/server";
import { authorizeStaff } from "@/lib/auth/staff";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const maxLengths = { type: 80, subject: 200, description: 3000 };
const requestStatuses = ["submitted", "assigned", "in_progress", "resolved", "closed"] as const;
const isUuid = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

export async function GET() {
  const authorization = await authorizeStaff(["volunteer", "admin"]);
  if (authorization.response) return authorization.response;

  const { user, role, admin } = authorization.context;
  let query = admin
    .from("support_requests")
    .select("id, user_id, type, subject, description, status, volunteer_id, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (role === "volunteer") {
    query = query.or(`volunteer_id.eq.${user.id},volunteer_id.is.null`);
  }

  const [{ data: requests, error }, volunteerResult] = await Promise.all([
    query,
    role === "admin"
      ? admin.from("profiles").select("id, first_name, last_name").eq("role", "volunteer").order("first_name")
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (error || volunteerResult.error) {
    console.error("Unable to load staff support requests", error ?? volunteerResult.error);
    return NextResponse.json({ error: "Impossible de charger les demandes d’accompagnement." }, { status: 503 });
  }

  const profileIds = [...new Set([
    ...(requests ?? []).map((request) => request.user_id),
    ...(requests ?? []).map((request) => request.volunteer_id).filter((id): id is string => Boolean(id)),
  ])];
  const { data: profiles, error: profileError } = profileIds.length
    ? await admin.from("profiles").select("id, first_name, last_name").in("id", profileIds)
    : { data: [], error: null };
  if (profileError) {
    console.error("Unable to load support request profiles", profileError);
    return NextResponse.json({ error: "Impossible de charger les profils associés aux demandes." }, { status: 503 });
  }

  const profileNames = new Map((profiles ?? []).map((profile) => [
    profile.id,
    [profile.first_name, profile.last_name].filter(Boolean).join(" "),
  ]));
  return NextResponse.json({
    role,
    currentUserId: user.id,
    requests: (requests ?? []).map((request) => ({
      ...request,
      requester_name: profileNames.get(request.user_id) ?? "",
      volunteer_name: request.volunteer_id ? profileNames.get(request.volunteer_id) ?? "" : "",
    })),
    volunteers: (volunteerResult.data ?? []).map((profile) => ({
      id: profile.id,
      name: [profile.first_name, profile.last_name].filter(Boolean).join(" ") || "Bénévole",
    })),
  });
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase Auth n’est pas configuré." }, { status: 503 });
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Connectez-vous pour envoyer une demande d’accompagnement." }, { status: 401 });
  }

  let body: { type?: unknown; subject?: unknown; description?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "La requête reçue est invalide." }, { status: 400 });
  }

  if (typeof body.type !== "string" || typeof body.subject !== "string" ||
    typeof body.description !== "string" || !body.type.trim() ||
    !body.subject.trim() || !body.description.trim() ||
    body.type.trim().length > maxLengths.type ||
    body.subject.trim().length > maxLengths.subject ||
    body.description.trim().length > maxLengths.description) {
    return NextResponse.json({ error: "Vérifiez les champs et leurs longueurs avant l’envoi." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("support_requests")
    .insert({
      user_id: user.id,
      type: body.type.trim(),
      subject: body.subject.trim(),
      description: body.description.trim(),
    })
    .select("id, type, subject, status, created_at")
    .single();

  if (error) {
    console.error("Unable to create support request", error);
    return NextResponse.json({ error: "Impossible d’enregistrer votre demande d’accompagnement." }, { status: 503 });
  }

  return NextResponse.json({ request: data }, { status: 201 });
}

export async function PATCH(request: Request) {
  const authorization = await authorizeStaff(["volunteer", "admin"]);
  if (authorization.response) return authorization.response;
  const { user, role, admin } = authorization.context;

  let body: { id?: unknown; status?: unknown; volunteerId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "La requête reçue est invalide." }, { status: 400 });
  }
  if (
    !isUuid(body.id) ||
    (body.status !== undefined && !requestStatuses.includes(body.status as typeof requestStatuses[number])) ||
    (body.volunteerId !== undefined && body.volunteerId !== null && !isUuid(body.volunteerId)) ||
    (body.status === undefined && body.volunteerId === undefined)
  ) {
    return NextResponse.json({ error: "La demande, son état ou son attribution est invalide." }, { status: 400 });
  }

  const { data: current, error: lookupError } = await admin
    .from("support_requests")
    .select("id, status, volunteer_id")
    .eq("id", body.id)
    .maybeSingle();
  if (lookupError) {
    console.error("Unable to look up support request", lookupError);
    return NextResponse.json({ error: "Impossible de vérifier cette demande." }, { status: 503 });
  }
  if (!current) return NextResponse.json({ error: "Demande introuvable." }, { status: 404 });

  if (role === "volunteer" && current.volunteer_id && current.volunteer_id !== user.id) {
    return NextResponse.json({ error: "Cette demande est attribuée à un autre bénévole." }, { status: 403 });
  }
  if (role === "volunteer" && body.volunteerId !== undefined && body.volunteerId !== user.id) {
    return NextResponse.json({ error: "Un bénévole ne peut pas réattribuer une demande." }, { status: 403 });
  }

  const volunteerId: string | null = role === "volunteer"
    ? user.id
    : body.volunteerId === undefined ? current.volunteer_id : body.volunteerId as string | null;
  let status = body.status === undefined ? current.status : body.status as typeof requestStatuses[number];

  if (role === "admin" && body.volunteerId !== undefined && volunteerId) {
    const { data: volunteer, error: volunteerError } = await admin
      .from("profiles")
      .select("id")
      .eq("id", volunteerId)
      .eq("role", "volunteer")
      .maybeSingle();
    if (volunteerError) {
      console.error("Unable to validate support volunteer", volunteerError);
      return NextResponse.json({ error: "Impossible de vérifier le bénévole choisi." }, { status: 503 });
    }
    if (!volunteer) return NextResponse.json({ error: "Le responsable choisi n’est pas un bénévole actif." }, { status: 400 });
  }

  if (role === "admin" && body.volunteerId !== undefined && volunteerId && status === "submitted") {
    status = "assigned";
  }
  if (role === "admin" && body.volunteerId === null && (status === "assigned" || status === "in_progress")) {
    status = "submitted";
  }
  if (!volunteerId && (status === "assigned" || status === "in_progress")) {
    return NextResponse.json({ error: "Attribuez un bénévole avant de placer la demande dans cet état." }, { status: 400 });
  }
  if (role === "volunteer" && !current.volunteer_id && body.status === undefined) {
    status = "assigned";
  }

  let update = admin
    .from("support_requests")
    .update({ status, volunteer_id: volunteerId })
    .eq("id", body.id);
  if (role === "volunteer") {
    update = current.volunteer_id
      ? update.eq("volunteer_id", user.id)
      : update.is("volunteer_id", null);
  }
  const { data, error } = await update
    .select("id, user_id, type, subject, description, status, volunteer_id, created_at")
    .maybeSingle();
  if (error) {
    console.error("Unable to update support request", error);
    return NextResponse.json({ error: "Impossible de mettre à jour la demande." }, { status: 503 });
  }
  if (!data) {
    return NextResponse.json({ error: "Cette demande a été prise en charge par une autre personne. Actualisez la liste." }, { status: 409 });
  }

  return NextResponse.json({ request: data });
}
