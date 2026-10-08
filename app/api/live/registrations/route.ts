import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const isUuid = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase Auth n’est pas configuré." }, { status: 503 });
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Connectez-vous pour gérer vos inscriptions LIVE." }, { status: 401 });
  }

  let body: { sessionId?: unknown; action?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "La requête reçue est invalide." }, { status: 400 });
  }

  if (!isUuid(body.sessionId) || (body.action !== "register" && body.action !== "cancel")) {
    return NextResponse.json({ error: "Choisissez une séance et une action valides." }, { status: 400 });
  }

  const { error } = await supabase.rpc(
    body.action === "register" ? "register_for_live_session" : "cancel_live_session_registration",
    { p_session_id: body.sessionId },
  );
  if (error) {
    if (error.code === "42501") {
      return NextResponse.json({ error: "Un abonnement de cours actif est nécessaire pour s’inscrire." }, { status: 403 });
    }
    if (error.code === "23514") {
      return NextResponse.json({ error: "Cette séance est complète." }, { status: 409 });
    }
    if (error.code === "P0002") {
      return NextResponse.json({ error: "Cette séance n’existe plus." }, { status: 404 });
    }
    if (error.code === "22023") {
      return NextResponse.json({ error: "Les inscriptions sont fermées pour cette séance." }, { status: 409 });
    }
    console.error("Unable to update LIVE registration", error);
    return NextResponse.json({ error: "Impossible de mettre à jour votre inscription LIVE." }, { status: 503 });
  }

  return NextResponse.json({ registered: body.action === "register" });
}
