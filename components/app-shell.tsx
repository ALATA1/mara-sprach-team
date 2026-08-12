"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
type Course = {
  id: number;
  language: string;
  level: string;
  title: string;
  progress: number;
  lessons: number;
  color: string;
};
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
const lives = [
  { id: 1, title: "Conversation française A1", date: "Jeudi 18:30", teacher: "Sophie Martin" },
  { id: 2, title: "Deutsch sprechen A1", date: "Samedi 10:00", teacher: "Jonas Weber" },
];
export function AppShell() {
  const [page, setPage] = useState("home"),
    [user, setUser] = useState<{ firstName: string; email?: string } | null>(null),
    [paid, setPaid] = useState(false),
    [language, setLanguage] = useState("Tous"),
    [selected, setSelected] = useState(courses[0]),
    [registered, setRegistered] = useState<number[]>([]),
    [support, setSupport] = useState(false),
    [toast, setToast] = useState(""),
    [photoOpen, setPhotoOpen] = useState(false);
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
  const liveRows = lives.map((l) => {
    const on = registered.includes(l.id);
    return (
      <div className="live" key={l.id}>
        <div>
          <strong>{l.title}</strong>
          <div className="muted">
            {l.date} • {l.teacher}
          </div>
        </div>
        <button
          className={`btn ${on ? "secondary" : "primary"}`}
          onClick={() => {
            setRegistered((v) => (on ? v.filter((x) => x !== l.id) : [...v, l.id]));
            notify(on ? "Inscription annulée" : "Inscription confirmée");
          }}
        >
          {on ? "Inscrit ✓" : "S'inscrire"}
        </button>
      </div>
    );
  });
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
            style={{ width: "auto", height: "85px", objectFit: "contain" }}
          />
        </div>
        <nav className="nav">
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
          <div className="video liveSession" onClick={() => notify("Session en direct lancée")}>
            <span className="liveBadge">LIVE</span>
            <div className="teacherWindow">
              <div className="teacherName">Sophie Martin</div>
              <div className="teacherLabel">Professeure • Niveau A1</div>
            </div>
            <div className="studentGrid">
              {[
                "Amine",
                "Yasmina",
                "Lucas",
                "Leila",
                "Paul",
                "Noémie",
              ].map((name) => (
                <div className="studentChip" key={name}>
                  {name}
                </div>
              ))}
            </div>
            <div className="play" onClick={() => notify("Session en direct lancée")}>
              ▶
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
          <div className="card">{liveRows}</div>
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
    </div>
  );
}
