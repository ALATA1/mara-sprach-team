import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const maxLengths = { type: 80, subject: 200, description: 3000 };

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
