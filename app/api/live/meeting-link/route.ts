import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const isTeamsMeetingUrl = (value: unknown): value is string => {
  if (typeof value !== "string" || value.length > 2048) return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      (url.hostname === "teams.microsoft.com" || url.hostname === "teams.live.com") &&
      url.pathname.length > 1
    );
  } catch {
    return false;
  }
};

const isUuid = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "La connexion Supabase n’est pas configurée." }, { status: 503 });
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Connectez-vous avec un compte formateur pour enregistrer ce lien." }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError || !profile) {
    return NextResponse.json({ error: "Impossible de vérifier le rôle de ce compte." }, { status: 503 });
  }
  if (profile.role !== "teacher" && profile.role !== "admin") {
    return NextResponse.json({ error: "Seuls les formateurs peuvent modifier le lien d’une séance." }, { status: 403 });
  }

  let body: { sessionId?: unknown; meetingUrl?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "La requête reçue est invalide." }, { status: 400 });
  }
  if (!isUuid(body.sessionId)) {
    return NextResponse.json({ error: "Cette séance n’est pas enregistrée dans Supabase." }, { status: 400 });
  }
  if (!isTeamsMeetingUrl(body.meetingUrl)) {
    return NextResponse.json({ error: "Collez un lien de réunion Microsoft Teams valide en HTTPS." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "La clé serveur Supabase n’est pas configurée." }, { status: 503 });
  }

  const { data: session, error: updateError } = await admin
    .from("live_sessions")
    .update({ meeting_url: body.meetingUrl })
    .eq("id", body.sessionId)
    .select("id, title, meeting_url")
    .maybeSingle();

  if (updateError) {
    return NextResponse.json({ error: "Supabase n’a pas pu enregistrer le lien Teams." }, { status: 503 });
  }
  if (!session) {
    return NextResponse.json({ error: "Séance introuvable dans Supabase. Actualisez le calendrier." }, { status: 404 });
  }

  return NextResponse.json({ session });
}
