import { randomUUID, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BUCKET = "course-documents";
const MAX_FILE_SIZE = 15 * 1024 * 1024;
const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  txt: "text/plain",
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  wav: "audio/wav",
  ogg: "audio/ogg",
  mp4: "video/mp4",
  webm: "video/webm",
};

type CourseDocumentRow = {
  id: string;
  course_key: string;
  title: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  storage_path: string;
  created_at: string;
};

const getStorageClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
};

const toPublicDocument = (client: NonNullable<ReturnType<typeof getStorageClient>>, row: CourseDocumentRow) => {
  const publicUrl = new URL(client.storage.from(BUCKET).getPublicUrl(row.storage_path).data.publicUrl);
  publicUrl.searchParams.set("download", row.file_name);

  return {
    id: row.id,
    course_key: row.course_key,
    title: row.title,
    file_name: row.file_name,
    mime_type: row.mime_type,
    size_bytes: Number(row.size_bytes),
    public_url: publicUrl.toString(),
    created_at: row.created_at,
  };
};

export async function GET() {
  const requiredVariables = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "COURSE_DOCUMENTS_ADMIN_TOKEN",
  ];
  const missingVariables = requiredVariables.filter((name) => !process.env[name]?.trim());
  if (missingVariables.length) {
    return NextResponse.json({
      configured: false,
      stage: "environment",
      missingVariables,
      message: "Des variables d’environnement requises sont absentes du serveur.",
      documents: [],
    });
  }

  const client = getStorageClient();
  if (!client) {
    return NextResponse.json({
      configured: false,
      stage: "environment",
      missingVariables: ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
      message: "Le client serveur Supabase n’a pas pu être initialisé.",
      documents: [],
    });
  }

  const { data, error } = await client
    .from("course_documents")
    .select("id, course_key, title, file_name, mime_type, size_bytes, storage_path, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    const migrationMissing = error.code === "42P01" || error.code === "PGRST205";
    return NextResponse.json({
      configured: false,
      stage: migrationMissing ? "migration" : "database",
      migrationApplied: !migrationMissing,
      message: migrationMissing
        ? "La table course_documents est absente. Exécutez la migration 002_course_documents.sql dans Supabase."
        : "Supabase ne permet pas de lire la bibliothèque. Vérifiez le projet et les droits de la clé serveur.",
      documents: [],
    });
  }

  const { data: bucket, error: bucketError } = await client.storage.getBucket(BUCKET);
  if (bucketError || !bucket) {
    return NextResponse.json({
      configured: false,
      stage: "migration",
      migrationApplied: true,
      bucketReady: false,
      message: "La table documentaire existe, mais le bucket course-documents est absent. Réexécutez la migration 002_course_documents.sql dans Supabase.",
      documents: [],
    });
  }

  return NextResponse.json({
    configured: true,
    stage: "ready",
    migrationApplied: true,
    bucketReady: true,
    message: "La bibliothèque de documents est configurée.",
    documents: (data as CourseDocumentRow[]).map((row) => toPublicDocument(client, row)),
  });
}

export async function POST(request: Request) {
  const expectedToken = process.env.COURSE_DOCUMENTS_ADMIN_TOKEN;
  const suppliedToken = request.headers.get("x-course-documents-token") ?? "";
  if (!expectedToken) {
    return NextResponse.json({ error: "Le dépôt administrateur n’est pas configuré sur le serveur." }, { status: 503 });
  }

  const suppliedBuffer = Buffer.from(suppliedToken);
  const expectedBuffer = Buffer.from(expectedToken);
  if (suppliedBuffer.length !== expectedBuffer.length || !timingSafeEqual(suppliedBuffer, expectedBuffer)) {
    return NextResponse.json({ error: "Code administrateur incorrect." }, { status: 401 });
  }

  const client = getStorageClient();
  if (!client) return NextResponse.json({ error: "Le stockage Supabase n’est pas configuré." }, { status: 503 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requête de dépôt invalide." }, { status: 400 });
  }

  const action = String(body.action ?? "");
  const courseKey = String(body.courseKey ?? "").trim();
  const title = String(body.title ?? "").trim();
  const fileName = String(body.fileName ?? "").trim();
  const sizeBytes = Number(body.sizeBytes);
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  const mimeType = MIME_BY_EXTENSION[extension];
  if (!/^[a-zA-Z0-9_-]{1,60}$/.test(courseKey) || !title || title.length > 120 || !mimeType) {
    return NextResponse.json({ error: "Le cours, le titre ou le fichier fourni est invalide." }, { status: 400 });
  }
  if (!Number.isSafeInteger(sizeBytes) || sizeBytes <= 0 || sizeBytes > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "Le fichier doit peser entre 1 octet et 15 Mo." }, { status: 400 });
  }

  const safeFileName = fileName
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(-120) || `document.${extension}`;

  if (action === "begin") {
    const storagePath = `${courseKey}/${randomUUID()}-${safeFileName}`;
    const { data, error } = await client.storage.from(BUCKET).createSignedUploadUrl(storagePath, { upsert: false });
    if (error || !data) {
      return NextResponse.json({ error: "Supabase n’a pas pu préparer le dépôt du fichier." }, { status: 502 });
    }

    return NextResponse.json({ uploadToken: data.token, storagePath, mimeType });
  }

  const storagePath = String(body.storagePath ?? "");
  const pathRemainder = storagePath.startsWith(`${courseKey}/`) ? storagePath.slice(courseKey.length + 1) : "";
  const filePathPattern = /^[0-9a-f-]{36}-.+$/i;
  if (action !== "complete" || !filePathPattern.test(pathRemainder) || !pathRemainder.endsWith(`-${safeFileName}`) || body.mimeType !== mimeType) {
    return NextResponse.json({ error: "Les informations du dépôt ne correspondent pas au fichier annoncé." }, { status: 400 });
  }

  const { data: storedFile, error: infoError } = await client.storage.from(BUCKET).info(storagePath);
  if (infoError || !storedFile || Number(storedFile.size) !== sizeBytes) {
    return NextResponse.json({ error: "Le fichier envoyé est introuvable ou sa taille ne correspond pas." }, { status: 409 });
  }

  const { data, error: insertError } = await client
    .from("course_documents")
    .insert({
      course_key: courseKey,
      title,
      file_name: fileName.slice(0, 255),
      mime_type: mimeType,
      size_bytes: sizeBytes,
      storage_path: storagePath,
    })
    .select("id, course_key, title, file_name, mime_type, size_bytes, storage_path, created_at")
    .single();

  if (insertError || !data) {
    await client.storage.from(BUCKET).remove([storagePath]);
    return NextResponse.json({ error: "Le fichier a été transféré, mais son entrée documentaire n’a pas pu être créée." }, { status: 502 });
  }

  return NextResponse.json({ document: toPublicDocument(client, data as CourseDocumentRow) }, { status: 201 });
}
