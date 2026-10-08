import { NextResponse } from "next/server";
import { getCourseAccess } from "@/lib/payments/access";

export async function GET() {
  const access = await getCourseAccess();
  if (!access.allowed) return access.response;

  const { data: courses, error: courseError } = await access.supabase.from("courses")
    .select("id, title, language, level, description")
    .eq("published", true)
    .order("created_at", { ascending: false });
  if (courseError) {
    console.error("Unable to load published courses", courseError);
    return NextResponse.json({ error: "Impossible de charger les cours publiés." }, { status: 503 });
  }

  const courseIds = (courses ?? []).map((course) => course.id);
  const [{ data: lessons, error: lessonError }, { data: records, error: recordError }] = await Promise.all([
    courseIds.length
      ? access.supabase.from("course_lessons")
        .select("id, course_id, title, position, video_url, duration_seconds")
        .in("course_id", courseIds)
        .order("position", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    access.supabase.from("student_learning_records")
      .select("course_key, item_key, item_type, score_percentage, completed_at"),
  ]);
  if (lessonError || recordError) {
    console.error("Unable to load published course content", lessonError ?? recordError);
    return NextResponse.json({ error: "Impossible de charger les leçons et la progression." }, { status: 503 });
  }

  return NextResponse.json({
    courses: (courses ?? []).map((course) => ({
      ...course,
      lessons: (lessons ?? []).filter((lesson) => lesson.course_id === course.id),
    })),
    records: records ?? [],
  });
}
