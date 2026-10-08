import { NextResponse } from "next/server";
import { authorizeStaff } from "@/lib/auth/staff";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const isUuid = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const isMeetingUrl = (value: unknown): value is string => {
  if (typeof value !== "string" || !value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password &&
      (url.hostname === "teams.microsoft.com" || url.hostname === "teams.live.com") &&
      url.pathname.length > 1;
  } catch {
    return false;
  }
};

type CourseInput = {
  title: string;
  language: "fr" | "de";
  level: string;
  description: string;
};
type SessionInput = {
  title: string;
  courseId: string | null;
  startAt: string;
  endAt: string;
  capacity: number;
  meetingUrl: string | null;
  teacherId?: string | null;
};
type LessonInput = { courseId: string; title: string; videoUrl: string | null; durationSeconds: number | null };

export async function GET() {
  const authorization = await authorizeStaff(["teacher", "admin"]);
  if (authorization.response) return authorization.response;
  const { user, role, admin } = authorization.context;

  let coursesQuery = admin.from("courses").select("id, title, language, level, description, published, teacher_id");
  let sessionsQuery = admin.from("live_sessions")
    .select("id, course_id, teacher_id, title, start_at, end_at, meeting_url, capacity, status")
    .order("start_at", { ascending: true });
  if (role === "teacher") {
    coursesQuery = coursesQuery.eq("teacher_id", user.id);
    sessionsQuery = sessionsQuery.eq("teacher_id", user.id);
  }

  const [{ data: courses, error: courseError }, { data: sessions, error: sessionError }] =
    await Promise.all([coursesQuery, sessionsQuery]);
  if (courseError || sessionError) {
    console.error("Unable to load teacher operations", courseError ?? sessionError);
    return NextResponse.json({ error: "Impossible de charger les cours et les séances." }, { status: 503 });
  }
  const courseIds = (courses ?? []).map((course) => course.id);
  const { data: lessons, error: lessonError } = courseIds.length
    ? await admin.from("course_lessons").select("id, course_id, title, position, video_url, duration_seconds")
      .in("course_id", courseIds).order("position", { ascending: true })
    : { data: [], error: null };
  if (lessonError) {
    console.error("Unable to load course lessons", lessonError);
    return NextResponse.json({ error: "Impossible de charger les leçons." }, { status: 503 });
  }

  const sessionIds = (sessions ?? []).map((session) => session.id);
  const { data: registrations, error: registrationError } = sessionIds.length
    ? await admin.from("live_registrations")
      .select("live_session_id, user_id, created_at")
      .in("live_session_id", sessionIds)
    : { data: [], error: null };
  const { data: attendance, error: attendanceError } = sessionIds.length
    ? await admin.from("live_attendance")
      .select("live_session_id, student_id, attended")
      .in("live_session_id", sessionIds)
    : { data: [], error: null };
  if (registrationError || attendanceError) {
    console.error("Unable to load live participants", registrationError ?? attendanceError);
    return NextResponse.json({ error: "Impossible de charger les participants des séances." }, { status: 503 });
  }

  const studentIds = [...new Set((registrations ?? []).map((row) => row.user_id))];
  const { data: profiles, error: profileError } = studentIds.length
    ? await admin.from("profiles").select("id, first_name, last_name").in("id", studentIds)
    : { data: [], error: null };
  if (profileError) {
    console.error("Unable to load participant profiles", profileError);
    return NextResponse.json({ error: "Impossible de charger les profils des participants." }, { status: 503 });
  }

  const names = new Map((profiles ?? []).map((profile) => [
    profile.id,
    [profile.first_name, profile.last_name].filter(Boolean).join(" ") || "Étudiant",
  ]));
  const attendedBySession = new Map<string, Map<string, boolean>>();
  for (const row of attendance ?? []) {
    const entries = attendedBySession.get(row.live_session_id) ?? new Map<string, boolean>();
    entries.set(row.student_id, row.attended);
    attendedBySession.set(row.live_session_id, entries);
  }

  return NextResponse.json({
    role,
    userId: user.id,
    courses: (courses ?? []).map((course) => ({
      ...course,
      lessons: (lessons ?? []).filter((lesson) => lesson.course_id === course.id),
    })),
    sessions: (sessions ?? []).map((session) => ({
      ...session,
      participants: (registrations ?? [])
        .filter((registration) => registration.live_session_id === session.id)
        .map((registration) => ({
          userId: registration.user_id,
          name: names.get(registration.user_id) ?? "Étudiant",
          attended: attendedBySession.get(session.id)?.get(registration.user_id) ?? null,
        })),
    })),
  });
}

export async function POST(request: Request) {
  const authorization = await authorizeStaff(["teacher", "admin"]);
  if (authorization.response) return authorization.response;
  const { user, role, admin } = authorization.context;

  let body: { kind?: unknown; course?: unknown; session?: unknown; sessionId?: unknown; studentId?: unknown; attended?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "La requête reçue est invalide." }, { status: 400 });
  }

  if (body.kind === "course") {
    const course = body.course as (Partial<CourseInput> & { teacherId?: unknown }) | null;
    if (!course || typeof course.title !== "string" || !course.title.trim() || course.title.trim().length > 160 ||
      (course.language !== "fr" && course.language !== "de") || typeof course.level !== "string" ||
      !course.level.trim() || course.level.length > 30 || typeof course.description !== "string" ||
      course.description.length > 3000) {
      return NextResponse.json({ error: "Vérifiez le titre, la langue, le niveau et la description du cours." }, { status: 400 });
    }

    if (role === "admin" && course.teacherId !== undefined && course.teacherId !== null && !isUuid(course.teacherId)) {
      return NextResponse.json({ error: "Formateur invalide." }, { status: 400 });
    }
    const teacherId = role === "teacher" ? user.id :
      isUuid(course.teacherId) ? course.teacherId : null;
    if (teacherId && role === "admin") {
      const { data: teacher, error: teacherError } = await admin.from("profiles")
        .select("id").eq("id", teacherId).eq("role", "teacher").maybeSingle();
      if (teacherError || !teacher) {
        return NextResponse.json({ error: "Le compte choisi n’a pas le rôle formateur." }, { status: 400 });
      }
    }
    const { data, error } = await admin.from("courses").insert({
      title: course.title.trim(),
      language: course.language,
      level: course.level.trim(),
      description: course.description.trim(),
      teacher_id: teacherId,
    }).select("id, title, language, level, description, published, teacher_id").single();
    if (error) {
      console.error("Unable to create course", error);
      return NextResponse.json({ error: "Impossible de créer le cours." }, { status: 503 });
    }
    return NextResponse.json({ course: data }, { status: 201 });
  }

  if (body.kind === "session") {
    const session = body.session as Partial<SessionInput> | null;
    const startAt = typeof session?.startAt === "string" ? new Date(session.startAt) : null;
    const endAt = typeof session?.endAt === "string" ? new Date(session.endAt) : null;
    if (!session || typeof session.title !== "string" || !session.title.trim() || session.title.length > 160 ||
      !startAt || Number.isNaN(startAt.getTime()) || !endAt || Number.isNaN(endAt.getTime()) ||
      endAt <= startAt || !Number.isInteger(session.capacity) || session.capacity! < 1 || session.capacity! > 200 ||
      (session.courseId !== null && !isUuid(session.courseId)) ||
      (session.meetingUrl !== null && !isMeetingUrl(session.meetingUrl))) {
      return NextResponse.json({ error: "Vérifiez les informations de la séance, son horaire, sa capacité et son lien Teams." }, { status: 400 });
    }
    if (session.courseId) {
      let courseQuery = admin.from("courses").select("id").eq("id", session.courseId);
      if (role === "teacher") courseQuery = courseQuery.eq("teacher_id", user.id);
      const { data: course, error } = await courseQuery.maybeSingle();
      if (error || !course) return NextResponse.json({ error: "Le cours choisi est introuvable ou ne vous appartient pas." }, { status: 403 });
    }

    const teacherId = role === "teacher" ? user.id : session.teacherId ?? null;
    if (teacherId !== null && !isUuid(teacherId)) {
      return NextResponse.json({ error: "Formateur invalide." }, { status: 400 });
    }
    if (role === "admin" && teacherId) {
      const { data: teacher, error: teacherError } = await admin.from("profiles")
        .select("id").eq("id", teacherId).eq("role", "teacher").maybeSingle();
      if (teacherError || !teacher) {
        return NextResponse.json({ error: "Le compte choisi n’a pas le rôle formateur." }, { status: 400 });
      }
    }

    const { data, error } = await admin.from("live_sessions").insert({
      title: session.title.trim(),
      course_id: session.courseId,
      teacher_id: teacherId,
      start_at: startAt.toISOString(),
      end_at: endAt.toISOString(),
      capacity: session.capacity,
      meeting_url: session.meetingUrl,
      status: "scheduled",
    }).select("id, course_id, teacher_id, title, start_at, end_at, meeting_url, capacity, status").single();
    if (error) {
      console.error("Unable to create live session", error);
      return NextResponse.json({ error: "Impossible de créer la séance." }, { status: 503 });
    }
    return NextResponse.json({ session: data }, { status: 201 });
  }

  if (body.kind === "lesson") {
    const lesson = body.course as Partial<LessonInput> | null;
    if (!lesson || !isUuid(lesson.courseId) || typeof lesson.title !== "string" ||
      !lesson.title.trim() || lesson.title.length > 160 ||
      (lesson.videoUrl !== null && lesson.videoUrl !== undefined && !isMeetingUrl(lesson.videoUrl) &&
        !/^https:\/\//i.test(lesson.videoUrl)) ||
      (lesson.durationSeconds !== null && lesson.durationSeconds !== undefined &&
        (!Number.isInteger(lesson.durationSeconds) || lesson.durationSeconds < 1 || lesson.durationSeconds > 86400))) {
      return NextResponse.json({ error: "Vérifiez le cours, le titre, la vidéo et la durée de la leçon." }, { status: 400 });
    }
    let courseQuery = admin.from("courses").select("id").eq("id", lesson.courseId);
    if (role === "teacher") courseQuery = courseQuery.eq("teacher_id", user.id);
    const [{ data: course, error: courseError }, { data: previous, error: lessonError }] = await Promise.all([
      courseQuery.maybeSingle(),
      admin.from("course_lessons").select("position").eq("course_id", lesson.courseId)
        .order("position", { ascending: false }).limit(1).maybeSingle(),
    ]);
    if (courseError || lessonError) {
      console.error("Unable to verify lesson creation", courseError ?? lessonError);
      return NextResponse.json({ error: "Impossible de vérifier le cours ou ses leçons." }, { status: 503 });
    }
    if (!course) return NextResponse.json({ error: "Ce cours ne vous appartient pas." }, { status: 403 });
    const { data, error } = await admin.from("course_lessons").insert({
      course_id: lesson.courseId,
      title: lesson.title.trim(),
      position: (previous?.position ?? 0) + 1,
      video_url: lesson.videoUrl || null,
      duration_seconds: lesson.durationSeconds ?? null,
    }).select("id, course_id, title, position, video_url, duration_seconds").single();
    if (error) {
      console.error("Unable to create lesson", error);
      return NextResponse.json({ error: "Impossible de créer la leçon." }, { status: 503 });
    }
    return NextResponse.json({ lesson: data }, { status: 201 });
  }

  if (body.kind === "attendance") {
    if (!isUuid(body.sessionId) || !isUuid(body.studentId) ||
      (typeof body.attended !== "boolean" && body.attended !== null)) {
      return NextResponse.json({ error: "Sélectionnez une séance, un étudiant et un état de présence valide." }, { status: 400 });
    }
    let sessionQuery = admin.from("live_sessions").select("id").eq("id", body.sessionId);
    if (role === "teacher") sessionQuery = sessionQuery.eq("teacher_id", user.id);
    const [{ data: session, error: sessionError }, { data: registration, error: registrationError }] = await Promise.all([
      sessionQuery.maybeSingle(),
      admin.from("live_registrations").select("id")
        .eq("live_session_id", body.sessionId).eq("user_id", body.studentId).maybeSingle(),
    ]);
    if (sessionError || registrationError) {
      console.error("Unable to verify attendance target", sessionError ?? registrationError);
      return NextResponse.json({ error: "Impossible de vérifier cette inscription." }, { status: 503 });
    }
    if (!session || !registration) {
      return NextResponse.json({ error: "Cette inscription n’existe pas ou la séance ne vous appartient pas." }, { status: 404 });
    }
    const { error } = body.attended === null
      ? await admin.from("live_attendance").delete()
        .eq("live_session_id", body.sessionId).eq("student_id", body.studentId)
      : await admin.from("live_attendance").upsert({
        live_session_id: body.sessionId,
        student_id: body.studentId,
        attended: body.attended,
        recorded_by: user.id,
        updated_at: new Date().toISOString(),
      }, { onConflict: "live_session_id,student_id" });
    if (error) {
      console.error("Unable to record live attendance", error);
      return NextResponse.json({ error: "Impossible d’enregistrer la présence." }, { status: 503 });
    }
    return NextResponse.json({ saved: true });
  }

  return NextResponse.json({ error: "Type d’opération inconnu." }, { status: 400 });
}

export async function PATCH(request: Request) {
  const authorization = await authorizeStaff(["teacher", "admin"]);
  if (authorization.response) return authorization.response;
  const { user, role, admin } = authorization.context;

  let body: {
    kind?: unknown;
    id?: unknown;
    course?: Partial<CourseInput> & { published?: unknown };
    session?: Partial<SessionInput> & { status?: unknown };
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "La requête reçue est invalide." }, { status: 400 });
  }
  if (!isUuid(body.id)) return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });

  if (body.kind === "course" && body.course) {
    const values = body.course;
    if (values.title !== undefined && (typeof values.title !== "string" || !values.title.trim() || values.title.length > 160) ||
      values.language !== undefined && values.language !== "fr" && values.language !== "de" ||
      values.level !== undefined && (typeof values.level !== "string" || !values.level.trim() || values.level.length > 30) ||
      values.description !== undefined && (typeof values.description !== "string" || values.description.length > 3000) ||
      values.published !== undefined && typeof values.published !== "boolean") {
      return NextResponse.json({ error: "Les informations modifiées du cours sont invalides." }, { status: 400 });
    }
    const updateValues = {
      ...(values.title !== undefined ? { title: values.title.trim() } : {}),
      ...(values.language !== undefined ? { language: values.language } : {}),
      ...(values.level !== undefined ? { level: values.level.trim() } : {}),
      ...(values.description !== undefined ? { description: values.description.trim() } : {}),
      ...(values.published !== undefined ? { published: values.published } : {}),
    };
    if (!Object.keys(updateValues).length) {
      return NextResponse.json({ error: "Aucune modification de cours fournie." }, { status: 400 });
    }
    const { data: currentCourse, error: courseLookupError } = await admin
      .from("courses").select("teacher_id").eq("id", body.id).maybeSingle();
    if (courseLookupError) {
      console.error("Unable to verify course ownership", courseLookupError);
      return NextResponse.json({ error: "Impossible de vérifier les droits sur ce cours." }, { status: 503 });
    }
    if (!currentCourse || role === "teacher" && currentCourse.teacher_id !== user.id) {
      return NextResponse.json({ error: "Cours introuvable ou non attribué à votre compte." }, { status: 404 });
    }
    if (values.published === true) {
      const { count, error: lessonCountError } = await admin.from("course_lessons")
        .select("id", { count: "exact", head: true }).eq("course_id", body.id);
      if (lessonCountError) {
        console.error("Unable to verify course lessons before publishing", lessonCountError);
        return NextResponse.json({ error: "Impossible de vérifier les leçons du cours." }, { status: 503 });
      }
      if ((count ?? 0) === 0) {
        return NextResponse.json({ error: "Ajoutez au moins une leçon avant de publier ce cours." }, { status: 409 });
      }
    }
    const { data, error } = await admin.from("courses").update(updateValues).eq("id", body.id)
      .select("id, title, language, level, description, published, teacher_id").maybeSingle();
    if (error) {
      console.error("Unable to update course", error);
      return NextResponse.json({ error: "Impossible de modifier le cours." }, { status: 503 });
    }
    if (!data) return NextResponse.json({ error: "Cours introuvable." }, { status: 404 });
    return NextResponse.json({ course: data });
  }

  if (body.kind === "lesson" && body.course) {
    const values = body.course as Partial<LessonInput>;
    if (values.title !== undefined && (typeof values.title !== "string" || !values.title.trim() || values.title.length > 160) ||
      values.videoUrl !== undefined && values.videoUrl !== null &&
        !/^https:\/\//i.test(values.videoUrl) ||
      values.durationSeconds !== undefined && values.durationSeconds !== null &&
        (!Number.isInteger(values.durationSeconds) || values.durationSeconds < 1 || values.durationSeconds > 86400)) {
      return NextResponse.json({ error: "Les informations modifiées de la leçon sont invalides." }, { status: 400 });
    }
    const { data: current, error: lessonLookupError } = await admin.from("course_lessons")
      .select("id, course_id").eq("id", body.id).maybeSingle();
    if (lessonLookupError) {
      console.error("Unable to verify lesson ownership", lessonLookupError);
      return NextResponse.json({ error: "Impossible de vérifier la leçon." }, { status: 503 });
    }
    if (!current) return NextResponse.json({ error: "Leçon introuvable." }, { status: 404 });
    if (role === "teacher") {
      const { data: course } = await admin.from("courses").select("id")
        .eq("id", current.course_id).eq("teacher_id", user.id).maybeSingle();
      if (!course) return NextResponse.json({ error: "Cette leçon n’appartient pas à votre cours." }, { status: 403 });
    }
    const updateValues = {
      ...(values.title !== undefined ? { title: values.title.trim() } : {}),
      ...(values.videoUrl !== undefined ? { video_url: values.videoUrl } : {}),
      ...(values.durationSeconds !== undefined ? { duration_seconds: values.durationSeconds } : {}),
    };
    if (!Object.keys(updateValues).length) {
      return NextResponse.json({ error: "Aucune modification de leçon fournie." }, { status: 400 });
    }
    const { data, error } = await admin.from("course_lessons").update(updateValues)
      .eq("id", body.id).select("id, course_id, title, position, video_url, duration_seconds").maybeSingle();
    if (error) {
      console.error("Unable to update lesson", error);
      return NextResponse.json({ error: "Impossible de modifier la leçon." }, { status: 503 });
    }
    return NextResponse.json({ lesson: data });
  }

  if (body.kind === "session" && body.session) {
    const values = body.session;
    const { data: current, error: lookupError } = await admin.from("live_sessions")
      .select("id, teacher_id, status, start_at, end_at, title")
      .eq("id", body.id).maybeSingle();
    if (lookupError || !current) {
      return NextResponse.json({ error: "Séance introuvable." }, { status: 404 });
    }
    if (role === "teacher" && current.teacher_id !== user.id) {
      return NextResponse.json({ error: "Cette séance n’est pas attribuée à votre compte." }, { status: 403 });
    }
    if (values.status !== undefined && values.status !== "scheduled" && values.status !== "cancelled" && values.status !== "completed") {
      return NextResponse.json({ error: "État de séance invalide." }, { status: 400 });
    }
    const startAt = values.startAt === undefined ? new Date(current.start_at) : new Date(values.startAt);
    const endAt = values.endAt === undefined ? new Date(current.end_at) : new Date(values.endAt);
    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime()) || endAt <= startAt) {
      return NextResponse.json({ error: "L’horaire de la séance est invalide." }, { status: 400 });
    }
    if (values.title !== undefined && (typeof values.title !== "string" || !values.title.trim() || values.title.length > 160) ||
      values.capacity !== undefined && (!Number.isInteger(values.capacity) || values.capacity < 1 || values.capacity > 200) ||
      values.meetingUrl !== undefined && values.meetingUrl !== null && !isMeetingUrl(values.meetingUrl)) {
      return NextResponse.json({ error: "Les informations modifiées de la séance sont invalides." }, { status: 400 });
    }
    const teacherId = role === "admin" && values.teacherId !== undefined
      ? isUuid(values.teacherId) ? values.teacherId : values.teacherId === null ? null : undefined
      : undefined;
    if (role === "admin" && values.teacherId !== undefined && teacherId === undefined) {
      return NextResponse.json({ error: "Formateur invalide." }, { status: 400 });
    }
    if (teacherId) {
      const { data: teacher, error: teacherError } = await admin.from("profiles")
        .select("id").eq("id", teacherId).eq("role", "teacher").maybeSingle();
      if (teacherError || !teacher) {
        return NextResponse.json({ error: "Le compte choisi n’a pas le rôle formateur." }, { status: 400 });
      }
    }
    if (values.capacity !== undefined) {
      const { count, error: countError } = await admin.from("live_registrations")
        .select("id", { count: "exact", head: true }).eq("live_session_id", body.id);
      if (countError) {
        console.error("Unable to validate live session capacity", countError);
        return NextResponse.json({ error: "Impossible de vérifier le nombre d’inscrits." }, { status: 503 });
      }
      if ((count ?? 0) > values.capacity) {
        return NextResponse.json({ error: "La capacité ne peut pas être inférieure au nombre d’inscrits." }, { status: 409 });
      }
    }
    const { data, error } = await admin.from("live_sessions").update({
      start_at: startAt.toISOString(),
      end_at: endAt.toISOString(),
      ...(values.title !== undefined ? { title: values.title.trim() } : {}),
      ...(values.capacity !== undefined ? { capacity: values.capacity } : {}),
      ...(values.meetingUrl !== undefined ? { meeting_url: values.meetingUrl } : {}),
      ...(values.status !== undefined ? { status: values.status } : {}),
      ...(teacherId !== undefined ? { teacher_id: teacherId } : {}),
      updated_at: new Date().toISOString(),
    }).eq("id", body.id)
      .select("id, course_id, teacher_id, title, start_at, end_at, meeting_url, capacity, status").single();
    if (error) {
      console.error("Unable to update live session", error);
      return NextResponse.json({ error: "Impossible de modifier la séance." }, { status: 503 });
    }

    const changedSchedule = current.start_at !== data.start_at || current.end_at !== data.end_at;
    const cancelled = current.status !== "cancelled" && data.status === "cancelled";
    const notification = changedSchedule || cancelled
      ? await notifyParticipants(admin, data.id, data.title, data.start_at, cancelled)
      : null;
    return NextResponse.json({ session: data, ...(notification ? { notification } : {}) });
  }

  return NextResponse.json({ error: "Type de modification inconnu." }, { status: 400 });
}

async function notifyParticipants(
  admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  sessionId: string,
  title: string,
  startAt: string,
  cancelled: boolean,
): Promise<string> {
  const apiKey = process.env.RESEND_API_KEY;
  const sender = process.env.CONTACT_EMAIL_FROM;
  if (!apiKey || !sender) {
    return "La séance a été mise à jour, mais l’envoi d’e-mails n’est pas configuré.";
  }

  const { data: registrations, error } = await admin
    .from("live_registrations").select("user_id").eq("live_session_id", sessionId);
  if (error) {
    console.error("Unable to load participants for session notice", error);
    return "La séance a été mise à jour, mais la liste des inscrits n’a pas pu être chargée.";
  }

  const messages = await Promise.all((registrations ?? []).map(async ({ user_id }) => {
    const { data, error: userError } = await admin.auth.admin.getUserById(user_id);
    if (userError || !data.user.email) return false;
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: sender,
        to: data.user.email,
        subject: cancelled ? `Séance annulée : ${title}` : `Horaire modifié : ${title}`,
        text: cancelled
          ? `La séance « ${title} » a été annulée. Connectez-vous à Mara-Sprach Team pour consulter le calendrier.`
          : `La séance « ${title} » a été reprogrammée au ${new Date(startAt).toLocaleString("fr-FR")}.`,
      }),
    }).catch((sendError: unknown) => {
      console.error("Unable to send live session notice", sendError);
      return null;
    });
    return response?.ok ?? false;
  }));

  if (messages.some((sent) => !sent)) {
    return "La séance a été mise à jour, mais un ou plusieurs e-mails n’ont pas pu être envoyés.";
  }
  return "";
}
