"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Course = {
  id: number;
  language: string;
  level: string;
  title: string;
  progress: number;
  lessons: number;
  color: string;
};

type LiveSession = {
  id: number | string;
  title: string;
  date: string;
  teacher: string;
  roomUrl: string;
  course?: string;
  startAt?: string;
};

const JITSI_LIVE_URLS = [
  "https://meet.jit.si/MaraSprachA1Live",
  "https://meet.jit.si/MaraSprachDeutschLive",
];

const isValidGoogleMeetUrl = (value?: string) => {
  if (!value) return false;
  const trimmed = value.trim();
  if (!trimmed.startsWith("https://meet.google.com/")) return false;
  const path = trimmed.replace("https://meet.google.com/", "");
  return /^[a-z]{3}-[a-z]{4}-[a-z]{3}$/i.test(path);
};

const isValidJitsiUrl = (value?: string) => {
  if (!value) return false;
  const trimmed = value.trim();
  return /^https:\/\/meet\.jit\.si\//i.test(trimmed);
};

const normalizeMeetingUrl = (value?: string) => {
  if (typeof value !== "string") return JITSI_LIVE_URLS[0];
  const trimmed = value.trim();
  if (isValidGoogleMeetUrl(trimmed) || isValidJitsiUrl(trimmed)) {
    return trimmed;
  }
  return JITSI_LIVE_URLS[0];
};

const defaultLiveSessions: LiveSession[] = [
  {
    id: 1,
    title: "Conversation française A1",
    date: "Jeudi 18:30",
    teacher: "Sophie Martin",
    roomUrl: JITSI_LIVE_URLS[0],
    course: "Français",
    startAt: "2026-08-14T18:30:00+00:00",
  },
  {
    id: 2,
    title: "Deutsch sprechen A1",
    date: "Samedi 10:00",
    teacher: "Jonas Weber",
    roomUrl: JITSI_LIVE_URLS[1],
    course: "Allemand",
    startAt: "2026-08-16T10:00:00+00:00",
  },
  {
    id: 3,
    title: "Atelier oral français",
    date: "Lundi 18:00",
    teacher: "Sophie Martin",
    roomUrl: JITSI_LIVE_URLS[0],
    course: "Français",
    startAt: "2026-08-18T18:00:00+00:00",
  },
  {
    id: 4,
    title: "Conversation allemande niveau B1",
    date: "Mercredi 19:00",
    teacher: "Jonas Weber",
    roomUrl: JITSI_LIVE_URLS[1],
    course: "Allemand",
    startAt: "2026-08-20T19:00:00+00:00",
  },
];

const formatSessionDate = (value?: string, fallback = "À programmer") => {
  if (!value) return fallback;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return fallback;

  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
};

const normalizeLiveSession = (session: any): LiveSession => ({
  id: session.id ?? session.live_session_id ?? Math.random(),
  title: session.title ?? "Session LIVE",
  date: formatSessionDate(session.start_at ?? session.startAt, session.date ?? "À programmer"),
  teacher: session.teacher ?? "Sophie Martin",
  roomUrl: normalizeMeetingUrl(
    session.meeting_url ??
      session.meetingUrl ??
      session.roomUrl ??
      JITSI_LIVE_URLS[0],
  ),
  course: session.course ?? session.course_name ?? session.language ?? "Français",
  startAt: session.start_at ?? session.startAt,
});

const courses: Course[] = [
  {
    id: 1,
    language: "Français",
    level: "A1",
    title: "Premiers pas en français",
    progress: 45,
    lessons: 8,
    color: "#2563eb",
  },
  {
    id: 2,
    language: "Français",
    level: "A2",
    title: "Communiquer au quotidien",
    progress: 10,
    lessons: 10,
    color: "#7c3aed",
  },
  {
    id: 3,
    language: "Allemand",
    level: "A1",
    title: "Deutsch für Anfänger",
    progress: 0,
    lessons: 7,
    color: "#ea580c",
  },
];
const liveParticipants = ["Sophie Martin", "Amine", "Yasmina", "Lucas", "Leila", "Paul", "Noémie"];
export function AppShell() {
  const [page, setPage] = useState("home"),
    [user, setUser] = useState<{ firstName: string; email?: string } | null>(null),
    [paid, setPaid] = useState(false),
    [language, setLanguage] = useState("Tous"),
    [selected, setSelected] = useState(courses[0]),
    [registered, setRegistered] = useState<number[]>([]),
    [support, setSupport] = useState(false),
    [toast, setToast] = useState(""),
    [photoOpen, setPhotoOpen] = useState(false),
    [logoOpen, setLogoOpen] = useState(false),
    [liveJoined, setLiveJoined] = useState(false),
    [micOn, setMicOn] = useState(true),
    [cameraOn, setCameraOn] = useState(true),
    [chatOpen, setChatOpen] = useState(true),
    [chatInput, setChatInput] = useState(""),
    [questionInput, setQuestionInput] = useState(""),
    [liveSessions, setLiveSessions] = useState<LiveSession[]>(defaultLiveSessions),
    [activeLive, setActiveLive] = useState<LiveSession>(defaultLiveSessions[0]);
  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem("ensemble-v1") || "null");
      if (s) {
        setUser(s.user);
        setPaid(!!s.paid);
        setRegistered(s.registered || []);
        setSupport(!!s.support);
      }
    } catch {}
  }, []);

  useEffect(() => {
    const client = createClient();
    if (!client) return;

    let active = true;

    const loadSessions = async () => {
      try {
        const { data, error } = await client.from("live_sessions").select("*").order("start_at", { ascending: true });
        if (!active || error || !Array.isArray(data)) {
          setLiveSessions(defaultLiveSessions);
          return;
        }

        const nextSessions = data.map(normalizeLiveSession);
        setLiveSessions(nextSessions.length ? nextSessions : defaultLiveSessions);
      } catch {
        if (active) {
          setLiveSessions(defaultLiveSessions);
        }
      }
    };

    loadSessions();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!liveSessions.length) return;
    setActiveLive((current) => {
      if (current && liveSessions.some((item) => item.id === current.id)) return current;
      return liveSessions[0];
    });
  }, [liveSessions]);

  useEffect(() => {
    localStorage.setItem("ensemble-v1", JSON.stringify({ user, paid, registered, support }));
  }, [user, paid, registered, support]);
  const go = (p: string) => {
      setPage(p);
      scrollTo(0, 0);
    },
    notify = (m: string) => {
      setToast(m);
      setTimeout(() => setToast(""), 2200);
    },
    visible = useMemo(
      () => (language === "Tous" ? courses : courses.filter((c) => c.language === language)),
      [language],
    );
  const card = (c: Course) => (
    <article className="card course" key={c.id}>
      <div className="cover" style={{ background: `linear-gradient(135deg,${c.color},#172554)` }}>
        <strong>{c.language}</strong>
        <span className="pill">{c.level}</span>
      </div>
      <div className="courseBody">
        <h3>{c.title}</h3>
        <span className="muted">{c.lessons} leçons</span>
        <div className="progress">
          <span style={{ width: `${c.progress}%` }} />
        </div>
        <button
          className="btn secondary"
          onClick={() => {
            setSelected(c);
            go("course");
          }}
        >
          {c.progress ? "Continuer" : "Découvrir"}
        </button>
      </div>
    </article>
  );
  const liveRows = liveSessions.map((l) => {
    const id = Number(l.id) || String(l.id);
    const on = registered.includes(Number(id) || Number(l.id));
    return (
      <div className="live" key={String(l.id)}>
        <div>
          <strong>{l.title}</strong>
          <div className="muted">
            {l.date} • {l.teacher}
          </div>
        </div>
        <div className="liveActionsRow">
          <button
            className={`btn ${on ? "secondary" : "primary"}`}
            onClick={() => {
              const numericId = Number(l.id);
              setRegistered((v) =>
                on ? v.filter((x) => x !== numericId && String(x) !== String(l.id)) : [...v, numericId || Number(String(l.id).slice(-1))],
              );
              notify(on ? "Inscription annulée" : "Inscription confirmée");
            }}
          >
            {on ? "Inscrit ✓" : "S'inscrire"}
          </button>
          <button
            className="btn ghost"
            onClick={() => {
              setActiveLive(l);
              setSelected(courses[0]);
              setLiveJoined(true);
              go("course");
              if (typeof window !== "undefined") {
                window.open(l.roomUrl, "_blank", "noopener,noreferrer");
              }
              notify("Salle Google Meet ouverte");
            }}
          >
            Rejoindre
          </button>
        </div>
      </div>
    );
  });
  const joinLiveSession = (item = activeLive) => {
    if (!item) return;
    setActiveLive(item);
    setLiveJoined(true);
    if (typeof window !== "undefined") {
      window.open(item.roomUrl, "_blank", "noopener,noreferrer");
    }
    notify("Salle live ouverte");
  };
  const copyLiveLink = async () => {
    if (!activeLive?.roomUrl) return;
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(activeLive.roomUrl);
      }
      notify("Lien de salle copié");
    } catch {
      notify("Lien prêt à être partagé");
    }
  };
  const liveMessages = [
    { user: "Sophie", text: "Bonjour à tous ! On va parler aujourd’hui de la présentation." },
    { user: "Amine", text: "Très bien, je peux répondre en français." },
    { user: "Leila", text: "Je veux aussi améliorer ma prononciation." },
    { user: "Vous", text: "Je suis prêt pour la séance." },
  ];
  const liveQuestions = [
    { user: "Amine", text: "Comment distinguer le féminin et le masculin ?" },
    { user: "Leila", text: "Peut-on parler plus lentement pendant la séance ?" },
    { user: "Lucas", text: "Je voudrais des exemples concrets de phrases." },
  ];
  return (
    <div className="app">
      <header className="topbar">
        <div className="brand" onClick={() => go(paid ? "dashboard" : "home")}>
          <Image
            src="/logo/logo1.png"
            alt="Mara-Sprach-Team"
            width={420}
            height={120}
            priority
            style={{ width: "auto", height: "85px", objectFit: "contain", cursor: "pointer" }}
            onClick={(e) => {
              e.stopPropagation();
              setLogoOpen(true);
            }}
          />
        </div>
        <nav className="nav">
          <button className="btn ghost hideMobile" onClick={() => go("home")}>
            Accueil
          </button>
          {paid ? (
            <>
              <button className="btn ghost hideMobile" onClick={() => go("courses")}>
                Cours
              </button>
              <button className="btn ghost hideMobile" onClick={() => go("live")}>
                LIVE
              </button>
              <button className="btn ghost hideMobile" onClick={() => go("support")}>
                Accompagnement
              </button>
              <button className="btn secondary" onClick={() => go("dashboard")}>
                Mon espace
              </button>
              <button
                className="btn ghost"
                onClick={() => {
                  setUser(null);
                  setPaid(false);
                  go("home");
                }}
              >
                Quitter
              </button>
            </>
          ) : (
            <>
              <button className="btn ghost" onClick={() => go("login")}>
                Connexion
              </button>
              <button className="btn primary" onClick={() => go("signup")}>
                Créer un compte
              </button>
            </>
          )}
        </nav>
      </header>
      {page === "home" && (
        <main className="shell">
          <section className="hero">
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "18px",
                  marginBottom: "30px",
                }}
              >
                <Image
                  src="/logo/DG.png"
                  alt="Portrait du fondateur"
                  width={92}
                  height={92}
                  style={{
                    width: "92px",
                    height: "92px",
                    borderRadius: "50%",
                    objectFit: "cover",
                    objectPosition: "center 14%",
                    border: "2px solid #dbeafe",
                    background: "#e7efff",
                    cursor: "pointer",
                  }}
                  onClick={() => setPhotoOpen(true)}
                />

                <div>
                  <div
                    style={{
                      fontWeight: 700,
                      color: "#172554",
                      marginBottom: "5px",
                    }}
                  >
                    Mot du fondateur
                  </div>

                  <div
                    style={{
                      fontStyle: "italic",
                      color: "#64748b",
                      lineHeight: 1.5,
                    }}
                  >
                    « Mieux parler,
                    <br />
                    c'est mieux s'intégrer. »
                  </div>
                </div>
              </div>

              <span className="eyebrow">Apprendre, progresser, être accompagné.</span>

              <h1>
                Apprendre une langue et construire un avenir.
              </h1>

              <p>
                Cours de français, cours d’allemand et accompagnement personnalisé pour réussir votre intégration, progresser et construire votre avenir.
              </p>

              <div className="actions">
                <button className="btn primary" onClick={() => go("signup")}>
                  Commencer à partir de 25 €
                </button>

                <button
                  className="btn secondary"
                  onClick={() =>
                    document.getElementById("services")?.scrollIntoView({ behavior: "smooth" })
                  }
                >
                  Découvrir les services
                </button>
              </div>
            </div>

            <div className="heroCard">
              <div
                style={{
                  fontSize: "14px",
                  opacity: 0.75,
                  marginBottom: "15px",
                }}
              >
                VOTRE PARCOURS
              </div>

              <h2
                style={{
                  fontSize: "30px",
                  lineHeight: 1.3,
                  marginBottom: "25px",
                }}
              >
                Un espace simple pour
                <br />
                progresser à votre rythme
              </h2>

              <button
                type="button"
                className="mini miniButton"
                onClick={() => {
                  setLanguage("Français");
                  go("courses");
                }}
              >
                <strong>🎬 Cours en vidéo</strong>
                Disponibles quand vous le souhaitez
              </button>

              <button
                type="button"
                className="mini miniButton"
                onClick={() => go("live")}
              >
                <strong>🎥 Sessions LIVE</strong>
                Échangez avec des professeurs en direct
              </button>

              <button
                type="button"
                className="mini miniButton"
                onClick={() => go("support")}
              >
                <strong>🤝 Accompagnement</strong>
                Un volontaire vous aide dans vos démarches
              </button>
            </div>
            </section>

            <section
            id="services"
            className="grid"
            style={{ marginTop: "60px" }}
            >
            <div className="card">
                <div
                style={{
                    width: "50px",
                    height: "50px",
                    borderRadius: "14px",
                    background: "#eef2ff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "24px",
                    marginBottom: "20px",
                }}
                >
                📚
                </div>

                <h3>Français et allemand</h3>

                <p className="muted">
                Des parcours organisés par niveau avec vidéos,
                exercices et documents.
                </p>
            </div>

            <div className="card">
                <div
                style={{
                    width: "50px",
                    height: "50px",
                    borderRadius: "14px",
                    background: "#eef2ff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "24px",
                    marginBottom: "20px",
                }}
                >
                💬
                </div>

                <h3>Cours en direct</h3>

                <p className="muted">
                Participez à des séances collectives
                et posez vos questions.
                </p>
            </div>

            <div className="card">
                <div
                style={{
                    width: "50px",
                    height: "50px",
                    borderRadius: "14px",
                    background: "#eef2ff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "24px",
                    marginBottom: "20px",
                }}
                >
                🧭
                </div>

                <h3>Aide personnalisée</h3>

                <p className="muted">
                Déposez une demande et suivez sa
                prise en charge par un volontaire.
                </p>
            </div>
            </section>

            <section style={{ marginTop: "80px" }}>
                <div
                    style={{
                    textAlign: "center",
                    marginBottom: "40px",
                    }}
                >
                    <span className="eyebrow">
                    NOS OFFRES
                    </span>

                    <h2
                    style={{
                        fontSize: "42px",
                        marginTop: "15px",
                    }}
                    >
                    Choisissez votre formule
                    </h2>

                    <p className="muted">
                    Des solutions adaptées à vos besoins et à votre rythme.
                    </p>
                </div>

                <div className="grid">
                    <div className="card">
                    <h3>Découverte</h3>

                    <div
                        style={{
                        fontSize: "42px",
                        fontWeight: "800",
                        color: "#2457d6",
                        margin: "20px 0",
                        }}
                    >
                        25 €
                    </div>

                    <p>✓ Accès aux cours</p>
                    <p>✓ Documents pédagogiques</p>
                    <p>✓ Progression personnelle</p>

                    <button
                        className="btn primary full"
                        onClick={() => go("signup")}
                    >
                        Commencer
                    </button>
                    </div>

                    <div
                    className="card"
                    style={{
                        border: "2px solid #2457d6",
                    }}
                    >
                    <h3>Standard</h3>

                    <div
                        style={{
                        fontSize: "42px",
                        fontWeight: "800",
                        color: "#2457d6",
                        margin: "20px 0",
                        }}
                    >
                        40 €
                    </div>

                    <p>✓ Cours complets</p>
                    <p>✓ Sessions LIVE</p>
                    <p>✓ Exercices avancés</p>

                    <button
                        className="btn primary full"
                        onClick={() => go("signup")}
                    >
                        Choisir
                    </button>
                    </div>

                    <div className="card">
                    <h3>Premium</h3>

                    <div
                        style={{
                        fontSize: "42px",
                        fontWeight: "800",
                        color: "#2457d6",
                        margin: "20px 0",
                        }}
                    >
                        50 €
                    </div>

                    <p>✓ Tout Standard</p>
                    <p>✓ Accompagnement individuel</p>
                    <p>✓ Priorité sur les demandes</p>

                    <button
                        className="btn primary full"
                        onClick={() => go("signup")}
                    >
                        Choisir
                    </button>
                    </div>
                </div>
                </section>


            {/* <div className="footer">
            <p>© 2026 Mara-Sprach Team</p>
            <p>Français • Allemand • Accompagnement</p>
            </div> */}
        </main>
        )}
      {page === "signup" && (
        <main className="shell">
          <form
            className="auth"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              setUser({ firstName: String(f.get("firstName")), email: String(f.get("email")) });
              go("payment");
            }}
          >
            <h1>Créer mon compte</h1>
            <div className="field">
              <label>Prénom</label>
              <input name="firstName" required />
            </div>
            <div className="field">
              <label>Adresse e-mail</label>
              <input name="email" type="email" required />
            </div>
            <div className="field">
              <label>Mot de passe</label>
              <input type="password" minLength={8} required />
            </div>
            <button className="btn primary full">Continuer</button>
          </form>
        </main>
      )}
      {page === "login" && (
        <main className="shell">
          <form
            className="auth"
            onSubmit={(e) => {
              e.preventDefault();
              setUser({ firstName: "Ibrahima" });
              setPaid(true);
              go("dashboard");
            }}
          >
            <h1>Connexion</h1>
            <div className="field">
              <label>E-mail</label>
              <input defaultValue="demo@ensemble.fr" />
            </div>
            <div className="field">
              <label>Mot de passe</label>
              <input type="password" defaultValue="prototype" />
            </div>
            <button className="btn primary full">Se connecter</button>
          </form>
        </main>
      )}
      {page === "payment" && (
        <main className="shell">
          <div className="auth">
            <h1>Activez votre accès</h1>
            <div className="price">10 €</div>
            <p className="muted">Paiement sécurisé par Stripe lorsque les clés sont configurées.</p>
            <button
              className="btn primary full"
              onClick={async () => {
                const r = await fetch("/api/checkout", { method: "POST" });
                if (r.ok) {
                  const d = await r.json();
                  if (d.url) location.href = d.url;
                  else {
                    setPaid(true);
                    go("dashboard");
                  }
                } else {
                  setPaid(true);
                  notify("Mode démo activé");
                  go("dashboard");
                }
              }}
            >
              Payer et activer
            </button>
          </div>
        </main>
      )}
      {page === "dashboard" && (
        <main className="shell">
          <h1>Bonjour {user?.firstName || "Ibrahima"} 👋</h1>
          <p className="muted">Reprenez votre apprentissage.</p>
          <div className="stats">
            <div className="stat">
              Progression<b>28 %</b>
            </div>
            <div className="stat">
              Leçons<b>4</b>
            </div>
            <div className="stat">
              LIVE<b>{registered.length}</b>
            </div>
            <div className="stat">
              Accès<b style={{ color: "#059669" }}>Actif</b>
            </div>
          </div>
          <div className="grid">{courses.map(card)}</div>
          <h2>Prochains LIVE</h2>
          <div className="card">{liveRows}</div>
        </main>
      )}
      {page === "courses" && (
        <main className="shell">
          <h1>Catalogue des cours</h1>
          <div className="tabs">
            {["Tous", "Français", "Allemand"].map((x) => (
              <button
                className={`btn tab ${language === x ? "active" : ""}`}
                onClick={() => setLanguage(x)}
                key={x}
              >
                {x}
              </button>
            ))}
          </div>
          <div className="grid">{visible.map(card)}</div>
        </main>
      )}
      {page === "course" && (
        <main className="shell">
          <button className="btn ghost" onClick={() => go("courses")}>
            ← Catalogue
          </button>
          <h1>{selected.title}</h1>
          <div className="livePanel">
            <div className="liveHeader">
              <div>
                <span className="liveBadge">EN DIRECT</span>
                <h2>{activeLive?.title || "Leçon 1 : Se présenter"}</h2>
              </div>
              <div className="liveMeta">
                <span className="liveDot" />
                {liveJoined ? `${liveParticipants.length + 1} participants` : `${liveParticipants.length} participants`}
              </div>
            </div>

            <div className="liveInfoBar">
              <div className="liveInfoItem">
                <span className="liveInfoLabel">Professeur</span>
                <strong>{activeLive?.teacher || "Sophie Martin"}</strong>
              </div>
              <div className="liveInfoItem">
                <span className="liveInfoLabel">Horaire</span>
                <strong>{activeLive?.date || "Jeudi 18:30"}</strong>
              </div>
              <div className="liveInfoItem linkItem">
                <span className="liveInfoLabel">Salle</span>
                <strong>{activeLive?.roomUrl || "https://meet.jit.si/MaraSprachA1Live"}</strong>
              </div>
            </div>

            <div className="videoConference tripleLayout">
              <div className="conferenceMainBlock">
                <div className="mainVideoCard">
                  <div className="speakerTag">Professeure • {activeLive?.teacher || "Sophie Martin"}</div>
                  <div className="talkingName">{activeLive?.teacher || "Sophie Martin"}</div>
                  <div className="conferenceControls">
                    <button
                      type="button"
                      className={`controlButton ${micOn ? "active" : "muted"}`}
                      aria-label={micOn ? "Mute" : "Unmute"}
                      onClick={() => {
                        setMicOn((v) => !v);
                        notify(micOn ? "Micro coupé" : "Micro réactivé");
                      }}
                    >
                      {micOn ? "🎤" : "🔇"}
                    </button>
                    <button
                      type="button"
                      className={`controlButton ${cameraOn ? "active" : "muted"}`}
                      aria-label={cameraOn ? "Désactiver caméra" : "Réactiver caméra"}
                      onClick={() => {
                        setCameraOn((v) => !v);
                        notify(cameraOn ? "Caméra désactivée" : "Caméra activée");
                      }}
                    >
                      {cameraOn ? "📷" : "🚫"}
                    </button>
                    <button
                      type="button"
                      className="controlButton exit"
                      aria-label="Quitter"
                      onClick={() => {
                        setLiveJoined(false);
                        notify("Vous avez quitté le live");
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <div className="miniVideoGrid">
                  {liveParticipants.map((name) => (
                    <div className="miniVideo" key={name}>
                      <span>{name}</span>
                    </div>
                  ))}
                  {liveJoined && (
                    <div className="miniVideo currentUser">
                      <span>{user?.firstName || "Vous"}</span>
                    </div>
                  )}
                </div>
              </div>

              <aside className="chatPanel">
                <div className="chatHeader">
                  <strong>Discussion</strong>
                  <button className="chatToggle" type="button" onClick={() => setChatOpen((v) => !v)}>
                    {chatOpen ? "−" : "+"}
                  </button>
                </div>
                {chatOpen && (
                  <>
                    <div className="chatMessages">
                      {liveMessages.map((m, index) => (
                        <div className={`chatMessage ${m.user === "Vous" ? "mine" : ""}`} key={`${m.user}-${index}`}>
                          <span className="chatUser">{m.user}</span>
                          <p>{m.text}</p>
                        </div>
                      ))}
                    </div>
                    <form
                      className="chatComposer"
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (!chatInput.trim()) return;
                        liveMessages.push({ user: "Vous", text: chatInput.trim() });
                        setChatInput("");
                        notify("Message envoyé");
                      }}
                    >
                      <input
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="Écrire au groupe..."
                      />
                      <button type="submit" className="btn primary">Envoyer</button>
                    </form>
                  </>
                )}
              </aside>

              <aside className="questionsPanel">
                <div className="chatHeader">
                  <strong>Questions</strong>
                  <span className="panelPill">3</span>
                </div>
                <div className="questionsList">
                  {liveQuestions.map((q, index) => (
                    <div className="questionItem" key={`${q.user}-${index}`}>
                      <div className="questionUser">{q.user}</div>
                      <div>{q.text}</div>
                    </div>
                  ))}
                </div>
                <div className="questionComposer">
                  <input
                    value={questionInput}
                    onChange={(e) => setQuestionInput(e.target.value)}
                    placeholder="Posez votre question..."
                  />
                  <button
                    type="button"
                    className="btn primary"
                    onClick={() => {
                      if (!questionInput.trim()) return;
                      liveQuestions.unshift({ user: "Vous", text: questionInput.trim() });
                      setQuestionInput("");
                      notify("Question envoyée");
                    }}
                  >
                    Envoyer
                  </button>
                </div>
              </aside>
            </div>

            <div className="liveActions">
              {!liveJoined ? (
                <button
                  className="btn primary"
                  onClick={() => joinLiveSession()}
                >
                  Rejoindre le live
                </button>
              ) : (
                <button
                  className="btn secondary"
                  onClick={() => {
                    setLiveJoined(false);
                    notify("Vous avez quitté le live");
                  }}
                >
                  Quitter le live
                </button>
              )}
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setChatOpen((v) => !v);
                  notify(chatOpen ? "Chat masqué" : "Chat affiché");
                }}
              >
                {chatOpen ? "Masquer le chat" : "Afficher le chat"}
              </button>
              <button type="button" className="btn ghost" onClick={copyLiveLink}>
                Copier le lien
              </button>
            </div>
          </div>
          <div className="card">
            <h2>Leçon 1 : Se présenter</h2>
            <p className="muted">Apprenez les expressions essentielles et participez à un échange live avec les autres étudiants.</p>
            <button className="btn primary" onClick={() => notify("Progression enregistrée")}>
              Marquer comme terminée
            </button>
          </div>
        </main>
      )}
      {page === "live" && (
        <main className="shell">
          <h1>Calendrier des LIVE</h1>
          <div className="card liveScheduleCard">
            {liveRows}
            <div className="liveJoinRow">
              <strong>Session active: {activeLive?.title || "À venir"}</strong>
              <button
                className="btn primary"
                onClick={() => {
                  const live = liveSessions[0] ?? activeLive;
                  setActiveLive(live);
                  setSelected(courses[0]);
                  setLiveJoined(true);
                  if (typeof window !== "undefined") {
                    window.open(live.roomUrl, "_blank", "noopener,noreferrer");
                  }
                  go("course");
                  notify("Vous êtes maintenant dans le live");
                }}
              >
                Rejoindre maintenant
              </button>
            </div>
          </div>
        </main>
      )}
      {page === "support" && (
        <main className="shell">
          <h1>Demande d'accompagnement</h1>
          <div className="card">
            {support ? (
              <>
                <h2>✓ Demande envoyée</h2>
                <p className="muted">En attente d'attribution à un volontaire.</p>
              </>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setSupport(true);
                  notify("Demande enregistrée");
                }}
              >
                <div className="field">
                  <label>Type</label>
                  <select>
                    <option>Démarches administratives</option>
                    <option>Aide numérique</option>
                    <option>Cours de français</option>
                    <option>Cours d'Allemand</option>
                    <option>Autres</option>
                  </select>
                </div>
                <div className="field">
                  <label>Objet</label>
                  <input required />
                </div>
                <div className="field">
                  <label>Description</label>
                  <textarea rows={6} required />
                </div>
                <button className="btn primary">Envoyer</button>
              </form>
            )}
          </div>
        </main>
      )}
      <div className="footer">
        <p>Par Mr.ALATA Ibrahima [© 2026 Mara-Sprach Team • Cours de (Français • Allemand) et Accompagnement]</p>
      </div>
      {toast && <div className="toast">{toast}</div>}
      {photoOpen && (
        <div className="photoModal" onClick={() => setPhotoOpen(false)}>
          <button
            className="closePhotoBtn"
            type="button"
            aria-label="Fermer l'image"
            onClick={() => setPhotoOpen(false)}
          >
            ×
          </button>
          <div className="photoModalCard" onClick={(e) => e.stopPropagation()}>
            <Image
              src="/logo/DG.png"
              alt="Portrait du fondateur agrandi"
              width={900}
              height={900}
              priority
              style={{
                width: "100%",
                maxWidth: "620px",
                height: "auto",
                borderRadius: "24px",
                objectFit: "cover",
                objectPosition: "center 10%",
                background: "#e7efff",
              }}
            />
          </div>
        </div>
      )}
      {logoOpen && (
        <div className="photoModal" onClick={() => setLogoOpen(false)}>
          <button
            className="closePhotoBtn"
            type="button"
            aria-label="Fermer le logo"
            onClick={() => setLogoOpen(false)}
          >
            ×
          </button>
          <div className="photoModalCard" onClick={(e) => e.stopPropagation()}>
            <Image
              src="/logo/logo1.png"
              alt="Logo Mara-Sprach-Team agrandi"
              width={900}
              height={900}
              priority
              style={{
                width: "100%",
                maxWidth: "760px",
                height: "auto",
                borderRadius: "24px",
                objectFit: "contain",
                background: "#ffffff",
                padding: "28px",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
