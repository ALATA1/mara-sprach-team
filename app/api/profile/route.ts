import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AVATAR_BUCKET = "profile-avatars";
const MAX_AVATAR_SIZE = 5 * 1024 * 1024;
const MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const LANGUAGE_CODES = ["fr", "de", "en"];
const GERMAN_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

const isValidDateOnly = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value &&
    parsed.getTime() <= Date.now();
};

const hasExpectedImageSignature = async (file: File) => {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (file.type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (file.type === "image/png") {
    return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e &&
      bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a &&
      bytes[6] === 0x1a && bytes[7] === 0x0a;
  }
  if (file.type === "image/webp") {
    return String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  }
  return false;
};

const getUserContext = async () => {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { response: NextResponse.json({ error: "Supabase Auth n’est pas configuré." }, { status: 503 }) };

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return { response: NextResponse.json({ error: "Connectez-vous pour gérer votre profil." }, { status: 401 }) };
  }

  const admin = createSupabaseAdminClient();
  if (!admin) return { response: NextResponse.json({ error: "Le service Supabase côté serveur n’est pas configuré." }, { status: 503 }) };
  return { user, admin, supabase };
};

export async function GET() {
  const context = await getUserContext();
  if ("response" in context) return context.response;

  const { data: profile, error } = await context.admin.from("profiles")
    .select("first_name, last_name, phone, country, city, birth_date, preferred_language, german_level, avatar_path")
    .eq("id", context.user.id)
    .maybeSingle();
  if (error) {
    console.error("Unable to load profile", error);
    return NextResponse.json({ error: "Impossible de charger votre profil." }, { status: 503 });
  }
  if (!profile) return NextResponse.json({ error: "Profil introuvable." }, { status: 404 });

  let avatarUrl: string | null = null;
  if (profile.avatar_path) {
    const { data, error: signingError } = await context.admin.storage.from(AVATAR_BUCKET)
      .createSignedUrl(profile.avatar_path, 900);
    if (signingError || !data) {
      console.error("Unable to sign profile avatar URL", signingError);
      return NextResponse.json({ error: "Impossible de préparer la photo de profil." }, { status: 503 });
    }
    avatarUrl = data.signedUrl;
  }

  return NextResponse.json({ profile: { ...profile, avatar_url: avatarUrl, email: context.user.email ?? "" } });
}

export async function PATCH(request: Request) {
  const context = await getUserContext();
  if ("response" in context) return context.response;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "La requête reçue est invalide." }, { status: 400 });
  }

  const readText = (key: string, maxLength: number): string | null | undefined => {
    const value = body[key];
    if (value === undefined) return undefined;
    if (value === null || value === "") return null;
    if (typeof value !== "string" || value.trim().length > maxLength) return undefined;
    return value.trim();
  };

  const firstName = readText("first_name", 100);
  const lastName = readText("last_name", 100);
  const phone = readText("phone", 40);
  const country = readText("country", 100);
  const city = readText("city", 100);
  const birthDate = readText("birth_date", 10);
  const language = readText("preferred_language", 2);
  const germanLevel = readText("german_level", 2);
  const email = readText("email", 320);

  if ([firstName, lastName, phone, country, city, birthDate, language, germanLevel, email].some((value) => value === undefined) ||
    !firstName?.trim() || !lastName?.trim() ||
    (language === null) || (language !== undefined && !LANGUAGE_CODES.includes(language)) ||
    (germanLevel !== null && germanLevel !== undefined && !GERMAN_LEVELS.includes(germanLevel)) ||
    (birthDate !== null && birthDate !== undefined && !isValidDateOnly(birthDate)) ||
    (email !== null && email !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    return NextResponse.json({ error: "Vérifiez les informations saisies." }, { status: 400 });
  }

  let emailChangePending = false;
  if (email && email.toLowerCase() !== (context.user.email ?? "").toLowerCase()) {
    const { error: emailError } = await context.supabase.auth.updateUser({ email });
    if (emailError) {
      return NextResponse.json({ error: "Supabase n’a pas pu modifier l’adresse e-mail. Vérifiez-la puis réessayez." }, { status: 400 });
    }
    emailChangePending = true;
  }

  const update = Object.fromEntries([
    ["first_name", firstName],
    ["last_name", lastName],
    ["phone", phone],
    ["country", country],
    ["city", city],
    ["birth_date", birthDate],
    ["preferred_language", language],
    ["german_level", germanLevel],
  ].filter(([, value]) => value !== undefined));

  const { data: profile, error } = await context.admin.from("profiles")
    .update(update).eq("id", context.user.id)
    .select("first_name, last_name, phone, country, city, birth_date, preferred_language, german_level, avatar_path")
    .single();
  if (error) {
    console.error("Unable to update profile", error);
    return NextResponse.json({
      error: emailChangePending
        ? "L’adresse e-mail a été soumise à confirmation, mais le reste du profil n’a pas été enregistré."
        : "Impossible d’enregistrer votre profil.",
    }, { status: 503 });
  }

  return NextResponse.json({ profile, emailChangePending });
}

export async function POST(request: Request) {
  const context = await getUserContext();
  if ("response" in context) return context.response;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Le fichier envoyé est invalide." }, { status: 400 });
  }
  const file = form.get("avatar");
  if (!(file instanceof File) || file.size < 1 || file.size > MAX_AVATAR_SIZE ||
    !MIME_EXTENSIONS[file.type] || !(await hasExpectedImageSignature(file))) {
    return NextResponse.json({ error: "Choisissez une image JPEG, PNG ou WebP de 5 Mo maximum." }, { status: 400 });
  }

  const { data: current, error: readError } = await context.admin.from("profiles")
    .select("avatar_path").eq("id", context.user.id).single();
  if (readError) {
    console.error("Unable to read current profile avatar", readError);
    return NextResponse.json({ error: "Impossible de charger votre profil." }, { status: 503 });
  }

  const path = `${context.user.id}/${randomUUID()}.${MIME_EXTENSIONS[file.type]}`;
  const { error: uploadError } = await context.admin.storage.from(AVATAR_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) {
    console.error("Unable to upload profile avatar", uploadError);
    return NextResponse.json({ error: "Impossible d’enregistrer cette photo." }, { status: 503 });
  }

  const { error: updateError } = await context.admin.from("profiles")
    .update({ avatar_path: path }).eq("id", context.user.id);
  if (updateError) {
    await context.admin.storage.from(AVATAR_BUCKET).remove([path]);
    console.error("Unable to save profile avatar path", updateError);
    return NextResponse.json({ error: "La photo a été téléversée mais le profil n’a pas pu être mis à jour." }, { status: 503 });
  }

  if (current.avatar_path) {
    const { error: removeError } = await context.admin.storage.from(AVATAR_BUCKET).remove([current.avatar_path]);
    if (removeError) console.error("Unable to remove replaced profile avatar", removeError);
  }
  const { data: signed, error: signingError } = await context.admin.storage.from(AVATAR_BUCKET).createSignedUrl(path, 900);
  if (signingError || !signed) {
    console.error("Unable to sign uploaded profile avatar", signingError);
    return NextResponse.json({ error: "Photo enregistrée, mais impossible de l’afficher immédiatement." }, { status: 503 });
  }

  return NextResponse.json({ avatar_url: signed.signedUrl });
}

export async function DELETE() {
  const context = await getUserContext();
  if ("response" in context) return context.response;

  const { data: profile, error: readError } = await context.admin.from("profiles")
    .select("avatar_path").eq("id", context.user.id).single();
  if (readError) {
    console.error("Unable to read profile avatar for deletion", readError);
    return NextResponse.json({ error: "Impossible de charger votre profil." }, { status: 503 });
  }
  if (!profile.avatar_path) return NextResponse.json({ avatar_url: null });

  const { error: removeError } = await context.admin.storage.from(AVATAR_BUCKET).remove([profile.avatar_path]);
  if (removeError) {
    console.error("Unable to remove profile avatar", removeError);
    return NextResponse.json({ error: "Impossible de supprimer la photo de profil." }, { status: 503 });
  }
  const { error: updateError } = await context.admin.from("profiles")
    .update({ avatar_path: null }).eq("id", context.user.id);
  if (updateError) {
    console.error("Unable to clear removed profile avatar path", updateError);
    return NextResponse.json({ error: "La photo est supprimée, mais le profil n’a pas pu être actualisé." }, { status: 503 });
  }

  return NextResponse.json({ avatar_url: null });
}
