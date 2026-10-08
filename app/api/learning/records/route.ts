import { NextResponse } from "next/server";
import { getCourseAccess } from "@/lib/payments/access";

export async function GET() {
  const access = await getCourseAccess();
  if (!access.allowed) return access.response;

  const { data, error } = await access.supabase.from("student_learning_records")
    .select("course_key, item_type, item_key, score_percentage, completed_at");
  if (error) {
    console.error("Unable to load student learning records", error);
    return NextResponse.json({ error: "Impossible de charger votre progression." }, { status: 503 });
  }
  return NextResponse.json({ records: data ?? [] });
}

export async function POST(request: Request) {
  const access = await getCourseAccess();
  if (!access.allowed) return access.response;

  let body: {
    courseKey?: unknown;
    itemType?: unknown;
    itemKey?: unknown;
    scorePercentage?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "La requête reçue est invalide." }, { status: 400 });
  }

  if (typeof body.courseKey !== "string" || body.courseKey.length < 1 || body.courseKey.length > 100 ||
    typeof body.itemKey !== "string" || body.itemKey.length < 1 || body.itemKey.length > 100 ||
    (body.itemType !== "lesson" && body.itemType !== "quiz")) {
    return NextResponse.json({ error: "Les informations de progression sont invalides." }, { status: 400 });
  }

  const isLesson = body.itemType === "lesson";
  if (isLesson ? body.scorePercentage !== undefined : (
    typeof body.scorePercentage !== "number" ||
    !Number.isInteger(body.scorePercentage) ||
    body.scorePercentage < 0 ||
    body.scorePercentage > 100
  )) {
    return NextResponse.json({ error: "Le score du quiz est invalide." }, { status: 400 });
  }

  const { data, error } = await access.supabase
    .from("student_learning_records")
    .upsert({
      user_id: access.userId,
      course_key: body.courseKey,
      item_type: body.itemType,
      item_key: body.itemKey,
      score_percentage: isLesson ? null : body.scorePercentage,
      ...(isLesson ? { completed_at: new Date().toISOString() } : {}),
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,course_key,item_type,item_key" })
    .select("course_key, item_type, item_key, score_percentage, completed_at, updated_at")
    .single();

  if (error) {
    console.error("Unable to save student learning record", error);
    return NextResponse.json({ error: "Impossible d’enregistrer votre progression." }, { status: 503 });
  }

  return NextResponse.json({ record: data });
}
