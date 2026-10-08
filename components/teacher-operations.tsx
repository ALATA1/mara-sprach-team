"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";

type Course = {
  id: string;
  title: string;
  language: "fr" | "de";
  level: string;
  description: string;
  published: boolean;
  teacher_id: string | null;
  lessons: Lesson[];
};
type Lesson = {
  id: string;
  course_id: string;
  title: string;
  position: number;
  video_url: string | null;
  duration_seconds: number | null;
};
type Session = {
  id: string;
  title: string;
  start_at: string;
  end_at: string;
  capacity: number;
  status: "scheduled" | "cancelled" | "completed";
  course_id: string | null;
  meeting_url: string | null;
  participants: { userId: string; name: string; attended: boolean | null }[];
};
type Data = { role: "teacher" | "admin"; courses: Course[]; sessions: Session[] };

const dateTimeInput = (value: string) => {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};

export function TeacherOperations() {
  const [data, setData] = useState<Data>({ role: "teacher", courses: [], sessions: [] });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [courseTitle, setCourseTitle] = useState("");
  const [courseLanguage, setCourseLanguage] = useState<"fr" | "de">("de");
  const [courseLevel, setCourseLevel] = useState("A1");
  const [courseDescription, setCourseDescription] = useState("");
  const [sessionStart, setSessionStart] = useState("");
  const [sessionEnd, setSessionEnd] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/staff/teaching", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Impossible de charger les cours et séances.");
      setData({ role: result.role, courses: result.courses ?? [], sessions: result.sessions ?? [] });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Impossible de charger les cours et séances.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const request = async (method: "POST" | "PATCH", body: unknown, busyKey: string) => {
    setBusy(busyKey);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/staff/teaching", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "L’opération a échoué.");
      if (result.notification) setMessage(result.notification);
      else setMessage("Modifications enregistrées.");
      await load();
      return true;
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "L’opération a échoué.");
      return false;
    } finally {
      setBusy("");
    }
  };

  const saveCourse = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const course = {
      title: courseTitle,
      language: courseLanguage,
      level: courseLevel,
      description: courseDescription,
    };
    const saved = editingCourse
      ? await request("PATCH", { kind: "course", id: editingCourse.id, course }, "course")
      : await request("POST", { kind: "course", course }, "course");
    if (saved) {
      setEditingCourse(null);
      setCourseTitle("");
      setCourseLevel("A1");
      setCourseDescription("");
    }
  };

  const startEditingCourse = (course: Course) => {
    setEditingCourse(course);
    setCourseTitle(course.title);
    setCourseLanguage(course.language);
    setCourseLevel(course.level);
    setCourseDescription(course.description);
  };

  const createSession = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(event.currentTarget);
    const courseId = String(values.get("courseId") ?? "");
    const meetingUrl = String(values.get("meetingUrl") ?? "").trim();
    const saved = await request("POST", {
      kind: "session",
      session: {
        title: String(values.get("title") ?? ""),
        courseId: courseId || null,
        startAt: new Date(sessionStart).toISOString(),
        endAt: new Date(sessionEnd).toISOString(),
        capacity: Number(values.get("capacity")),
        meetingUrl: meetingUrl || null,
      },
    }, "session");
    if (saved) {
      form.reset();
      setSessionStart("");
      setSessionEnd("");
    }
  };

  return (
    <main className="shell staffDashboard">
      <header className="staffDashboardHeader">
        <div>
          <p className="eyebrow">Espace formateur</p>
          <h1>Cours et séances LIVE</h1>
          <p className="muted">Gérez vos cours, le calendrier et les présences de vos étudiants.</p>
        </div>
        <div className="staffFormActions">
          <Link className="btn ghost" href="/">Accueil</Link>
          {data.role === "admin" && <Link className="btn ghost" href="/staff">Demandes d’accompagnement</Link>}
          {data.role === "admin" && <Link className="btn ghost" href="/staff/admin">Administration</Link>}
          <button className="btn secondary" type="button" onClick={() => void load()} disabled={loading}>
            {loading ? "Actualisation…" : "Actualiser"}
          </button>
        </div>
      </header>
      {error && <p className="authError" role="alert">{error}</p>}
      {message && <p className="staffSuccess" role="status">{message}</p>}
      {loading && <p role="status">Chargement…</p>}

      <section className="card staffEditor">
        <h2>{editingCourse ? "Modifier le cours" : "Créer un cours"}</h2>
        <form className="staffForm" onSubmit={saveCourse}>
          <label className="field">Titre
            <input required maxLength={160} value={courseTitle} onChange={(event) => setCourseTitle(event.target.value)} />
          </label>
          <label className="field">Langue
            <select value={courseLanguage} onChange={(event) => setCourseLanguage(event.target.value as "fr" | "de")}>
              <option value="fr">Français</option><option value="de">Allemand</option>
            </select>
          </label>
          <label className="field">Niveau
            <input required maxLength={30} value={courseLevel} onChange={(event) => setCourseLevel(event.target.value)} />
          </label>
          <label className="field staffFullWidth">Description
            <textarea maxLength={3000} rows={3} value={courseDescription} onChange={(event) => setCourseDescription(event.target.value)} />
          </label>
          <div className="staffFormActions">
            <button className="btn primary" type="submit" disabled={busy === "course"}>
              {busy === "course" ? "Enregistrement…" : editingCourse ? "Enregistrer les modifications" : "Créer le cours"}
            </button>
            {editingCourse && <button className="btn ghost" type="button" onClick={() => {
              setEditingCourse(null);
              setCourseTitle("");
              setCourseLevel("A1");
              setCourseDescription("");
            }}>Annuler</button>}
          </div>
        </form>
      </section>

      <section className="staffRequestList" aria-label="Cours">
        {data.courses.map((course) => (
          <article className="card staffRequest" key={course.id}>
            <div className="staffRequestHeading">
              <div><p className="eyebrow">{course.language.toUpperCase()} · {course.level}</p><h2>{course.title}</h2></div>
              <span className="pill">{course.published ? "Publié" : "Brouillon"}</span>
            </div>
            {course.description && <p>{course.description}</p>}
            <div className="staffFormActions">
              <button className="btn secondary" type="button" onClick={() => startEditingCourse(course)}>Modifier</button>
              <button
                className="btn ghost"
                type="button"
                disabled={busy === course.id}
                onClick={() => void request("PATCH", {
                  kind: "course", id: course.id, course: { published: !course.published },
                }, course.id)}
              >{course.published ? "Dépublier" : "Publier"}</button>
            </div>
            <details className="courseLessonEditor">
              <summary>Gérer les leçons ({course.lessons.length})</summary>
              <form className="staffForm" onSubmit={(event) => {
                event.preventDefault();
                const form = event.currentTarget;
                const values = new FormData(form);
                void request("POST", {
                  kind: "lesson",
                  course: {
                    courseId: course.id,
                    title: String(values.get("title") ?? ""),
                    videoUrl: String(values.get("videoUrl") ?? "").trim() || null,
                    durationSeconds: values.get("durationSeconds") ? Number(values.get("durationSeconds")) * 60 : null,
                  },
                }, `lesson:${course.id}`).then((saved) => {
                  if (saved) form.reset();
                });
              }}>
                <label className="field">Nouvelle leçon
                  <input name="title" required maxLength={160} />
                </label>
                <label className="field">Durée (minutes)
                  <input name="durationSeconds" type="number" min={1} max={1440} />
                </label>
                <label className="field staffFullWidth">Vidéo HTTPS (facultatif)
                  <input name="videoUrl" type="url" placeholder="https://…" />
                </label>
                <button className="btn secondary staffFullWidth" type="submit">Ajouter la leçon</button>
              </form>
              {course.lessons.map((lesson) => (
                <form className="staffLessonEdit" key={lesson.id} onSubmit={(event) => {
                  event.preventDefault();
                  const values = new FormData(event.currentTarget);
                  void request("PATCH", {
                    kind: "lesson",
                    id: lesson.id,
                    course: {
                      title: String(values.get("title") ?? ""),
                      videoUrl: String(values.get("videoUrl") ?? "").trim() || null,
                      durationSeconds: values.get("durationSeconds") ? Number(values.get("durationSeconds")) * 60 : null,
                    },
                  }, lesson.id);
                }}>
                  <label className="field">Leçon {lesson.position}
                    <input name="title" required maxLength={160} defaultValue={lesson.title} />
                  </label>
                  <label className="field">Durée (minutes)
                    <input name="durationSeconds" type="number" min={1} max={1440} defaultValue={lesson.duration_seconds ? Math.ceil(lesson.duration_seconds / 60) : ""} />
                  </label>
                  <label className="field staffFullWidth">Vidéo HTTPS
                    <input name="videoUrl" type="url" defaultValue={lesson.video_url ?? ""} />
                  </label>
                  <button className="btn ghost staffFullWidth" type="submit">Enregistrer la leçon</button>
                </form>
              ))}
            </details>
          </article>
        ))}
      </section>

      <section className="card staffEditor">
        <h2>Créer une séance LIVE</h2>
        <form className="staffForm" onSubmit={createSession}>
          <label className="field">Titre
            <input name="title" required maxLength={160} />
          </label>
          <label className="field">Cours
            <select name="courseId" defaultValue="">
              <option value="">Séance générale</option>
              {data.courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}
            </select>
          </label>
          <label className="field">Début
            <input type="datetime-local" required value={sessionStart} onChange={(event) => setSessionStart(event.target.value)} />
          </label>
          <label className="field">Fin
            <input type="datetime-local" required value={sessionEnd} onChange={(event) => setSessionEnd(event.target.value)} />
          </label>
          <label className="field">Places
            <input name="capacity" type="number" min={1} max={200} defaultValue={20} required />
          </label>
          <label className="field">Lien Teams (facultatif)
            <input name="meetingUrl" type="url" placeholder="https://teams.microsoft.com/…" />
          </label>
          <button className="btn primary staffFullWidth" type="submit" disabled={busy === "session"}>Créer la séance</button>
        </form>
      </section>

      <section className="staffRequestList" aria-label="Séances et participants">
        {data.sessions.map((session) => (
          <article className="card staffRequest" key={session.id}>
            <div className="staffRequestHeading">
              <div><p className="eyebrow">{session.status}</p><h2>{session.title}</h2></div>
              <span className="pill">{session.participants.length}/{session.capacity} inscrits</span>
            </div>
            <p>{new Date(session.start_at).toLocaleString("fr-FR")} – {new Date(session.end_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</p>
            {session.status === "scheduled" && (
              <form
                className="staffForm"
                onSubmit={(event) => {
                  event.preventDefault();
                  const values = new FormData(event.currentTarget);
                  void request("PATCH", {
                    kind: "session",
                    id: session.id,
                    session: {
                      startAt: new Date(String(values.get(`start-${session.id}`))).toISOString(),
                      endAt: new Date(String(values.get(`end-${session.id}`))).toISOString(),
                    },
                  }, session.id);
                }}
              >
                <label className="field">Reprogrammer le début
                  <input type="datetime-local" defaultValue={dateTimeInput(session.start_at)} name={`start-${session.id}`} />
                </label>
                <label className="field">Reprogrammer la fin
                  <input type="datetime-local" defaultValue={dateTimeInput(session.end_at)} name={`end-${session.id}`} />
                </label>
                <div className="staffFormActions staffFullWidth">
                  <button className="btn secondary" type="submit">Enregistrer l’horaire</button>
                  <button className="btn ghost" type="button" onClick={() => void request("PATCH", {
                    kind: "session", id: session.id, session: { status: "cancelled" },
                  }, session.id)}>Annuler la séance</button>
                </div>
              </form>
            )}
            <div className="staffParticipants">
              {session.participants.map((participant) => (
                <label className="staffParticipant" key={participant.userId}>
                  <span>{participant.name}</span>
                  <select
                    aria-label={`Présence de ${participant.name}`}
                    value={participant.attended === null ? "" : String(participant.attended)}
                    onChange={(event) => void request("POST", {
                      kind: "attendance",
                      sessionId: session.id,
                      studentId: participant.userId,
                      attended: event.target.value === "" ? null : event.target.value === "true",
                    }, `${session.id}:${participant.userId}`)}
                  >
                    <option value="">Non notée</option><option value="true">Présent</option><option value="false">Absent</option>
                  </select>
                </label>
              ))}
              {session.participants.length === 0 && <p className="muted">Aucun inscrit.</p>}
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
