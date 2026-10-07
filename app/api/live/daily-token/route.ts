import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const getRoomName = (value: string | null, domain: string) => {
  if (!value) return null;
  try {
    const url = new URL(value);
    const segments = url.pathname.split("/").filter(Boolean);
    if (
      url.protocol !== "https:" ||
      url.hostname.toLowerCase() !== domain ||
      url.port ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      segments.length !== 1 ||
      !/^[a-zA-Z0-9_-]+$/.test(segments[0])
    ) {
      return null;
    }
    return segments[0];
  } catch {
    return null;
  }
};

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "L’authentification n’est pas configurée." }, { status: 503 });
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Connectez-vous pour rejoindre cette session." }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "La demande de salle est invalide." }, { status: 400 });
  }
  if (
    typeof payload !== "object" ||
    payload === null ||
    !("roomName" in payload) ||
    typeof payload.roomName !== "string" ||
    !/^[a-zA-Z0-9_-]+$/.test(payload.roomName)
  ) {
    return NextResponse.json({ error: "La demande de salle est invalide." }, { status: 400 });
  }

  const apiKey = process.env.DAILY_API_KEY;
  const domain = process.env.DAILY_DOMAIN?.trim().toLowerCase();
  if (!apiKey || !domain || !/^[a-z0-9-]+\.daily\.co$/.test(domain)) {
    return NextResponse.json({ error: "Le service vidéo Daily n’est pas encore configuré." }, { status: 503 });
  }

  const { data: sessions, error: sessionsError } = await supabase
    .from("live_sessions")
    .select("meeting_url");
  if (sessionsError) {
    return NextResponse.json({ error: "Impossible de vérifier cette session LIVE." }, { status: 503 });
  }
  const roomIsScheduled = (sessions ?? []).some(
    (session) => getRoomName(session.meeting_url, domain) === payload.roomName,
  );
  if (!roomIsScheduled) {
    return NextResponse.json({ error: "Cette salle n’est associée à aucune session LIVE." }, { status: 404 });
  }

  try {
    const roomResponse = await fetch(
      `https://api.daily.co/v1/rooms/${encodeURIComponent(payload.roomName)}`,
      {
        headers: { Authorization: `Bearer ${apiKey}` },
        cache: "no-store",
      },
    );
    if (roomResponse.status === 404) {
      return NextResponse.json({ error: "Cette salle Daily n’existe pas." }, { status: 404 });
    }
    if (!roomResponse.ok) {
      console.error("Daily room API returned status:", roomResponse.status);
      return NextResponse.json({ error: "Impossible de vérifier la configuration de la salle Daily." }, { status: 502 });
    }

    const room: unknown = await roomResponse.json();
    if (
      typeof room !== "object" ||
      room === null ||
      !("privacy" in room) ||
      room.privacy !== "private"
    ) {
      return NextResponse.json({ error: "Cette salle doit être configurée en privé dans Daily." }, { status: 409 });
    }
  } catch (error) {
    console.error("Daily room verification failed:", error);
    return NextResponse.json({ error: "Impossible de contacter le service vidéo Daily." }, { status: 502 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("first_name, last_name, role")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError) {
    return NextResponse.json({ error: "Impossible de vérifier votre profil." }, { status: 503 });
  }

  const displayName = [profile?.first_name, profile?.last_name]
    .filter((part): part is string => Boolean(part?.trim()))
    .join(" ") || user.email || "Participant";
  const isOwner = profile?.role === "teacher" || profile?.role === "admin";

  try {
    const response = await fetch("https://api.daily.co/v1/meeting-tokens", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        properties: {
          room_name: payload.roomName,
          user_name: displayName,
          user_id: user.id,
          is_owner: isOwner,
          exp: Math.floor(Date.now() / 1000) + 60 * 60 * 2,
        },
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      console.error("Daily token API returned status:", response.status);
      return NextResponse.json({ error: "Daily n’a pas pu préparer l’accès à cette salle." }, { status: 502 });
    }

    const result: unknown = await response.json();
    if (
      typeof result !== "object" ||
      result === null ||
      !("token" in result) ||
      typeof result.token !== "string"
    ) {
      console.error("Daily token API returned an invalid response.");
      return NextResponse.json({ error: "Daily a renvoyé une réponse invalide." }, { status: 502 });
    }

    return NextResponse.json({ token: result.token }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Daily token request failed:", error);
    return NextResponse.json({ error: "Impossible de contacter le service vidéo Daily." }, { status: 502 });
  }
}
