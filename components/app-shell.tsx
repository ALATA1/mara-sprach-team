"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { JitsiRoom } from "@/components/jitsi-room";
import { GermanPronunciationButton, GermanVoiceStatus } from "@/components/german-pronunciation";
import { coursePlans, isCoursePlanId, type CoursePlanId } from "@/lib/payments/plans";
import { directorBiography } from "@/lib/content/director-biography";
import {
  germanA1Curriculum as germanA1ProgramCurriculum,
  germanA1Program,
  germanA2Curriculum,
  germanA2Program,
  germanB1Curriculum,
  germanB1Program,
  type GermanCurriculum,
  type GermanProgram,
} from "@/lib/content/german-programs";

type Course = {
  id: number;
  language: string;
  level: string;
  title: string;
  progress: number;
  lessons: number;
  color: string;
  documents: { title: string; type: string; summary: string }[];
  quiz: { question: string; options: string[]; answer: string; explanation: string }[];
  curriculum?: GermanCurriculum;
};

type AccountRole = "beneficiary" | "teacher" | "volunteer" | "admin";
type Account = { id: string; firstName: string; email: string; role: AccountRole };
type ProtectedPage = "video-courses" | "live" | "courses" | "course" | "live-room" | "support" | "profile";
type TeacherCourse = { id: string; title: string; language: string; level: string; published: boolean };
type BillingSubscription = { plan_id: CoursePlanId; status: string; cancel_at_period_end: boolean };
type LearningRecord = {
  course_key: string;
  item_type: "lesson" | "quiz";
  item_key: string;
  score_percentage: number | null;
};
type SupportRequest = { id: string; type: string; subject: string; status: string; created_at: string };
type UserProfile = {
  first_name: string;
  last_name: string;
  phone: string | null;
  country: string | null;
  city: string | null;
  birth_date: string | null;
  preferred_language: "fr" | "de" | "en";
  german_level: string | null;
  email: string;
  avatar_url: string | null;
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

type UploadedCourseDocument = {
  id: string;
  course_key: string;
  title: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  public_url: string;
  created_at: string;
};

type VideoCourse = { title: string; url: string };

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

const isValidTeamsUrl = (value?: string) => {
  if (!value) return false;
  try {
    const url = new URL(value.trim());
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      (url.hostname === "teams.microsoft.com" || url.hostname === "teams.live.com")
    );
  } catch {
    return false;
  }
};

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const isValidJitsiUrl = (value?: string) => {
  if (!value) return false;
  const trimmed = value.trim();
  return /^https:\/\/meet\.jit\.si\//i.test(trimmed);
};

const normalizeMeetingUrl = (value?: string) => {
  if (typeof value !== "string") return JITSI_LIVE_URLS[0];
  const trimmed = value.trim();
  if (isValidGoogleMeetUrl(trimmed) || isValidTeamsUrl(trimmed) || isValidJitsiUrl(trimmed)) {
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

const germanA1Curriculum = {
  modules: [
    { id: 1, title: "Module 1 · Les bases de l’allemand", items: [{ type: "lesson", id: 1 }, { type: "quiz", id: 1 }, { type: "lesson", id: 2 }, { type: "quiz", id: 2 }] },
    { id: 2, title: "Module 2 · Saluer et communiquer au quotidien", items: [{ type: "lesson", id: 3 }, { type: "quiz", id: 3 }, { type: "lesson", id: 4 }, { type: "quiz", id: 4 }, { type: "lesson", id: 5 }, { type: "quiz", id: 5 }, { type: "lesson", id: 6 }, { type: "quiz", id: 6 }, { type: "lesson", id: 7 }, { type: "quiz", id: 7 }] },
    { id: 3, title: "Module 3 · Les bases de la grammaire allemande", items: [{ type: "lesson", id: 8 }, { type: "quiz", id: 8 }, { type: "lesson", id: 9 }, { type: "quiz", id: 9 }, { type: "lesson", id: 10 }, { type: "quiz", id: 10 }, { type: "quiz", id: 11 }] },
  ],
  lessons: [
    { id: 1, title: "Bienvenue et présentation du cours", duration: "8 min", objectives: ["Comprendre l’organisation du parcours A1", "Reconnaître les premières expressions allemandes"], explanation: ["Ce parcours vous accompagne des premiers sons allemands jusqu’à la présentation de soi. Chaque leçon introduit un objectif concret, des mots utiles et des exemples à réutiliser à l’oral.", "L’allemand s’écrit avec l’alphabet latin. Les noms prennent toujours une majuscule. Écoutez les sons, répétez à voix haute et apprenez les mots avec leur article quand il y en a un."], vocabulary: [{ word: "Deutsch", meaning: "allemand", pronunciation: "doïtch" }, { word: "die Sprache", meaning: "la langue", pronunciation: "di chpra-rhe" }, { word: "Willkommen", meaning: "bienvenue", pronunciation: "vil-kom-men" }], examples: [{ german: "Willkommen im Deutschkurs!", french: "Bienvenue au cours d’allemand !", note: "im = in dem, ici « au »" }, { german: "Ich lerne Deutsch.", french: "J’apprends l’allemand.", note: "Deutsch s’écrit avec une majuscule." }] },
    { id: 2, title: "Se présenter en allemand", duration: "12 min", objectives: ["Dire son nom et demander celui d’une personne", "Dire où l’on habite et quelles langues on parle"], explanation: ["Pour donner son nom, on emploie « Ich heiße… ». Dans un contexte informel, on demande « Wie heißt du? ». Pour demander poliment, on utilise « Wie heißen Sie? ».", "« Ich komme aus… » indique le pays d’origine et « Ich wohne in… » le lieu d’habitation. Les verbes et les noms de pays prennent des formes variables : apprenez les expressions comme des blocs."], vocabulary: [{ word: "heißen", meaning: "s’appeler", pronunciation: "haï-sen" }, { word: "kommen aus", meaning: "venir de / être originaire de", pronunciation: "ko-men aous" }, { word: "wohnen", meaning: "habiter", pronunciation: "vo-nen" }, { word: "die Sprache", meaning: "la langue", pronunciation: "chpra-rhe" }], examples: [{ german: "Guten Tag! Ich heiße Paul.", french: "Bonjour ! Je m’appelle Paul.", note: "Ich heiße + prénom" }, { german: "Woher kommst du? – Ich komme aus Frankreich.", french: "Tu viens d’où ? – Je viens de France.", note: "Woher = d’où" }, { german: "Ich spreche Französisch und ein bisschen Deutsch.", french: "Je parle français et un peu allemand.", note: "ein bisschen = un peu" }] },
    { id: 3, title: "Salutations et expressions courantes", duration: "10 min", objectives: ["Saluer selon le moment de la journée", "Prendre congé avec une formule adaptée"], explanation: ["Les salutations allemandes varient selon l’heure. « Guten Morgen » s’emploie le matin, « Guten Tag » pendant la journée et « Guten Abend » le soir. Dans une situation familière, « Hallo » convient à presque tout moment.", "Pour prendre congé, « Auf Wiedersehen » est poli et « Tschüss » est familier. En Autriche et dans le sud de l’Allemagne, vous entendrez souvent « Grüß Gott »."], vocabulary: [{ word: "Guten Morgen", meaning: "bonjour (le matin)", pronunciation: "gou-ten mor-guen" }, { word: "Guten Tag", meaning: "bonjour (la journée)", pronunciation: "gou-ten tak" }, { word: "Guten Abend", meaning: "bonsoir", pronunciation: "gou-ten a-bent" }, { word: "Auf Wiedersehen", meaning: "au revoir (poli)", pronunciation: "aouf vi-der-zé-en" }], examples: [{ german: "Guten Morgen, Frau Klein!", french: "Bonjour, Madame Klein !", note: "Formule polie le matin" }, { german: "Hallo, wie geht’s? – Gut, danke.", french: "Salut, ça va ? – Bien, merci.", note: "Wie geht’s? est la forme courante de Wie geht es dir?" }] },
    { id: 4, title: "Suite : salutations et expressions courantes", duration: "10 min", objectives: ["Demander comment va quelqu’un", "Répondre et utiliser des formules de politesse"], explanation: ["« Wie geht es dir? » s’adresse à une personne que l’on tutoie. « Wie geht es Ihnen? » est la forme de politesse. La réponse peut être « Gut, danke » (bien, merci) ou « Es geht » (ça va).", "« Bitte » signifie selon le contexte « s’il vous plaît », « je vous en prie » ou « voici ». « Danke » signifie merci. Ces mots courts sont essentiels dans les échanges quotidiens."], vocabulary: [{ word: "Wie geht es dir?", meaning: "Comment vas-tu ?", pronunciation: "vi guêt ès dir" }, { word: "Danke", meaning: "merci", pronunciation: "dan-keu" }, { word: "Bitte", meaning: "s’il vous plaît / de rien", pronunciation: "bi-teu" }, { word: "Entschuldigung", meaning: "excusez-moi", pronunciation: "ent-choul-di-goung" }], examples: [{ german: "Wie geht es Ihnen? – Sehr gut, danke.", french: "Comment allez-vous ? – Très bien, merci.", note: "Ihnen est la forme de politesse" }, { german: "Einen Kaffee, bitte. – Bitte schön.", french: "Un café, s’il vous plaît. – Voilà / je vous en prie.", note: "Bitte change de sens selon la situation" }] },
    { id: 5, title: "L’alphabet et la prononciation", duration: "15 min", objectives: ["Épeler son prénom", "Reconnaître les sons ä, ö, ü et ß"], explanation: ["L’alphabet allemand compte les 26 lettres latines, auxquelles s’ajoutent ä, ö, ü et ß. Le ß se prononce comme un s sourd. Les voyelles avec tréma sont des sons distincts : ne les remplacez pas par a, o ou u dans l’écrit.", "Pour épeler, dites « Wie schreibt man das? » (Comment cela s’écrit ?) puis donnez les noms des lettres. Le h après une voyelle allonge souvent celle-ci, comme dans « wohnen »."], vocabulary: [{ word: "ä", meaning: "son proche de è", pronunciation: "è" }, { word: "ö", meaning: "son entre eu et é", pronunciation: "eu lèvres arrondies" }, { word: "ü", meaning: "son u français", pronunciation: "i lèvres arrondies" }, { word: "ß", meaning: "s sourd", pronunciation: "ss" }], examples: [{ german: "Wie schreibt man deinen Namen?", french: "Comment écrit-on ton prénom ?", note: "schreiben = écrire" }, { german: "Müller", french: "Nom de famille Müller", note: "ü est différent de u" }, { german: "Straße", french: "rue", note: "ß se prononce ss" }] },
    { id: 6, title: "Les nombres en allemand", duration: "12 min", objectives: ["Compter de zéro à vingt", "Comprendre la construction des nombres de 21 à 99"], explanation: ["Les nombres de 0 à 12 sont à mémoriser. À partir de 13, beaucoup se terminent par « -zehn ». Pour les nombres de 21 à 99, l’allemand énonce d’abord l’unité, puis « und », puis la dizaine : 24 se dit « vierundzwanzig », littéralement quatre-et-vingt.", "Cette inversion est importante pour comprendre un numéro de téléphone, un prix ou un âge. Les dizaines rondes se terminent généralement par « -zig » : dreißig (30), vierzig (40), fünfzig (50)."], vocabulary: [{ word: "eins / zwei / drei", meaning: "un / deux / trois", pronunciation: "aïns / tsvaï / draï" }, { word: "zehn", meaning: "dix", pronunciation: "tséïn" }, { word: "zwanzig", meaning: "vingt", pronunciation: "tsvan-tsig" }, { word: "vierundzwanzig", meaning: "vingt-quatre", pronunciation: "fir-ount-tsvan-tsig" }], examples: [{ german: "Ich bin vierundzwanzig Jahre alt.", french: "J’ai vingt-quatre ans.", note: "Littéralement : je suis âgé de vingt-quatre ans." }, { german: "Meine Telefonnummer ist 0176…", french: "Mon numéro de téléphone est…", note: "Les chiffres d’un numéro se donnent séparément." }] },
    { id: 7, title: "Les jours et les dates", duration: "12 min", objectives: ["Nommer les jours de la semaine", "Demander et donner une date simple"], explanation: ["Les jours de la semaine sont masculins et prennent une majuscule : der Montag, der Dienstag, der Mittwoch, der Donnerstag, der Freitag, der Samstag et der Sonntag.", "Pour dire « le lundi », on utilise « am Montag ». Une date s’énonce souvent avec le jour ordinal : « heute ist der dritte Mai » (nous sommes le 3 mai). Apprenez d’abord les jours et les mois les plus courants."], vocabulary: [{ word: "der Montag", meaning: "lundi", pronunciation: "mon-tak" }, { word: "der Mittwoch", meaning: "mercredi", pronunciation: "mit-voh" }, { word: "der Freitag", meaning: "vendredi", pronunciation: "fraï-tak" }, { word: "heute", meaning: "aujourd’hui", pronunciation: "hoï-teu" }], examples: [{ german: "Wann hast du Deutschkurs? – Am Dienstag.", french: "Quand as-tu cours d’allemand ? – Mardi.", note: "am + jour de la semaine" }, { german: "Heute ist der dritte Mai.", french: "Nous sommes le 3 mai.", note: "der dritte = le troisième" }] },
    { id: 8, title: "Les pronoms personnels", duration: "12 min", objectives: ["Employer les pronoms sujets", "Choisir entre tutoiement et forme de politesse"], explanation: ["Les pronoms sujets sont ich (je), du (tu), er (il), sie (elle), es (il/elle neutre), wir (nous), ihr (vous pluriel familier), sie (ils/elles) et Sie (vous de politesse). Sie prend toujours une majuscule lorsqu’il signifie vous.", "En allemand, le pronom est généralement exprimé. « Du » s’utilise avec les proches et les enfants. « Sie » est la forme polie avec un inconnu, dans un contexte professionnel ou avec une personne que l’on vouvoie."], vocabulary: [{ word: "ich / du", meaning: "je / tu", pronunciation: "ikh / dou" }, { word: "er / sie / es", meaning: "il / elle / il ou elle neutre", pronunciation: "èr / zi / ès" }, { word: "wir / ihr", meaning: "nous / vous (pluriel familier)", pronunciation: "vir / ir" }, { word: "Sie", meaning: "vous (politesse)", pronunciation: "zi" }], examples: [{ german: "Ich bin Maria. Sie sind Herr Weber.", french: "Je suis Maria. Vous êtes Monsieur Weber.", note: "Sie de politesse prend une majuscule." }, { german: "Wir lernen Deutsch. Ihr lernt Französisch.", french: "Nous apprenons l’allemand. Vous apprenez le français.", note: "wir et ihr désignent plusieurs personnes." }] },
    { id: 9, title: "Le verbe sein (être)", duration: "14 min", objectives: ["Conjuguer sein au présent", "Se décrire et donner une information simple"], explanation: ["Sein est un verbe essentiel et irrégulier. Au présent : ich bin, du bist, er/sie/es ist, wir sind, ihr seid, sie/Sie sind. Il faut mémoriser ces formes, car elles ne suivent pas le modèle régulier.", "On utilise sein pour l’identité, l’origine, la profession et l’état. Comme en français, un adjectif attribut ne prend pas de terminaison : « Ich bin müde » (je suis fatigué)."], vocabulary: [{ word: "sein", meaning: "être", pronunciation: "zaïn" }, { word: "müde", meaning: "fatigué", pronunciation: "mu-deu" }, { word: "hier", meaning: "ici", pronunciation: "hir" }, { word: "der Student / die Studentin", meaning: "l’étudiant / l’étudiante", pronunciation: "chtou-dent / chtou-dentin" }], examples: [{ german: "Ich bin Student. Du bist freundlich.", french: "Je suis étudiant. Tu es sympathique.", note: "bin avec ich, bist avec du" }, { german: "Wir sind heute zu Hause.", french: "Nous sommes à la maison aujourd’hui.", note: "sind avec wir, sie et Sie" }] },
    { id: 10, title: "Le verbe haben (avoir)", duration: "14 min", objectives: ["Conjuguer haben au présent", "Parler de ce que l’on possède et de son entourage"], explanation: ["Haben signifie avoir. Au présent : ich habe, du hast, er/sie/es hat, wir haben, ihr habt, sie/Sie haben. Les formes du singulier du, er, sie et es perdent le b du radical.", "Contrairement au français, on exprime l’âge avec sein : « Ich bin 20 Jahre alt » (J’ai 20 ans). Haben sert à parler de ce que l’on possède, de sa famille et de certaines expressions : « Ich habe Zeit » (J’ai le temps)."], vocabulary: [{ word: "haben", meaning: "avoir", pronunciation: "ha-ben" }, { word: "die Zeit", meaning: "le temps", pronunciation: "tsaït" }, { word: "der Bruder", meaning: "le frère", pronunciation: "brou-der" }, { word: "das Buch", meaning: "le livre", pronunciation: "boukh" }], examples: [{ german: "Ich habe ein Buch. Du hast Zeit.", french: "J’ai un livre. Tu as le temps.", note: "habe avec ich, hast avec du" }, { german: "Sie hat zwei Brüder.", french: "Elle a deux frères.", note: "hat avec er, sie et es" }] },
  ],
  quizzes: [
    { id: 1, lessonId: 1, title: "Quiz 1 · Choix unique", mode: "single", question: "Que signifie « Willkommen im Deutschkurs » ?", options: ["Bienvenue au cours d’allemand", "Au revoir après le cours", "Je parle allemand"], answers: ["Bienvenue au cours d’allemand"], explanation: "Willkommen signifie bienvenue, et Deutschkurs signifie cours d’allemand." },
    { id: 2, lessonId: 2, title: "Quiz 2 · Choix unique", mode: "single", question: "Quelle phrase signifie « Je m’appelle Paul » ?", options: ["Ich heiße Paul.", "Ich komme Paul.", "Ich wohne Paul."], answers: ["Ich heiße Paul."], explanation: "Heißen signifie s’appeler. « Ich heiße Paul » veut dire « Je m’appelle Paul »." },
    { id: 3, lessonId: 3, title: "Quiz 3 · Choix unique", mode: "single", question: "Quelle salutation utilise-t-on le matin ?", options: ["Guten Abend", "Guten Morgen", "Auf Wiedersehen"], answers: ["Guten Morgen"], explanation: "Guten Morgen signifie bonjour le matin." },
    { id: 4, lessonId: 4, title: "Quiz 4 · Choix unique", mode: "single", question: "Comment demande-t-on poliment « Comment allez-vous ? » ?", options: ["Wie geht es Ihnen?", "Wie heißt du?", "Wo wohnen Sie?"], answers: ["Wie geht es Ihnen?"], explanation: "Ihnen est le pronom de politesse. « Wie geht es Ihnen? » signifie « Comment allez-vous ? »." },
    { id: 5, lessonId: 5, title: "Quiz 5 · Oui ou non", mode: "boolean", question: "La lettre ß se prononce comme un s sourd, comme dans « Straße ». Vrai ou faux ?", options: ["Vrai", "Faux"], answers: ["Vrai"], explanation: "Le ß, appelé Eszett, se prononce comme ss ou un s sourd." },
    { id: 6, lessonId: 6, title: "Quiz 6 · Choix multiples", mode: "multiple", question: "Sélectionnez les deux nombres écrits correctement en allemand.", options: ["21 : einundzwanzig", "34 : vierunddreißig", "21 : zwanzigeins", "34 : dreiundvierzig"], answers: ["21 : einundzwanzig", "34 : vierunddreißig"], explanation: "À partir de 21, on dit d’abord l’unité, puis und, puis la dizaine : ein-und-zwanzig, vier-und-dreißig." },
    { id: 7, lessonId: 7, title: "Quiz 7 · Oui ou non", mode: "boolean", question: "Pour dire « le lundi », on utilise « am Montag ». Vrai ou faux ?", options: ["Vrai", "Faux"], answers: ["Vrai"], explanation: "Am + jour exprime le jour où une action a lieu : am Montag, am Dienstag…" },
    { id: 8, lessonId: 8, title: "Quiz 8 · Choix unique", mode: "single", question: "Quel pronom allemand utilise-t-on pour vouvoyer une personne ?", options: ["du", "ihr", "Sie"], answers: ["Sie"], explanation: "Sie avec une majuscule est le pronom de politesse. Du est le tutoiement singulier." },
    { id: 9, lessonId: 9, title: "Quiz 9 · Plusieurs réponses correctes", mode: "multiple", question: "Quelles sont les formes correctes du verbe sein ?", options: ["ich bin", "du bist", "er sind", "wir sind"], answers: ["ich bin", "du bist", "wir sind"], explanation: "La conjugaison correcte est ich bin, du bist, er/sie/es ist, wir sind, ihr seid, sie/Sie sind." },
    { id: 10, lessonId: 10, title: "Quiz 10 · Oui ou non", mode: "boolean", question: "La phrase « Du hast ein Buch » signifie « Tu as un livre ». Vrai ou faux ?", options: ["Vrai", "Faux"], answers: ["Vrai"], explanation: "Hast est la forme de haben avec du, et ein Buch signifie un livre." },
    { id: 11, lessonId: 10, title: "Quiz 11 · Choix unique", mode: "single", question: "Complétez : Wir ___ heute Zeit.", options: ["hat", "haben", "hast"], answers: ["haben"], explanation: "Avec wir, haben garde sa forme complète : « Wir haben Zeit » (Nous avons le temps)." },
  ],
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
    documents: [
      { title: "Fiche vocabulaire : se présenter", type: "Vocabulaire", summary: "Les formules essentielles pour dire son nom, son origine et sa profession." },
      { title: "Dialogue de première rencontre", type: "Dialogue", summary: "Un échange simple pour faire connaissance et poser les premières questions." },
      { title: "Les verbes être et avoir", type: "Grammaire", summary: "Les conjugaisons indispensables pour parler de soi au présent." },
    ],
    quiz: [
      { question: "Quelle phrase permet de donner son prénom ?", options: ["Je m'appelle Amine.", "Je suis nom Amine.", "Je nomme Amine."], answer: "Je m'appelle Amine.", explanation: "On utilise « Je m'appelle » pour donner son prénom." },
      { question: "Complétez : Je viens ___ Maroc.", options: ["au", "du", "de la"], answer: "du", explanation: "On dit « venir du Maroc » : le nom du pays est masculin." },
    ],
  },
  {
    id: 2,
    language: "Français",
    level: "A2",
    title: "Communiquer au quotidien",
    progress: 10,
    lessons: 10,
    color: "#7c3aed",
    documents: [
      { title: "La ville et ses services", type: "Vocabulaire", summary: "Les mots utiles pour se repérer et trouver les services du quotidien." },
      { title: "Demander un renseignement", type: "Pratique orale", summary: "Des expressions pour demander un chemin, un prix ou un horaire." },
      { title: "Les verbes au présent", type: "Grammaire", summary: "Révision des verbes réguliers et des verbes fréquents irréguliers." },
    ],
    quiz: [
      { question: "Quelle formule est la plus naturelle pour demander l'heure ?", options: ["Vous avez l'heure ?", "Heure est-il ?", "Je demande l'heure."], answer: "Vous avez l'heure ?", explanation: "C'est une formule courante et polie pour demander l'heure." },
      { question: "Comment demander où se trouve la pharmacie ?", options: ["Où est la pharmacie ?", "Je suis la pharmacie.", "La pharmacie où ?"], answer: "Où est la pharmacie ?", explanation: "La structure « Où est… ? » permet de demander la localisation d'un lieu." },
    ],
  },
  {
    id: 3,
    language: "Allemand",
    level: "A1",
    title: "Allemand débutant – Niveau A1",
    progress: 0,
    lessons: 6,
    color: "#ea580c",
    documents: [
      { title: "Fiches de vocabulaire A1", type: "Vocabulaire", summary: "Mots et expressions des six chapitres, classés par situation." },
      { title: "Récapitulatif de grammaire A1", type: "Grammaire", summary: "sein, questions en W-, possessifs, accusatif, verbes séparables, können et indications de lieu." },
      { title: "Portfolio A1", type: "Portfolio", summary: "Présentations, dialogues et tâches personnelles à compléter au fil des chapitres." },
    ],
    quiz: [
      { question: "Comment dire « Je m'appelle Paul » en allemand ?", options: ["Ich heiße Paul.", "Ich bin heißen Paul.", "Ich komme Paul."], answer: "Ich heiße Paul.", explanation: "La tournure usuelle pour donner son nom est « Ich heiße… »." },
      { question: "Que signifie « Guten Morgen » ?", options: ["Bonsoir", "Bonjour (le matin)", "Au revoir"], answer: "Bonjour (le matin)", explanation: "« Guten Morgen » est la salutation utilisée le matin." },
    ],
    curriculum: germanA1ProgramCurriculum,
  },
  {
    id: 4,
    language: "Allemand",
    level: "A2",
    title: "Allemand intermédiaire – Niveau A2",
    progress: 0,
    lessons: 6,
    color: "#16847a",
    documents: [
      { title: "Fiches de vocabulaire A2", type: "Vocabulaire", summary: "Vêtements, santé, travail, logement, médias et voyages." },
      { title: "Récapitulatif de grammaire A2", type: "Grammaire", summary: "Adjectifs, comparatif, verbes modaux, subordonnées, prépositions et propositions relatives." },
      { title: "Portfolio A2", type: "Portfolio", summary: "Dialogues, courriers, formulaires et tâches de communication des six chapitres." },
    ],
    quiz: [
      { question: "Comment dit-on « Je postule parce que le poste m’intéresse » ?", options: ["Ich bewerbe mich, weil die Stelle interessant ist.", "Ich bewerbe mich, weil ist die Stelle interessant.", "Ich bewerbe mich, die Stelle weil interessant ist."], answer: "Ich bewerbe mich, weil die Stelle interessant ist.", explanation: "Dans une subordonnée introduite par weil, le verbe conjugué se place à la fin." },
      { question: "Complétez : Ich habe ein Zimmer, ___ sehr ruhig ist.", options: ["der", "die", "das"], answer: "das", explanation: "Zimmer est neutre : le pronom relatif au nominatif est das." },
    ],
    curriculum: germanA2Curriculum,
  },
  {
    id: 5,
    language: "Allemand",
    level: "B1",
    title: "Allemand indépendant – Niveau B1",
    progress: 0,
    lessons: germanB1Curriculum.lessons.length,
    color: "#28734a",
    documents: [
      { title: "Fiches de vocabulaire B1", type: "Vocabulaire", summary: "Expériences, vie collective, emploi, médias, environnement, santé et société." },
      { title: "Récapitulatif de grammaire B1", type: "Grammaire", summary: "Récit au passé, argumentation, infinitif avec zu, passif, Konjunktiv II et relatives au datif." },
      { title: "Portfolio B1", type: "Portfolio", summary: "Productions personnelles et tâches de communication des huit chapitres." },
    ],
    quiz: [],
    curriculum: germanB1Curriculum,
  },
];
export function AppShell() {
  const [page, setPage] = useState("home"),
    [user, setUser] = useState<Account | null>(null),
    [pendingProtectedPage, setPendingProtectedPage] = useState<ProtectedPage | null>(null),
    [paid, setPaid] = useState(false),
    [membershipActive, setMembershipActive] = useState(false),
    [billingSubscription, setBillingSubscription] = useState<BillingSubscription | null>(null),
    [authLoading, setAuthLoading] = useState(true),
    [authBusy, setAuthBusy] = useState(false),
    [billingBusy, setBillingBusy] = useState(false),
    [selectedPlan, setSelectedPlan] = useState<CoursePlanId>("discovery"),
    [authError, setAuthError] = useState(""),
    [authMessage, setAuthMessage] = useState(""),
    [pendingConfirmationEmail, setPendingConfirmationEmail] = useState(""),
    [signupAccountType, setSignupAccountType] = useState<"student" | "teacher" | "">(""),
    [teacherCourses, setTeacherCourses] = useState<TeacherCourse[]>([]),
    [language, setLanguage] = useState("Tous"),
    [selected, setSelected] = useState(courses[0]),
    [registered, setRegistered] = useState<string[]>([]),
    [liveRegistrationBusyId, setLiveRegistrationBusyId] = useState<string | null>(null),
    [liveRegistrationErrors, setLiveRegistrationErrors] = useState<Record<string, string>>({}),
    [supportRequests, setSupportRequests] = useState<SupportRequest[]>([]),
    [supportSent, setSupportSent] = useState(false),
    [supportType, setSupportType] = useState("Démarches administratives"),
    [supportSubject, setSupportSubject] = useState(""),
    [supportDescription, setSupportDescription] = useState(""),
    [supportSubmitting, setSupportSubmitting] = useState(false),
    [supportError, setSupportError] = useState(""),
    [profileData, setProfileData] = useState<UserProfile | null>(null),
    [profileLoading, setProfileLoading] = useState(false),
    [profileSaving, setProfileSaving] = useState(false),
    [profileBusy, setProfileBusy] = useState(false),
    [profileError, setProfileError] = useState(""),
    [profileMessage, setProfileMessage] = useState(""),
    [toast, setToast] = useState(""),
    [photoOpen, setPhotoOpen] = useState(false),
    [logoOpen, setLogoOpen] = useState(false),
    [servicesMenuOpen, setServicesMenuOpen] = useState(false),
    [aboutMenuOpen, setAboutMenuOpen] = useState(false),
    [accountMenuOpen, setAccountMenuOpen] = useState(false),
    [languageMenuOpen, setLanguageMenuOpen] = useState(false),
    [uiLanguage, setUiLanguage] = useState<"fr" | "de" | "en">("fr"),
    [cookieChoice, setCookieChoice] = useState<"all" | "necessary" | null>(null),
    [cookiePreferencesOpen, setCookiePreferencesOpen] = useState(false),
    [cookieReady, setCookieReady] = useState(false),
    [contactSubmitting, setContactSubmitting] = useState(false),
    [contactStatus, setContactStatus] = useState<{ type: "success" | "error"; message: string } | null>(null),
    [liveJoined, setLiveJoined] = useState(false),
    [liveLinkDrafts, setLiveLinkDrafts] = useState<Record<string, string>>({}),
    [liveLinkSavingId, setLiveLinkSavingId] = useState<string | null>(null),
    [liveLinkErrors, setLiveLinkErrors] = useState<Record<string, string>>({}),
    [activeCourseTab, setActiveCourseTab] = useState<"learning" | "documents">("learning"),
    [videoCourses, setVideoCourses] = useState<VideoCourse[]>([]),
    [videoCoursesLoading, setVideoCoursesLoading] = useState(false),
    [videoCoursesError, setVideoCoursesError] = useState(""),
    [courseDocuments, setCourseDocuments] = useState<UploadedCourseDocument[]>([]),
    [documentStorageAvailable, setDocumentStorageAvailable] = useState(false),
    [documentSetupMessage, setDocumentSetupMessage] = useState("Vérification de la configuration Supabase…"),
    [documentMissingVariables, setDocumentMissingVariables] = useState<string[]>([]),
    [documentAdminToken, setDocumentAdminToken] = useState(""),
    [documentTitle, setDocumentTitle] = useState(""),
    [documentFile, setDocumentFile] = useState<File | null>(null),
    [documentUploadError, setDocumentUploadError] = useState(""),
    [documentUploading, setDocumentUploading] = useState(false),
    [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({}),
    [quizSubmitted, setQuizSubmitted] = useState(false),
    [activeGermanLessonId, setActiveGermanLessonId] = useState(1),
    [activeGermanQuizId, setActiveGermanQuizId] = useState<number | null>(null),
    [germanQuizAnswers, setGermanQuizAnswers] = useState<Record<number, string[]>>({}),
    [germanQuizResults, setGermanQuizResults] = useState<Record<number, boolean>>({}),
    [quizScores, setQuizScores] = useState<Record<string, number>>({}),
    [learningSaveError, setLearningSaveError] = useState(""),
    [learningSaveBusy, setLearningSaveBusy] = useState(false),
    [completedGermanLessons, setCompletedGermanLessons] = useState<Record<number, number[]>>({}),
    [liveSessions, setLiveSessions] = useState<LiveSession[]>(defaultLiveSessions),
    [activeLive, setActiveLive] = useState<LiveSession>(defaultLiveSessions[0]);

  const loadAccount = async (supabaseUser: SupabaseUser, redirectAfterLoad = true): Promise<boolean> => {
    const client = createClient();
    if (!client) return false;

    const [{ data: profile }, { data: membership }, { data: activeSubscription }, { data: latestSubscription }] = await Promise.all([
      client.from("profiles").select("first_name, role").eq("id", supabaseUser.id).maybeSingle(),
      client.from("memberships").select("status").eq("user_id", supabaseUser.id).maybeSingle(),
      client.from("course_subscriptions").select("plan_id, status, cancel_at_period_end")
        .eq("user_id", supabaseUser.id).eq("status", "active").maybeSingle(),
      client.from("course_subscriptions").select("plan_id, status, cancel_at_period_end")
        .eq("user_id", supabaseUser.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    const validRoles: AccountRole[] = ["beneficiary", "teacher", "volunteer", "admin"];
    const profileRole = profile?.role;
    const role: AccountRole = validRoles.includes(profileRole) ? profileRole : "beneficiary";
    const account: Account = {
      id: supabaseUser.id,
      firstName: profile?.first_name || String(supabaseUser.user_metadata?.first_name ?? ""),
      email: supabaseUser.email ?? "",
      role,
    };

    setUser(account);
    const hasAccess = role === "teacher" || role === "admin" ||
      (membership?.status === "active" && activeSubscription?.status === "active");
    setMembershipActive(membership?.status === "active");
    setBillingSubscription(
      latestSubscription && isCoursePlanId(latestSubscription.plan_id)
        ? { ...latestSubscription, plan_id: latestSubscription.plan_id }
        : null,
    );
    setPaid(hasAccess);
    const [
      { data: liveRegistrations, error: liveRegistrationsError },
      { data: learningRecords, error: learningRecordsError },
      { data: supportRows, error: supportRowsError },
    ] = await Promise.all([
      client.from("live_registrations").select("live_session_id").eq("user_id", supabaseUser.id),
      client.from("student_learning_records")
        .select("course_key, item_type, item_key, score_percentage")
        .eq("user_id", supabaseUser.id),
      client.from("support_requests").select("id, type, subject, status, created_at")
        .eq("user_id", supabaseUser.id).order("created_at", { ascending: false }),
    ]);
    if (liveRegistrationsError) {
      console.error("Unable to load LIVE registrations", liveRegistrationsError);
      setLiveRegistrationErrors((errors) => ({
        ...errors,
        load: "Impossible de charger vos inscriptions LIVE.",
      }));
    } else {
      setRegistered((liveRegistrations ?? []).map((registration) => registration.live_session_id));
      setLiveRegistrationErrors({});
    }
    if (supportRowsError) {
      console.error("Unable to load support requests", supportRowsError);
      setSupportError("Impossible de charger vos demandes d’accompagnement.");
    } else {
      setSupportRequests((supportRows ?? []) as SupportRequest[]);
      setSupportSent((supportRows ?? []).length > 0);
      setSupportError("");
    }
    if (learningRecordsError) {
      console.error("Unable to load student learning records", learningRecordsError);
      setLearningSaveError("Impossible de charger votre progression enregistrée.");
    } else {
      const lessonRecords = (learningRecords ?? []).filter((record) => record.item_type === "lesson");
      const completedByCourse: Record<number, number[]> = {};
      for (const record of lessonRecords) {
        const courseId = Number(record.course_key.replace(/^course-/, ""));
        const lessonId = Number(record.item_key.replace(/^lesson-/, ""));
        if (!Number.isInteger(courseId) || !Number.isInteger(lessonId)) continue;
        completedByCourse[courseId] = [...(completedByCourse[courseId] ?? []), lessonId];
      }
      setCompletedGermanLessons(completedByCourse);
      setQuizScores(Object.fromEntries(
        (learningRecords ?? [])
          .filter((record) => record.item_type === "quiz" && record.score_percentage !== null)
          .map((record) => [`${record.course_key}:${record.item_key}`, record.score_percentage as number]),
      ));
      setGermanQuizResults(Object.fromEntries(
        (learningRecords ?? [])
          .filter((record) => record.item_type === "quiz" && record.item_key.startsWith("german-") && record.score_percentage !== null)
          .map((record) => [Number(record.item_key.slice("german-".length)), record.score_percentage === 100]),
      ));
      setLearningSaveError("");
    }

    if (role === "teacher") {
      const { data } = await client
        .from("courses")
        .select("id, title, language, level, published")
        .eq("teacher_id", supabaseUser.id)
        .order("created_at", { ascending: false });
      setTeacherCourses((data ?? []) as TeacherCourse[]);
    } else {
      setTeacherCourses([]);
    }

    if (redirectAfterLoad) {
      if (hasAccess) go("dashboard");
      else go("payment");
    }
    return hasAccess;
  };

  const signOut = async () => {
    const client = createClient();
    if (client) await client.auth.signOut();
    setUser(null);
    setPaid(false);
    setMembershipActive(false);
    setBillingSubscription(null);
    setTeacherCourses([]);
    setRegistered([]);
    setLiveRegistrationErrors({});
    setSupportRequests([]);
    setSupportSent(false);
    setSupportError("");
    setProfileData(null);
    setProfileError("");
    setProfileMessage("");
    setCompletedGermanLessons({});
    setGermanQuizResults({});
    setQuizScores({});
    setLearningSaveError("");
    go("home");
  };

  useEffect(() => {
    const client = createClient();
    if (!client) {
      setAuthLoading(false);
      return;
    }

    const parameters = new URLSearchParams(window.location.search);
    const isPasswordRecovery = parameters.get("auth") === "recovery";
    let active = true;
    const restoreSession = async () => {
      const { data: { user: supabaseUser } } = await client.auth.getUser();
      if (active && supabaseUser) {
        await loadAccount(supabaseUser, !isPasswordRecovery);
        if (active && isPasswordRecovery) go("password-reset");
      } else if (active && isPasswordRecovery) {
        setAuthError("Le lien de réinitialisation est invalide ou expiré. Demandez-en un nouveau.");
        go("login");
      }
      if (active) setAuthLoading(false);
    };
    void restoreSession();
    const { data: { subscription } } = client.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setUser(null);
        setPaid(false);
        setMembershipActive(false);
        setBillingSubscription(null);
        setTeacherCourses([]);
        setRegistered([]);
        setLiveRegistrationErrors({});
        setSupportRequests([]);
        setSupportSent(false);
        setSupportError("");
        setProfileData(null);
        setProfileError("");
        setProfileMessage("");
        setCompletedGermanLessons({});
        setGermanQuizResults({});
        setQuizScores({});
        setLearningSaveError("");
      }
    });

    if (parameters.get("auth") === "confirmation-error") {
      setAuthError("Le lien de confirmation est invalide ou expiré. Demandez un nouvel e-mail de confirmation.");
      go("login");
    }
    if (parameters.get("payment") === "confirmed") setToast("Paiement confirmé. Votre accès étudiant est activé.");
    if (parameters.get("payment") === "pending") setToast("Paiement en cours de confirmation. Votre accès sera activé dès que Stripe confirmera le règlement.");
    if (parameters.get("payment") === "refunded") setToast("Ce paiement a été remboursé. L’accès associé n’est plus actif.");
    if (parameters.get("payment") === "error") setAuthError("Le paiement n’a pas pu être confirmé. Contactez l’équipe avant de réessayer.");
    if (parameters.get("payment") === "cancelled") setAuthMessage("Paiement annulé. Aucun changement n’a été apporté à votre formule.");

    return () => {
      active = false;
      subscription.unsubscribe();
    };
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
    if (page !== "video-courses") return;

    let active = true;
    setVideoCoursesLoading(true);
    setVideoCoursesError("");
    fetch("/api/videos")
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Impossible de charger les cours vidéo.");
        return result.videos as VideoCourse[];
      })
      .then((videos) => {
        if (active) setVideoCourses(videos);
      })
      .catch((error: unknown) => {
        if (active) setVideoCoursesError(error instanceof Error ? error.message : "Impossible de charger les cours vidéo.");
      })
      .finally(() => {
        if (active) setVideoCoursesLoading(false);
      });

    return () => {
      active = false;
    };
  }, [page]);

  useEffect(() => {
    if (page !== "profile" || !user) return;
    let active = true;
    setProfileLoading(true);
    setProfileError("");
    fetch("/api/profile")
      .then(async (response) => {
        const result: { error?: string; profile?: UserProfile } = await response.json();
        if (!response.ok) throw new Error(result.error || "Impossible de charger votre profil.");
        if (!result.profile) throw new Error("Le serveur n’a pas renvoyé votre profil.");
        return result.profile;
      })
      .then((profile) => {
        if (!active) return;
        setProfileData({ ...profile, phone: profile.phone?.slice(0, 20) ?? null });
        setUiLanguage(profile.preferred_language);
        localStorage.setItem("mara-ui-language-v1", profile.preferred_language);
      })
      .catch((error: unknown) => {
        if (active) setProfileError(error instanceof Error ? error.message : "Impossible de charger votre profil.");
      })
      .finally(() => {
        if (active) setProfileLoading(false);
      });
    return () => {
      active = false;
    };
  }, [page, user]);

  useEffect(() => {
    let active = true;

    fetch("/api/course-documents")
      .then(async (response) => {
        if (!response.ok) throw new Error("Impossible de charger les documents.");
        return response.json();
      })
      .then((result) => {
        if (!active) return;
        setDocumentStorageAvailable(Boolean(result.configured));
        setDocumentSetupMessage(typeof result.message === "string" ? result.message : "La configuration des documents n’a pas pu être vérifiée.");
        setDocumentMissingVariables(Array.isArray(result.missingVariables) ? result.missingVariables : []);
        setCourseDocuments(Array.isArray(result.documents) ? result.documents : []);
      })
      .catch(() => {
        if (active) {
          setDocumentStorageAvailable(false);
          setDocumentSetupMessage("Impossible de contacter le serveur pour vérifier la bibliothèque documentaire.");
          setDocumentMissingVariables([]);
        }
      });

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
    try {
      const storedChoice = localStorage.getItem("mara-cookie-consent-v1");
      if (storedChoice === "all" || storedChoice === "necessary") setCookieChoice(storedChoice);
    } finally {
      setCookieReady(true);
    }
  }, []);

  useEffect(() => {
    const storedLanguage = localStorage.getItem("mara-ui-language-v1");
    if (storedLanguage === "fr" || storedLanguage === "de" || storedLanguage === "en") setUiLanguage(storedLanguage);
  }, []);

  useEffect(() => {
    document.documentElement.lang = uiLanguage;
  }, [uiLanguage]);

  const saveCookieChoice = (choice: "all" | "necessary") => {
    localStorage.setItem("mara-cookie-consent-v1", choice);
    setCookieChoice(choice);
    setCookiePreferencesOpen(false);
  };

  const submitContactMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setContactSubmitting(true);
    setContactStatus(null);
    const formData = new FormData(event.currentTarget);
    const form = event.currentTarget;

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(formData.entries())),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Impossible d’envoyer votre demande.");
      form.reset();
      setContactStatus({ type: "success", message: "Votre demande a bien été envoyée. Nous vous recontacterons dès que possible." });
    } catch (error) {
      setContactStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Une erreur est survenue. Vous pouvez nous appeler au +33 6 18 65 77 20.",
      });
    } finally {
      setContactSubmitting(false);
    }
  };
  const saveLearningRecord = async (
    courseKey: string,
    itemType: "lesson" | "quiz",
    itemKey: string,
    scorePercentage?: number,
  ) => {
    const response = await fetch("/api/learning/records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        courseKey,
        itemType,
        itemKey,
        ...(scorePercentage === undefined ? {} : { scorePercentage }),
      }),
    });
    const result: { error?: string } = await response.json();
    if (!response.ok) throw new Error(result.error || "Impossible d’enregistrer votre progression.");
  };
  const submitSupportRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSupportSubmitting(true);
    setSupportError("");
    try {
      const response = await fetch("/api/support-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: supportType, subject: supportSubject, description: supportDescription }),
      });
      const result: { error?: string; request?: SupportRequest } = await response.json();
      if (!response.ok) throw new Error(result.error || "Impossible d’envoyer votre demande.");
      const savedRequest = result.request;
      if (!savedRequest) throw new Error("La demande n’a pas été confirmée par le serveur.");
      setSupportRequests((requests) => [savedRequest, ...requests]);
      setSupportSent(true);
      setSupportSubject("");
      setSupportDescription("");
      notify("Demande enregistrée");
    } catch (error) {
      setSupportError(error instanceof Error ? error.message : "Impossible d’envoyer votre demande.");
    } finally {
      setSupportSubmitting(false);
    }
  };
  const go = (p: string) => {
      const protectedPage = (["video-courses", "live", "courses", "course", "live-room", "support", "profile"] as const)
        .find((route) => route === p);
      if (protectedPage) {
        if (authLoading) return;
        if (!user) {
          setPendingProtectedPage(protectedPage);
          setPage("login");
          scrollTo(0, 0);
          return;
        }
        if (protectedPage !== "support" && protectedPage !== "profile" && !paid && user.role !== "teacher" && user.role !== "admin") {
          setAuthMessage("Un abonnement mensuel actif est nécessaire pour accéder aux cours et aux LIVE.");
          setPage("payment");
          scrollTo(0, 0);
          return;
        }
      }
      setPage(p);
      scrollTo(0, 0);
    },
    startSignup = () => {
      setPendingProtectedPage(null);
      setSignupAccountType("");
      setAuthError("");
      setAuthMessage("");
      go("signup-profile");
    },
    notify = (m: string) => {
      setToast(m);
      setTimeout(() => setToast(""), 2200);
    },
    openBillingPortal = async () => {
      setBillingBusy(true);
      try {
        const response = await fetch("/api/billing/portal", { method: "POST" });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Le portail de facturation est indisponible.");
        if (!result.url) throw new Error("Stripe n’a pas renvoyé de lien de facturation.");
        window.location.assign(result.url);
      } catch (error) {
        notify(error instanceof Error ? error.message : "Impossible d’ouvrir vos factures.");
      } finally {
        setBillingBusy(false);
      }
    },
    visible = useMemo(
      () => (language === "Tous" ? courses : courses.filter((c) => c.language === language)),
      [language],
    );
  const germanCurriculum = selected.curriculum;
  const localizedText = (french: string, german: string, english: string) =>
    uiLanguage === "de" ? german : uiLanguage === "en" ? english : french;
  const selectedCompletedLessons = completedGermanLessons[selected.id] ?? [];
  const activeGermanLesson = germanCurriculum?.lessons.find((lesson) => lesson.id === activeGermanLessonId);
  const activeGermanQuiz = germanCurriculum?.quizzes.find((quiz) => quiz.id === activeGermanQuizId);
  const totalCourseLessons = courses.reduce((total, course) => total + course.lessons, 0);
  const completedCourseLessons = courses.reduce(
    (total, course) => total + (course.curriculum ? (completedGermanLessons[course.id] ?? []).length : Math.round((course.progress / 100) * course.lessons)),
    0,
  );
  const overallCourseProgress = Math.round((completedCourseLessons / totalCourseLessons) * 100);
  const card = (c: Course) => {
    const courseProgress = c.curriculum
      ? Math.round(((completedGermanLessons[c.id] ?? []).length / c.curriculum.lessons.length) * 100)
      : c.progress;

    return (
    <article className="card course" key={c.id}>
      <div className="cover" style={{ background: `linear-gradient(135deg,${c.color},#172554)` }}>
        <strong>{c.language}</strong>
        <span className="pill">{c.level}</span>
      </div>
      <div className="courseBody">
        <h3>{c.title}</h3>
        <span className="muted">{c.lessons} leçons</span>
        <div className="progress">
          <span style={{ width: `${courseProgress}%` }} />
        </div>
        <button
          className="btn secondary"
          onClick={() => {
            setSelected(c);
            setActiveLive(liveSessions.find((session) => session.course === c.language) ?? liveSessions[0]);
            setQuizAnswers({});
            setQuizSubmitted(false);
            setActiveGermanLessonId(1);
            setActiveGermanQuizId(null);
            setGermanQuizAnswers({});
            setGermanQuizResults({});
            setActiveCourseTab("learning");
            setDocumentTitle("");
            setDocumentFile(null);
            go("course");
          }}
        >
          {courseProgress ? "Continuer" : "Découvrir"}
        </button>
      </div>
    </article>
    );
  };
  const liveRows = liveSessions.map((l) => {
    const sessionKey = String(l.id);
    const on = registered.includes(sessionKey);
    const meetingUrlDraft = liveLinkDrafts[sessionKey] ?? (isValidTeamsUrl(l.roomUrl) ? l.roomUrl : "");
    return (
      <div className="live" key={String(l.id)}>
        <div>
          <strong>{l.title}</strong>
          <div className="muted">
            {l.date} • {l.teacher}
          </div>
          {(user?.role === "teacher" || user?.role === "admin") && (
            <form
              className="liveLinkEditor"
              onSubmit={async (event) => {
                event.preventDefault();
                if (!isValidTeamsUrl(meetingUrlDraft)) {
                  setLiveLinkErrors((errors) => ({ ...errors, [sessionKey]: "Collez un lien Microsoft Teams valide." }));
                  return;
                }
                if (!isUuid(sessionKey)) {
                  setLiveLinkErrors((errors) => ({
                    ...errors,
                    [sessionKey]: "Cette séance de démonstration n’est pas enregistrée dans Supabase.",
                  }));
                  return;
                }

                setLiveLinkSavingId(sessionKey);
                setLiveLinkErrors((errors) => ({ ...errors, [sessionKey]: "" }));
                try {
                  const response = await fetch("/api/live/meeting-link", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ sessionId: sessionKey, meetingUrl: meetingUrlDraft }),
                  });
                  const result: { error?: string; session?: { meeting_url?: string } } = await response.json();
                  if (!response.ok) throw new Error(result.error || "Impossible d’enregistrer le lien Teams.");
                  if (!result.session?.meeting_url) throw new Error("Supabase n’a pas confirmé l’enregistrement du lien.");

                  const savedUrl = result.session.meeting_url;
                  setLiveSessions((sessions) => sessions.map((session) =>
                    String(session.id) === sessionKey ? { ...session, roomUrl: savedUrl } : session,
                  ));
                  setActiveLive((session) =>
                    String(session.id) === sessionKey ? { ...session, roomUrl: savedUrl } : session,
                  );
                  setLiveLinkDrafts((drafts) => ({ ...drafts, [sessionKey]: savedUrl }));
                  notify("Lien Teams enregistré pour cette séance");
                } catch (error) {
                  const message = error instanceof Error ? error.message : "Une erreur inattendue a empêché l’enregistrement.";
                  setLiveLinkErrors((errors) => ({ ...errors, [sessionKey]: message }));
                } finally {
                  setLiveLinkSavingId(null);
                }
              }}
            >
              <label htmlFor={`teams-link-${sessionKey}`}>Lien Teams de cette séance</label>
              <div className="liveLinkEditorControls">
                <input
                  id={`teams-link-${sessionKey}`}
                  type="url"
                  value={meetingUrlDraft}
                  onChange={(event) => setLiveLinkDrafts((drafts) => ({ ...drafts, [sessionKey]: event.target.value }))}
                  placeholder="https://teams.live.com/meet/…"
                  required
                />
                <button type="submit" className="btn secondary" disabled={liveLinkSavingId === sessionKey}>
                  {liveLinkSavingId === sessionKey ? "Enregistrement…" : "Enregistrer"}
                </button>
              </div>
              {liveLinkErrors[sessionKey] && <p className="liveLinkError" role="alert">{liveLinkErrors[sessionKey]}</p>}
            </form>
          )}
        </div>
        <div className="liveActionsRow">
          <button
            className={`btn ${on ? "secondary" : "primary"}`}
            disabled={liveRegistrationBusyId === sessionKey || !isUuid(sessionKey) || !user}
            onClick={async () => {
              setLiveRegistrationBusyId(sessionKey);
              setLiveRegistrationErrors((errors) => ({ ...errors, [sessionKey]: "" }));
              try {
                const response = await fetch("/api/live/registrations", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ sessionId: sessionKey, action: on ? "cancel" : "register" }),
                });
                const result: { error?: string; registered?: boolean } = await response.json();
                if (!response.ok) throw new Error(result.error || "Impossible de mettre à jour l’inscription LIVE.");
                setRegistered((current) =>
                  result.registered
                    ? current.includes(sessionKey) ? current : [...current, sessionKey]
                    : current.filter((id) => id !== sessionKey),
                );
                notify(result.registered ? "Inscription confirmée" : "Inscription annulée");
              } catch (error) {
                setLiveRegistrationErrors((errors) => ({
                  ...errors,
                  [sessionKey]: error instanceof Error ? error.message : "Impossible de mettre à jour l’inscription LIVE.",
                }));
              } finally {
                setLiveRegistrationBusyId(null);
              }
            }}
          >
            {liveRegistrationBusyId === sessionKey ? "Enregistrement…" : on ? "Inscrit ✓" : "S'inscrire"}
          </button>
          {liveRegistrationErrors[sessionKey] && (
            <p className="authError" role="alert">{liveRegistrationErrors[sessionKey]}</p>
          )}
          <button
            className="btn ghost"
            onClick={() => {
              setActiveLive(l);
              setSelected(courses.find((course) => course.language === l.course) ?? courses[0]);
              go("live-room");
              openLiveRoom(l);
            }}
          >
            Rejoindre le cours
          </button>
        </div>
      </div>
    );
  });
  const openLiveRoom = (item: LiveSession) => {
    setActiveLive(item);
    setLiveJoined(false);
    notify("Connexion à la salle live");
  };

  const leaveLiveRoom = () => {
    setLiveJoined(false);
    go("live");
    notify("Vous avez quitté le live");
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
  const confirmationRedirectUrl = () => `${window.location.origin}/auth/callback?next=/`;
  const passwordRecoveryRedirectUrl = () =>
    `${window.location.origin}/auth/callback?next=${encodeURIComponent("/?auth=recovery")}`;
  const handleSignup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError("");
    setAuthMessage("");
    const client = createClient();
    if (!client) {
      setAuthError("Supabase Auth n’est pas configuré. Renseignez NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY.");
      return;
    }

    const values = new FormData(event.currentTarget);
    const firstName = String(values.get("firstName") ?? "").trim();
    const lastName = String(values.get("lastName") ?? "").trim();
    const email = String(values.get("email") ?? "").trim();
    const password = String(values.get("password") ?? "");
    setAuthBusy(true);
    try {
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            requested_account_type: signupAccountType,
          },
          emailRedirectTo: confirmationRedirectUrl(),
        },
      });
      if (error) throw error;

      setPendingConfirmationEmail(email);
      if (data.user && data.session) {
        if (signupAccountType === "teacher") {
          setAuthMessage("Votre demande de compte enseignant a été enregistrée. L’accès enseignant sera activé après validation par l’administration.");
          go("signup-confirmation");
        } else {
          await loadAccount(data.user);
        }
      } else {
        setAuthMessage(signupAccountType === "teacher"
          ? "Si cette adresse peut être inscrite, un e-mail de confirmation vient d’être envoyé. Confirmez-le ; la demande d’accès enseignant reste soumise à validation administrative."
          : "Si cette adresse peut être inscrite, un e-mail de confirmation vient d’être envoyé. Confirmez-la avant de vous connecter.");
        go("signup-confirmation");
      }
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "L’inscription a échoué. Réessayez.");
    } finally {
      setAuthBusy(false);
    }
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError("");
    setAuthMessage("");
    const client = createClient();
    if (!client) {
      setAuthError("Supabase Auth n’est pas configuré. Renseignez NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY.");
      return;
    }

    const values = new FormData(event.currentTarget);
    const email = String(values.get("email") ?? "").trim();
    const password = String(values.get("password") ?? "");
    setAuthBusy(true);
    try {
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) {
        if (error.code === "email_not_confirmed") {
          setPendingConfirmationEmail(email);
          setAuthMessage("L’adresse e-mail n’a pas encore été confirmée. Demandez un nouvel e-mail de confirmation.");
          go("signup-confirmation");
          return;
        }
        if (error.code === "invalid_credentials") {
          throw new Error("Adresse e-mail ou mot de passe incorrect. Utilisez « Mot de passe oublié ? » si nécessaire.");
        }
        throw error;
      }
      if (!data.user) throw new Error("Supabase n’a renvoyé aucun utilisateur après la connexion.");
      const destination = pendingProtectedPage;
      const hasCourseAccess = await loadAccount(data.user, !destination);
      if (destination) {
        setPendingProtectedPage(null);
        const accessNotRequired = destination === "support" || destination === "profile";
        setPage(accessNotRequired || hasCourseAccess ? destination : "payment");
        if (!accessNotRequired && !hasCourseAccess) setAuthMessage("Choisissez une formule mensuelle pour débloquer les cours et les LIVE.");
        scrollTo(0, 0);
      }
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "La connexion a échoué.");
    } finally {
      setAuthBusy(false);
    }
  };

  const requestPasswordReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError("");
    setAuthMessage("");
    const client = createClient();
    if (!client) {
      setAuthError("Supabase Auth n’est pas configuré. Vérifiez les variables Supabase du déploiement.");
      return;
    }

    const email = String(new FormData(event.currentTarget).get("email") ?? "").trim();
    setAuthBusy(true);
    try {
      const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: passwordRecoveryRedirectUrl(),
      });
      if (error) throw error;
      setAuthMessage("Si un compte existe pour cette adresse, un e-mail de réinitialisation a été envoyé.");
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Impossible d’envoyer l’e-mail de réinitialisation.");
    } finally {
      setAuthBusy(false);
    }
  };

  const updatePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError("");
    setAuthMessage("");
    const values = new FormData(event.currentTarget);
    const password = String(values.get("password") ?? "");
    const passwordConfirmation = String(values.get("passwordConfirmation") ?? "");
    if (password.length < 8) {
      setAuthError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (password !== passwordConfirmation) {
      setAuthError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    const client = createClient();
    if (!client) {
      setAuthError("Supabase Auth n’est pas configuré. Vérifiez les variables Supabase du déploiement.");
      return;
    }

    setAuthBusy(true);
    try {
      const { error } = await client.auth.updateUser({ password });
      if (error) throw error;
      await client.auth.signOut();
      setUser(null);
      setPaid(false);
      setAuthMessage("Mot de passe modifié. Vous pouvez maintenant vous connecter.");
      go("login");
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "La modification du mot de passe a échoué.");
    } finally {
      setAuthBusy(false);
    }
  };

  const resendConfirmation = async () => {
    const client = createClient();
    if (!client || !pendingConfirmationEmail) {
      setAuthError("Saisissez d’abord votre adresse e-mail dans le formulaire d’inscription.");
      return;
    }
    setAuthError("");
    setAuthMessage("");
    setAuthBusy(true);
    try {
      const { error } = await client.auth.resend({
        type: "signup",
        email: pendingConfirmationEmail,
        options: { emailRedirectTo: confirmationRedirectUrl() },
      });
      if (error) throw error;
      setAuthMessage("Si un compte non confirmé existe pour cette adresse, un nouvel e-mail a été envoyé.");
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Impossible de renvoyer l’e-mail de confirmation.");
    } finally {
      setAuthBusy(false);
    }
  };
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
            {localizedText("Accueil", "Startseite", "Home")}
          </button>
          <div
            className={`navDropdown ${aboutMenuOpen ? "open" : ""}`}
            onMouseEnter={() => setAboutMenuOpen(true)}
            onMouseLeave={() => setAboutMenuOpen(false)}
            onFocusCapture={() => setAboutMenuOpen(true)}
            onBlurCapture={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setAboutMenuOpen(false);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setAboutMenuOpen(false);
                event.currentTarget.querySelector<HTMLButtonElement>(".aboutTrigger")?.focus();
              }
            }}
          >
            <button
              type="button"
              className={`btn ghost hideMobile formationTrigger aboutTrigger ${["about", "contact", "pdg"].includes(page) ? "active" : ""}`}
              aria-expanded={aboutMenuOpen}
              onClick={() => setAboutMenuOpen(true)}
            >
              {localizedText("À propos", "Über uns", "About")}
            </button>
            <div className="formationMenu" aria-label={localizedText("Sous-menus À propos", "Untermenü Über uns", "About submenu")}>
              <button className={page === "pdg" ? "active" : ""} onClick={() => { setAboutMenuOpen(false); go("pdg"); }}>
                DGP Mara
              </button>
              <button className={page === "about" ? "active" : ""} onClick={() => { setAboutMenuOpen(false); go("about"); }}>
                {localizedText("Qui sommes-nous ?", "Wer wir sind", "Who we are")}
              </button>
              <button className={page === "contact" ? "active" : ""} type="button" onClick={() => { setAboutMenuOpen(false); go("contact"); }}>
                {localizedText("Contact", "Kontakt", "Contact")}
              </button>
            </div>
          </div>
          <div
            className={`navDropdown ${languageMenuOpen ? "open" : ""}`}
            onMouseEnter={() => setLanguageMenuOpen(true)}
            onMouseLeave={() => setLanguageMenuOpen(false)}
            onFocusCapture={() => setLanguageMenuOpen(true)}
            onBlurCapture={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setLanguageMenuOpen(false);
            }}
          >
            <button
              type="button"
              className="btn ghost hideMobile formationTrigger languageTrigger"
              aria-expanded={languageMenuOpen}
              aria-label={`${localizedText("Choisir la langue de l’application", "Sprache der Anwendung auswählen", "Choose the application language")}. ${localizedText("Langue actuelle", "Aktuelle Sprache", "Current language")} : ${uiLanguage === "fr" ? "Français" : uiLanguage === "de" ? "Deutsch" : "English"}`}
              onClick={() => setLanguageMenuOpen(true)}
            >
              Langue
            </button>
            <div className="formationMenu" aria-label={localizedText("Langue de l’application", "Sprache der Anwendung", "Application language")}>
              <button className={uiLanguage === "fr" ? "active" : ""} onClick={() => { setUiLanguage("fr"); localStorage.setItem("mara-ui-language-v1", "fr"); setLanguageMenuOpen(false); }}>
                Français
              </button>
              <button className={uiLanguage === "de" ? "active" : ""} onClick={() => { setUiLanguage("de"); localStorage.setItem("mara-ui-language-v1", "de"); setLanguageMenuOpen(false); }}>
                Deutsch
              </button>
              <button className={uiLanguage === "en" ? "active" : ""} onClick={() => { setUiLanguage("en"); localStorage.setItem("mara-ui-language-v1", "en"); setLanguageMenuOpen(false); }}>
                English
              </button>
            </div>
          </div>
          {user ? (
            <>
              <div
                className={`navDropdown ${servicesMenuOpen ? "open" : ""}`}
                onMouseEnter={() => setServicesMenuOpen(true)}
                onMouseLeave={() => setServicesMenuOpen(false)}
                onFocusCapture={() => setServicesMenuOpen(true)}
                onBlurCapture={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setServicesMenuOpen(false);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setServicesMenuOpen(false);
                    event.currentTarget.querySelector<HTMLButtonElement>(".servicesTrigger")?.focus();
                  }
                }}
              >
                <button
                  type="button"
                  className={`btn ghost formationTrigger servicesTrigger ${["courses", "programme-a1", "programme-a2", "programme-b1", "live", "profile", "support", "dashboard"].includes(page) ? "active" : ""}`}
                  aria-expanded={servicesMenuOpen}
                  onClick={() => setServicesMenuOpen((open) => !open)}
                >
                  {localizedText("Services", "Angebote", "Services")}
                </button>
                <div className="formationMenu servicesMenu" aria-label={localizedText("Services", "Angebote", "Services")}>
                  <button className={["courses", "programme-a1", "programme-a2", "programme-b1"].includes(page) ? "active" : ""} onClick={() => { setServicesMenuOpen(false); go("courses"); }}>
                    {localizedText("Formation", "Lernen", "Learning")}
                  </button>
                  <button className={page === "programme-a1" ? "active" : ""} onClick={() => { setServicesMenuOpen(false); go("programme-a1"); }}>
                    {localizedText("Niveau A1", "Niveau A1", "Level A1")}
                  </button>
                  <button className={page === "programme-a2" ? "active" : ""} onClick={() => { setServicesMenuOpen(false); go("programme-a2"); }}>
                    {localizedText("Niveau A2", "Niveau A2", "Level A2")}
                  </button>
                  <button className={page === "programme-b1" ? "active" : ""} onClick={() => { setServicesMenuOpen(false); go("programme-b1"); }}>
                    {localizedText("Niveau B1", "Niveau B1", "Level B1")}
                  </button>
                  {(paid || user.role === "teacher") && (
                    <button className={page === "live" ? "active" : ""} onClick={() => { setServicesMenuOpen(false); go("live"); }}>LIVE</button>
                  )}
                  <button className={page === "profile" ? "active" : ""} onClick={() => { setServicesMenuOpen(false); go("profile"); }}>
                    {localizedText("Mon profil", "Mein Profil", "My profile")}
                  </button>
                  <button className={page === "dashboard" ? "active" : ""} onClick={() => { setServicesMenuOpen(false); go(paid || user.role === "teacher" ? "dashboard" : "payment"); }}>
                    {user.role === "teacher" ? localizedText("Espace enseignant", "Lehrkraftbereich", "Teacher area") : paid ? localizedText("Espace étudiant", "Lernbereich", "Student area") : localizedText("Finaliser mon accès", "Zugang abschließen", "Complete my access")}
                  </button>
                  {(paid || user.role === "teacher") && (
                    <button className={page === "support" ? "active" : ""} onClick={() => { setServicesMenuOpen(false); go("support"); }}>
                      {localizedText("Accompagnement", "Begleitung", "Support")}
                    </button>
                  )}
                </div>
              </div>
              <button className="btn ghost" onClick={() => void signOut()}>{localizedText("Déconnexion", "Abmelden", "Sign out")}</button>
            </>
          ) : (
            <div
              className={`navDropdown ${accountMenuOpen ? "open" : ""}`}
              onMouseEnter={() => setAccountMenuOpen(true)}
              onMouseLeave={() => setAccountMenuOpen(false)}
              onFocusCapture={() => setAccountMenuOpen(true)}
              onBlurCapture={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setAccountMenuOpen(false);
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setAccountMenuOpen(false);
                  event.currentTarget.querySelector<HTMLButtonElement>(".accountTrigger")?.focus();
                }
              }}
            >
              <button
                type="button"
                className={`btn ghost hideMobile formationTrigger accountTrigger ${["login", "signup-profile", "signup"].includes(page) ? "active" : ""}`}
                aria-expanded={accountMenuOpen}
                onClick={() => setAccountMenuOpen(true)}
              >
                {localizedText("Compte", "Konto", "Account")}
              </button>
              <div className="formationMenu" aria-label={localizedText("Menu Compte", "Kontomenü", "Account menu")}>
                <button className={page === "login" ? "active" : ""} onClick={() => { setAccountMenuOpen(false); go("login"); }}>
                  {localizedText("Connexion", "Anmelden", "Sign in")}
                </button>
                <button className={page === "signup-profile" || page === "signup" ? "active" : ""} onClick={() => { setAccountMenuOpen(false); startSignup(); }}>
                  {localizedText("Créer un compte", "Konto erstellen", "Create account")}
                </button>
              </div>
            </div>
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
                  alt={localizedText("Portrait du fondateur", "Porträt des Gründers", "Founder portrait")}
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
                    {localizedText("Mot du fondateur", "Wort des Gründers", "A word from the founder")}
                  </div>

                  <div
                    style={{
                      fontStyle: "italic",
                      color: "#64748b",
                      lineHeight: 1.5,
                    }}
                  >
                    {uiLanguage === "fr" ? <>« Mieux parler,<br />c’est mieux s’intégrer. »</> : uiLanguage === "de" ? <>„Besser sprechen,<br />besser ankommen.“</> : <>“Speak better,<br />feel more at home.”</>}
                  </div>
                </div>
              </div>

              <span className="eyebrow">{localizedText("Apprendre, progresser, être accompagné.", "Lernen, Fortschritte machen, begleitet werden.", "Learn, grow, and get support.")}</span>

              <h1>
                {localizedText("Apprendre une langue et construire un avenir.", "Eine Sprache lernen und eine Zukunft aufbauen.", "Learn a language and build a future.")}
              </h1>

              <p>
                {localizedText("Cours de français, cours d’allemand et accompagnement personnalisé pour réussir votre intégration, progresser et construire votre avenir.", "Französisch- und Deutschkurse sowie persönliche Begleitung, damit Sie sich integrieren, Fortschritte machen und Ihre Zukunft gestalten können.", "French and German courses with personal support to help you settle in, make progress, and build your future.")}
              </p>

              <div className="actions">
                <button className="btn primary" onClick={startSignup}>
                  {localizedText("Commencer à partir de 25 €", "Ab 25 € starten", "Get started from €25")}
                </button>

                <button
                  className="btn secondary"
                  onClick={() =>
                    document.getElementById("services")?.scrollIntoView({ behavior: "smooth" })
                  }
                >
                  {localizedText("Découvrir les services", "Angebote entdecken", "Explore our services")}
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
                {localizedText("VOTRE PARCOURS", "IHR LERNWEG", "YOUR LEARNING PATH")}
              </div>

              <h2
                style={{
                  fontSize: "30px",
                  lineHeight: 1.3,
                  marginBottom: "25px",
                }}
              >
                {localizedText("Un espace simple pour", "Ein einfacher Ort, um", "A simple place to")}
                <br />
                {localizedText("progresser à votre rythme", "im eigenen Tempo zu lernen", "learn at your own pace")}
              </h2>

              <button
                type="button"
                className="mini miniButton"
                disabled={authLoading}
                onClick={() => {
                  go("video-courses");
                }}
              >
                <strong>🎬 {localizedText("Cours en vidéo", "Videokurse", "Video courses")}</strong>
                {localizedText("Disponibles quand vous le souhaitez", "Jederzeit verfügbar", "Available whenever you are")}
              </button>

              <button
                type="button"
                className="mini miniButton"
                disabled={authLoading}
                onClick={() => go("live")}
              >
                <strong>🎥 {localizedText("Sessions LIVE", "Live-Unterricht", "Live sessions")}</strong>
                {localizedText("Échangez avec des professeurs en direct", "Sprechen Sie live mit Lehrkräften", "Talk with teachers in real time")}
              </button>

              <button
                type="button"
                className="mini miniButton"
                onClick={() => go("support")}
              >
                <strong>🤝 {localizedText("Accompagnement", "Persönliche Begleitung", "Personal support")}</strong>
                {localizedText("Un volontaire vous aide dans vos démarches", "Freiwillige unterstützen Sie bei Ihren Anliegen", "A volunteer can help with your administrative steps")}
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
                // style={{
                //     width: "50px",
                //     height: "50px",
                //     borderRadius: "14px",
                //     background: "#eef2ff",
                //     display: "flex",
                //     alignItems: "center",
                //     justifyContent: "center",
                //     fontSize: "24px",
                //     marginBottom: "20px",
                // }}
                >
                
                </div>

                <h3> 📚 {localizedText("Français et allemand", "Französisch und Deutsch", "French and German")}</h3>

                <p className="muted">
                {localizedText("Des parcours organisés par niveau avec vidéos, exercices et documents.", "Lernpfade nach Niveau mit Videos, Übungen und Lernmaterialien.", "Level-based learning paths with videos, exercises, and resources.")}
                </p>
            </div>

            <div className="card">
                <div
                // style={{
                //     width: "50px",
                //     height: "50px",
                //     borderRadius: "14px",
                //     background: "#eef2ff",
                //     display: "flex",
                //     alignItems: "center",
                //     justifyContent: "center",
                //     fontSize: "24px",
                //     marginBottom: "20px",
                // }}
                >
                
                </div>

                <h3> 🎥 {localizedText("Cours en direct", "Live-Unterricht", "Live classes")}</h3>

                <p className="muted">
                {localizedText("Participez à des séances collectives et posez vos questions.", "Nehmen Sie an Gruppensitzungen teil und stellen Sie Ihre Fragen.", "Join group sessions and ask your questions.")}
                </p>
            </div>

            <div className="card">
                <div
                // style={{
                //     width: "50px",
                //     height: "50px",
                //     borderRadius: "14px",
                //     background: "#eef2ff",
                //     display: "flex",
                //     alignItems: "center",
                //     justifyContent: "center",
                //     fontSize: "24px",
                //     marginBottom: "20px",
                // }}
                >
                
                </div>

                <h3>🧭 {localizedText("Aide personnalisée", "Persönliche Unterstützung", "Personal guidance")}</h3>

                <p className="muted">
                {localizedText("Déposez une demande et suivez sa prise en charge par un volontaire.", "Stellen Sie eine Anfrage und verfolgen Sie die Unterstützung durch Freiwillige.", "Send a request and follow its progress with a volunteer.")}
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
                    {localizedText("NOS OFFRES", "UNSERE ANGEBOTE", "OUR PLANS")}
                    </span>

                    <h2
                    style={{
                        fontSize: "42px",
                        marginTop: "15px",
                    }}
                    >
                    {localizedText("Choisissez votre formule", "Wählen Sie Ihr Paket", "Choose your plan")}
                    </h2>

                    <p className="muted">
                    {localizedText("Des solutions adaptées à vos besoins et à votre rythme.", "Passende Angebote für Ihre Bedürfnisse und Ihr Tempo.", "Options suited to your needs and pace.")}
                    </p>
                </div>

                <div className="grid">
                    <div className="card">
                    <h3>{localizedText("Découverte", "Einstieg", "Starter")}</h3>

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

                    <p>✓ {localizedText("Accès aux cours", "Zugang zu den Kursen", "Course access")}</p>
                    <p>✓ {localizedText("Documents pédagogiques", "Lernmaterialien", "Learning resources")}</p>
                    <p>✓ {localizedText("Progression personnelle", "Persönlicher Lernfortschritt", "Personal progress tracking")}</p>

                    <button
                        className="btn primary full"
                        onClick={startSignup}
                    >
                        {localizedText("Commencer", "Starten", "Get started")}
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

                    <p>✓ {localizedText("Cours complets", "Vollständige Kurse", "Full courses")}</p>
                    <p>✓ {localizedText("Sessions LIVE", "Live-Sitzungen", "Live sessions")}</p>
                    <p>✓ {localizedText("Exercices avancés", "Fortgeschrittene Übungen", "Advanced exercises")}</p>

                    <button
                        className="btn primary full"
                        onClick={startSignup}
                    >
                        {localizedText("Choisir", "Auswählen", "Choose")}
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

                    <p>✓ {localizedText("Tout Standard", "Alle Standard-Leistungen", "Everything in Standard")}</p>
                    <p>✓ {localizedText("Accompagnement individuel", "Individuelle Begleitung", "One-to-one support")}</p>
                    <p>✓ {localizedText("Priorité sur les demandes", "Bevorzugte Bearbeitung von Anfragen", "Priority request handling")}</p>

                    <button
                        className="btn primary full"
                        onClick={startSignup}
                    >
                        {localizedText("Choisir", "Auswählen", "Choose")}
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
      {page === "about" && (
        <main className="shell aboutPage">
          <header className="aboutHero">
            <span className="liveInfoLabel">MARA-SPRACH TEAM</span>
            <h1>{localizedText("Apprendre, comprendre, avancer ensemble", "Lernen, verstehen und gemeinsam vorankommen", "Learn, understand, and move forward together")}</h1>
            <p>{localizedText("Mara-Sprach Team réunit des cours de français, une formation en allemand organisée par niveau et un accompagnement personnalisé. L’application aide chacun à mieux communiquer, gagner en autonomie et avancer dans ses projets.", "Mara-Sprach Team vereint Französischkurse, niveauorientierte Deutschkurse und persönliche Begleitung. Die Anwendung hilft dabei, besser zu kommunizieren, selbstständiger zu werden und eigene Ziele zu verfolgen.", "Mara-Sprach Team brings together French courses, level-based German learning, and personal support. The app helps people communicate with confidence, become more independent, and move forward with their plans.")}</p>
          </header>
          <section className="aboutSections">
            <article>
              <span className="liveInfoLabel">{localizedText("FORMATION EN ALLEMAND", "DEUTSCHKURSE", "GERMAN COURSES")}</span>
              <h2>{localizedText("Des cours pour progresser à chaque niveau", "Kurse für Fortschritte auf jedem Niveau", "Courses to help you progress at every level")}</h2>
              <p>{localizedText("La formation d’allemand s’adresse à différents niveaux : les parcours A1, A2 et B1 structurent une progression des premières bases vers une communication plus autonome. Chaque niveau associe des leçons, du vocabulaire en contexte, des explications de grammaire, des exercices, des quiz corrigés et un suivi de progression.", "Die Deutschkurse richten sich an verschiedene Niveaus: A1, A2 und B1 führen von den ersten Grundlagen zu einer selbstständigeren Kommunikation. Jedes Niveau umfasst Lektionen, Wortschatz im Kontext, Grammatikerklärungen, Übungen, korrigierte Quizze und Lernfortschritt.", "German courses are available at different levels. The A1, A2, and B1 paths build from the basics toward more independent communication. Each level combines lessons, contextual vocabulary, grammar explanations, exercises, reviewed quizzes, and progress tracking.")}</p>
              <p>{localizedText("Les dialogues et les mots peuvent être écoutés à voix haute pour travailler la compréhension et la prononciation. Les thèmes évoluent des présentations et situations courantes vers les échanges sociaux, les démarches et les situations professionnelles.", "Dialoge und einzelne Wörter können angehört werden, um Hörverständnis und Aussprache zu üben. Die Themen reichen von Vorstellungsrunden und Alltagssituationen bis zu sozialen Kontakten, Behördengängen und beruflichen Situationen.", "Listen to words and dialogues to practise listening and pronunciation. Topics progress from introductions and everyday situations to social conversations, administrative tasks, and workplace communication.")}</p>
            </article>
            <article>
              <span className="liveInfoLabel">{localizedText("ACCOMPAGNEMENT ADMINISTRATIF", "HILFE BEI BEHÖRDENGÄNGEN", "ADMINISTRATIVE SUPPORT")}</span>
              <h2>{localizedText("Un appui concret dans les démarches", "Konkrete Hilfe bei wichtigen Schritten", "Practical support with everyday administration")}</h2>
              <p>{localizedText("Comprendre un courrier, préparer un rendez-vous, remplir un formulaire ou effectuer une démarche en ligne peut être difficile lorsque la langue ou les outils numériques sont un obstacle. Mara-Sprach Team permet de demander un accompagnement adapté à sa situation.", "Briefe verstehen, Termine vorbereiten, Formulare ausfüllen oder Online-Anträge stellen: Sprachliche und digitale Hürden können solche Aufgaben erschweren. Bei Mara-Sprach Team können Sie Unterstützung anfragen, die zu Ihrer Situation passt.", "Understanding a letter, preparing for an appointment, completing a form, or using an online service can be difficult when language or digital skills are a barrier. Mara-Sprach Team lets you request support suited to your situation.")}</p>
              <p>{localizedText("Selon les disponibilités, un volontaire peut aider à clarifier les étapes, organiser les informations utiles et gagner en confiance, dans le respect de l’autonomie et de la confidentialité de chacun.", "Je nach Verfügbarkeit kann eine freiwillige Person die einzelnen Schritte erklären, wichtige Informationen ordnen und Sie dabei unterstützen, sicherer und selbstständiger zu werden.", "Subject to availability, a volunteer can help clarify the steps, organise useful information, and build confidence while respecting each person’s independence and privacy.")}</p>
            </article>
            <article>
              <span className="liveInfoLabel">{localizedText("APPRENDRE À SON RYTHME", "IM EIGENEN TEMPO LERNEN", "LEARN AT YOUR OWN PACE")}</span>
              <h2>{localizedText("Des ressources et des échanges", "Materialien und gemeinsamer Austausch", "Learning resources and live conversation")}</h2>
              <p>{localizedText("Les apprenants retrouvent leurs cours, exercices et documents dans un même espace, peuvent suivre leur progression et participer à des séances en direct. L’objectif est de relier l’apprentissage à des situations utiles de la vie quotidienne et de construire des acquis durables.", "Lernende finden Kurse, Übungen und Materialien an einem Ort, verfolgen ihre Fortschritte und können an Live-Terminen teilnehmen. So wird das Lernen mit Alltagssituationen verknüpft und nachhaltig gefestigt.", "Learners can access courses, exercises, and documents in one place, track their progress, and join live sessions. Learning is connected to useful everyday situations and lasting skills.")}</p>
            </article>
          </section>
          <button type="button" className="btn primary" onClick={() => go("contact")}>{localizedText("Nous contacter", "Kontakt aufnehmen", "Contact us")}</button>
        </main>
      )}
      {page === "pdg" && (
        <main className="shell directorPage">
          <section className="directorProfile">
            <div className="directorPortrait">
              <Image
                src="/logo/DG2.png"
                alt="Portrait d’Alassana Mara, directeur général"
                width={900}
                height={1230}
                priority
                sizes="(max-width: 700px) 100vw, 38vw"
              />
            </div>
            <div className="directorIntro">
              <span className="liveInfoLabel">MARA-SPRACH TEAM</span>
              <h1>{directorBiography.name}</h1>
              <p>{directorBiography.role}</p>
              <div className="directorIntroRule" />
              <p className="muted">« La réussite n’est pas une course. C’est une construction. »</p>
            </div>
          </section>
          <article className="directorBiography">
            {directorBiography.paragraphs.map((paragraph, index) => (
              <p className={index === 2 || index === 15 || index === 24 || index === 27 ? "biographyEmphasis" : ""} key={`${index}-${paragraph.slice(0, 24)}`}>
                {paragraph}
              </p>
            ))}
          </article>
        </main>
      )}
      {page === "contact" && (
        <main className="shell contactPage">
          <div className="contactIntro">
            <span className="liveInfoLabel">MARA-SPRACH TEAM</span>
            <h1>{localizedText("Contactez-nous", "Kontaktieren Sie uns", "Contact us")}</h1>
            <p>{localizedText("Présentez votre besoin de formation ou d’accompagnement. Les champs marqués d’un astérisque sont obligatoires.", "Beschreiben Sie, wobei Sie Unterstützung benötigen. Mit einem Stern markierte Felder sind Pflichtfelder.", "Tell us what kind of course or support you need. Fields marked with an asterisk are required.")}</p>
            <p>{localizedText("Vous pouvez aussi nous appeler au", "Sie erreichen uns auch telefonisch unter", "You can also call us at")} <a href="tel:+33618657720">+33 6 18 65 77 20</a>.</p>
          </div>
          <form className="contactForm" onSubmit={(event) => void submitContactMessage(event)}>
            <div className="contactFormGrid">
              <div className="field">
                <label htmlFor="contact-name">{localizedText("Nom complet", "Vollständiger Name", "Full name")} *</label>
                <input id="contact-name" name="fullName" autoComplete="name" maxLength={120} required />
              </div>
              <div className="field">
                <label htmlFor="contact-email">{localizedText("Adresse e-mail", "E-Mail-Adresse", "Email address")} *</label>
                <input id="contact-email" name="email" type="email" autoComplete="email" maxLength={254} required />
              </div>
              <div className="field">
                <label htmlFor="contact-phone">{localizedText("Téléphone", "Telefon", "Phone number")} *</label>
                <input id="contact-phone" name="phone" type="tel" autoComplete="tel" inputMode="tel" pattern="[0-9+(). -]{7,25}" maxLength={25} required />
              </div>
              <div className="field">
                <label htmlFor="contact-topic">{localizedText("Votre demande", "Ihr Anliegen", "Your request")} *</label>
                <select id="contact-topic" name="topic" required defaultValue="">
                  <option value="" disabled>{localizedText("Choisissez un sujet", "Bitte wählen Sie ein Thema", "Choose a topic")}</option>
                  <option value="Cours d’allemand">{localizedText("Cours d’allemand", "Deutschkurse", "German courses")}</option>
                  <option value="Accompagnement administratif">{localizedText("Accompagnement administratif", "Hilfe bei Behördengängen", "Administrative support")}</option>
                  <option value="Autre demande">{localizedText("Autre demande", "Sonstiges Anliegen", "Other request")}</option>
                </select>
              </div>
            </div>
            <div className="field">
              <label htmlFor="contact-subject">{localizedText("Objet", "Betreff", "Subject")} *</label>
              <input id="contact-subject" name="subject" maxLength={160} required />
            </div>
            <div className="field">
              <label htmlFor="contact-message">{localizedText("Votre message", "Ihre Nachricht", "Your message")} *</label>
              <textarea id="contact-message" name="message" rows={6} maxLength={5000} required />
            </div>
            <div className="contactHoneypot" aria-hidden="true">
              <label htmlFor="contact-website">Site web</label>
              <input id="contact-website" name="website" tabIndex={-1} autoComplete="off" />
            </div>
            <label className="contactConsent">
              <input name="privacyAccepted" type="checkbox" value="true" required />
              <span>{localizedText("J’accepte que mes coordonnées soient utilisées pour traiter cette demande et me recontacter à son sujet.", "Ich bin einverstanden, dass meine Angaben zur Bearbeitung dieser Anfrage und zur Kontaktaufnahme verwendet werden.", "I agree that my details may be used to process this request and contact me about it.")}</span>
            </label>
            <button className="btn primary" type="submit" disabled={contactSubmitting}>
              {contactSubmitting ? localizedText("Envoi en cours…", "Wird gesendet…", "Sending…") : localizedText("Envoyer ma demande", "Anfrage senden", "Send my request")}
            </button>
            {contactStatus && <p className={`contactStatus ${contactStatus.type}`} role="status">{contactStatus.message}</p>}
          </form>
        </main>
      )}
      {page === "video-courses" && (
        <main className="shell videoCoursesPage">
          <header className="videoCoursesHero">
            <span className="liveInfoLabel">MARA-SPRACH TEAM · APPRENDRE À SON RYTHME</span>
            <h1>Tous les cours en vidéo</h1>
            <p>Retrouvez vos leçons et lancez directement la vidéo de votre niveau.</p>
            <button className="btn ghost" type="button" onClick={() => go("home")}>Retour à l’accueil</button>
          </header>
          {videoCoursesLoading && <p className="videoCoursesNotice">Chargement des cours vidéo…</p>}
          {videoCoursesError && <p className="videoCoursesNotice error">{videoCoursesError}</p>}
          {!videoCoursesLoading && !videoCoursesError && videoCourses.length === 0 && (
            <p className="videoCoursesNotice">Aucun cours vidéo n’est disponible pour le moment.</p>
          )}
          <section className="videoCourseGrid" aria-label="Cours en vidéo">
            {videoCourses.map((video, index) => (
              <article className="videoCourseCard" key={video.url}>
                <div className="videoCourseCardHeader">
                  <span className="videoCourseNumber">{String(index + 1).padStart(2, "0")}</span>
                  <span className="videoCourseTag">COURS VIDÉO</span>
                  <h2>{video.title}</h2>
                  <p>Regardez la leçon à votre rythme</p>
                </div>
                <video controls preload="metadata" src={video.url} aria-label={video.title} />
              </article>
            ))}
          </section>
        </main>
      )}
      {(page === "programme-a1" || page === "programme-a2" || page === "programme-b1") && (() => {
        const program: GermanProgram = page === "programme-a1" ? germanA1Program : page === "programme-a2" ? germanA2Program : germanB1Program;
        return (
          <main className="shell germanProgramPage">
            <header className={`programHero programHero${program.level}`}>
              <div>
                <span className="liveInfoLabel">ALLEMAND · NIVEAU {program.level}</span>
                <h1>{program.title}</h1>
                <p>{program.description}</p>
                <span className="programSource">Programme de référence : {program.source}</span>
              </div>
              <div className="programChapterCount"><strong>{program.chapters.length}</strong><span>chapitres</span></div>
            </header>
            <section className="programChapterList" aria-label={`Chapitres du programme ${program.level}`}>
              {program.chapters.map((chapter, index) => (
                <article className="programChapter" key={chapter.title}>
                  <span className="programChapterNumber">{String(index + 1).padStart(2, "0")}</span>
                  <div className="programChapterBody">
                    <h2>{chapter.title}</h2>
                    <div className="programChapterColumns">
                      <div><h3>Thèmes</h3><ul>{chapter.topics.map((topic) => <li key={topic}>{topic}</li>)}</ul></div>
                      <div><h3>Grammaire</h3><ul>{chapter.grammar.map((rule) => <li key={rule}>{rule}</li>)}</ul></div>
                    </div>
                  </div>
                </article>
              ))}
            </section>
            <section className="programMaterials">
              <div>
                <span className="liveInfoLabel">RESSOURCES PÉDAGOGIQUES</span>
                <h2>Supports du parcours</h2>
                <p>Les leçons, dialogues, tâches portfolio et exercices sont organisés chapitre par chapitre dans le cours correspondant.</p>
              </div>
              <ul>{program.learningMaterials.map((material) => <li key={material}>{material}</li>)}</ul>
            </section>
            <div className="programActions">
              <button className="btn primary" onClick={() => {
                const course = courses.find((item) => item.language === "Allemand" && item.level === program.level);
                if (!course) return;
                setSelected(course);
                setActiveGermanLessonId(1);
                setActiveGermanQuizId(null);
                setActiveCourseTab("learning");
                go("course");
              }}>Ouvrir le cours {program.level}</button>
              <button className="btn ghost" onClick={() => go("courses")}>Voir le catalogue</button>
            </div>
          </main>
        );
      })()}
      {page === "signup-profile" && (
        <main className="shell signupProfilePage">
          <section className="auth signupProfilePanel">
            <h1>{localizedText("Sélectionnez votre profil", "Wählen Sie Ihr Profil", "Choose your profile")}</h1>
            <form onSubmit={(event) => { event.preventDefault(); if (signupAccountType) go("signup"); }}>
              <fieldset className="signupProfileChoices">
                <legend className="srOnly">{localizedText("Type de compte à créer", "Zu erstellender Kontotyp", "Account type to create")}</legend>
                <label className={`signupProfileOption ${signupAccountType === "student" ? "selected" : ""}`}>
                  <input
                    type="radio"
                    name="signupAccountType"
                    value="student"
                    checked={signupAccountType === "student"}
                    onChange={() => setSignupAccountType("student")}
                  />
                  <span><strong>{localizedText("ÉTUDIANT(E)", "LERNENDE(R)", "STUDENT")}</strong><small>{localizedText("Je souhaite suivre des cours ou une formation.", "Ich möchte Kurse oder eine Ausbildung besuchen.", "I want to take courses or training.")}</small></span>
                </label>
                <label className={`signupProfileOption ${signupAccountType === "teacher" ? "selected" : ""}`}>
                  <input
                    type="radio"
                    name="signupAccountType"
                    value="teacher"
                    checked={signupAccountType === "teacher"}
                    onChange={() => setSignupAccountType("teacher")}
                  />
                  <span><strong>{localizedText("ENSEIGNANT(E)", "LEHRKRAFT", "TEACHER")}</strong><small>{localizedText("Je souhaite proposer ou animer des cours.", "Ich möchte Kurse anbieten oder unterrichten.", "I want to offer or teach courses.")}</small></span>
                </label>
              </fieldset>
              <button className="btn primary full" type="submit" disabled={!signupAccountType}>{localizedText("Continuer", "Weiter", "Continue")}</button>
              <p className="muted authRoleNote">{localizedText("Les demandes de compte enseignant sont vérifiées et activées séparément par l’administration.", "Lehrkraftkonten werden von der Verwaltung geprüft und gesondert freigeschaltet.", "Teacher account requests are reviewed and activated separately by the administration.")}</p>
            </form>
          </section>
        </main>
      )}
      {page === "signup" && (
        <main className="shell">
          <form className="auth" onSubmit={handleSignup}>
            <h1>{signupAccountType === "teacher" ? localizedText("Créer mon compte enseignant", "Mein Lehrkraftkonto erstellen", "Create my teacher account") : localizedText("Créer mon espace étudiant", "Meinen Lernbereich erstellen", "Create my student account")}</h1>
            <div className="field">
              <label>{localizedText("Prénom", "Vorname", "First name")}</label>
              <input name="firstName" autoComplete="given-name" required />
            </div>
            <div className="field">
              <label>{localizedText("Nom", "Nachname", "Last name")}</label>
              <input name="lastName" autoComplete="family-name" required />
            </div>
            <div className="field">
              <label>{localizedText("Adresse e-mail", "E-Mail-Adresse", "Email address")}</label>
              <input name="email" type="email" autoComplete="email" required />
            </div>
            <div className="field">
              <label>{localizedText("Mot de passe", "Passwort", "Password")}</label>
              <input name="password" type="password" autoComplete="new-password" minLength={8} required />
            </div>
            {authError && <p className="authError" role="alert">{authError}</p>}
            {authMessage && <p className="authMessage" role="status">{authMessage}</p>}
            <button className="btn primary full" disabled={authBusy}>{authBusy ? localizedText("Création du compte…", "Konto wird erstellt…", "Creating account…") : signupAccountType === "teacher" ? localizedText("Envoyer ma demande de compte enseignant", "Antrag auf ein Lehrkraftkonto senden", "Submit teacher account request") : localizedText("Créer mon compte étudiant", "Mein Lernkonto erstellen", "Create my student account")}</button>
            {signupAccountType === "teacher" && <p className="muted authRoleNote">{localizedText("L’accès enseignant sera activé après vérification par l’administration.", "Der Zugang für Lehrkräfte wird nach Prüfung durch die Verwaltung freigeschaltet.", "Teacher access is activated after administrative review.")}</p>}
          </form>
        </main>
      )}
      {page === "login" && (
        <main className="shell">
          <form className="auth" onSubmit={handleLogin}>
            <h1>Connexion</h1>
            <div className="field">
              <label>E-mail</label>
              <input name="email" type="email" autoComplete="email" required />
            </div>
            <div className="field">
              <label>Mot de passe</label>
              <input name="password" type="password" autoComplete="current-password" required />
            </div>
            {authError && <p className="authError" role="alert">{authError}</p>}
            {authMessage && <p className="authMessage" role="status">{authMessage}</p>}
            <button className="btn primary full" disabled={authBusy}>{authBusy ? "Connexion…" : "Se connecter"}</button>
            <div className="authLinks">
              <button type="button" className="authTextLink" onClick={() => { setAuthError(""); setAuthMessage(""); go("forgot-password"); }}>Mot de passe oublié ?</button>
              <button type="button" className="authTextLink" onClick={() => { setAuthError(""); setAuthMessage(""); go("forgot-identifier"); }}>Identifiant oublié ?</button>
            </div>
          </form>
        </main>
      )}
      {page === "forgot-password" && (
        <main className="shell">
          <form className="auth" onSubmit={requestPasswordReset}>
            <h1>Réinitialiser le mot de passe</h1>
            <p className="muted">Saisissez l’adresse e-mail associée à votre compte. Si un compte existe, vous recevrez un lien de réinitialisation.</p>
            <div className="field">
              <label htmlFor="reset-email">Adresse e-mail</label>
              <input id="reset-email" name="email" type="email" autoComplete="email" required />
            </div>
            {authError && <p className="authError" role="alert">{authError}</p>}
            {authMessage && <p className="authMessage" role="status">{authMessage}</p>}
            <button className="btn primary full" disabled={authBusy}>{authBusy ? "Envoi…" : "Envoyer le lien"}</button>
            <div className="authLinks">
              <button type="button" className="authTextLink" onClick={() => go("login")}>Retour à la connexion</button>
            </div>
          </form>
        </main>
      )}
      {page === "password-reset" && (
        <main className="shell">
          <form className="auth" onSubmit={updatePassword}>
            <h1>Choisir un nouveau mot de passe</h1>
            <div className="field">
              <label htmlFor="new-password">Nouveau mot de passe</label>
              <input id="new-password" name="password" type="password" autoComplete="new-password" minLength={8} required />
            </div>
            <div className="field">
              <label htmlFor="password-confirmation">Confirmer le mot de passe</label>
              <input id="password-confirmation" name="passwordConfirmation" type="password" autoComplete="new-password" minLength={8} required />
            </div>
            {authError && <p className="authError" role="alert">{authError}</p>}
            <button className="btn primary full" disabled={authBusy}>{authBusy ? "Modification…" : "Modifier le mot de passe"}</button>
          </form>
        </main>
      )}
      {page === "forgot-identifier" && (
        <main className="shell">
          <section className="auth">
            <h1>Identifiant oublié ?</h1>
            <p className="muted">Votre identifiant est l’adresse e-mail utilisée lors de la création du compte. Essayez les adresses e-mail que vous utilisez habituellement.</p>
            <p className="muted">Si vous n’avez plus accès à cette adresse ou ne vous en souvenez pas, contactez l’équipe Mara par votre canal habituel. Pour protéger les comptes, nous ne pouvons pas rechercher une adresse à partir d’un nom.</p>
            <button type="button" className="btn primary full" onClick={() => go("login")}>Retour à la connexion</button>
          </section>
        </main>
      )}
      {page === "signup-confirmation" && (
        <main className="shell">
          <section className="auth confirmationPanel">
            <span className="liveInfoLabel">VÉRIFICATION DE L’ADRESSE</span>
            <h1>Confirmez votre e-mail</h1>
            <p className="muted">Consultez votre boîte de réception{pendingConfirmationEmail ? ` à l’adresse ${pendingConfirmationEmail}` : ""}. Ouvrez le lien reçu pour confirmer votre compte ; {signupAccountType === "teacher" ? "votre demande d’accès enseignant sera ensuite étudiée par l’administration." : "vous serez ensuite redirigé vers l’activation de votre espace étudiant."}</p>
            <p className="muted">Pensez aussi aux dossiers courrier indésirable et promotions. L’envoi du message de confirmation est assuré par Supabase Auth et doit être activé dans les paramètres Email du projet.</p>
            {authError && <p className="authError" role="alert">{authError}</p>}
            {authMessage && <p className="authMessage" role="status">{authMessage}</p>}
            <div className="actions">
              <button className="btn primary" onClick={resendConfirmation} disabled={authBusy || !pendingConfirmationEmail}>
                {authBusy ? "Envoi…" : "Renvoyer l’e-mail"}
              </button>
              <button className="btn ghost" onClick={() => go("login")}>Aller à la connexion</button>
            </div>
          </section>
        </main>
      )}
      {page === "payment" && (
        <main className="shell">
          <div className="auth billingPanel">
            <h1>Choisissez votre formule de cours</h1>
            <p className="muted">{user?.email ? `Compte confirmé : ${user.email}. ` : ""}L’adhésion de 10 € est réglée une seule fois avec le premier mois si elle n’a pas encore été payée.</p>
            <fieldset className="billingPlanChoices">
              <legend>Formules mensuelles</legend>
              {(["discovery", "standard", "premium"] as const).map((planId) => {
                const plan = coursePlans[planId];
                return (
                  <label className={`billingPlanOption ${selectedPlan === planId ? "selected" : ""}`} key={planId}>
                    <input
                      type="radio"
                      name="course-plan"
                      value={planId}
                      checked={selectedPlan === planId}
                      onChange={() => setSelectedPlan(planId)}
                    />
                    <span>
                      <strong>{plan.name}</strong>
                      <small>Abonnement mensuel · résiliable depuis votre espace</small>
                    </span>
                    <b>{plan.amountCents / 100} €<small>/ mois</small></b>
                  </label>
                );
              })}
            </fieldset>
            <p className="billingTotal">
              Premier paiement : <strong>{coursePlans[selectedPlan].amountCents / 100 + (membershipActive ? 0 : 10)} €</strong>
              {membershipActive ? " · adhésion déjà réglée" : " · formule + adhésion unique de 10 €"}
            </p>
            <p className="paymentMethodsNote">Stripe émet automatiquement les factures mensuelles. Vous pourrez gérer la formule, son annulation et vos factures depuis votre espace.</p>
            <section className="paymentMethods" aria-labelledby="payment-methods-title">
              <h2 id="payment-methods-title">Choisissez votre moyen de paiement</h2>
              <ul className="paymentMethodsList">
                <li><span aria-hidden="true">💳</span> Carte bancaire</li>
                <li><span aria-hidden="true"></span> Apple Pay</li>
                <li><span aria-hidden="true">G</span> Google Pay</li>
                <li><span aria-hidden="true">🇪🇺</span> Wero</li>
                <li><span aria-hidden="true">🅿️</span> PayPal</li>
                <li><span aria-hidden="true">🏦</span> Virement bancaire</li>
              </ul>
              <p className="paymentMethodsNote">Les moyens effectivement proposés dépendent de leur disponibilité dans le paiement sécurisé Stripe.</p>
            </section>
            {authError && <p className="authError" role="alert">{authError}</p>}
            {authMessage && <p className="authMessage" role="status">{authMessage}</p>}
            <button
              className="btn primary full"
              disabled={authBusy}
              onClick={async () => {
                setAuthBusy(true);
                setAuthError("");
                try {
                  const response = await fetch("/api/checkout", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ planId: selectedPlan }),
                  });
                  const result = await response.json();
                  if (!response.ok) throw new Error(result.error || "Le paiement n’a pas pu être préparé.");
                  if (!result.url) throw new Error("Stripe n’a pas renvoyé de lien de paiement.");
                  window.location.assign(result.url);
                } catch (error) {
                  setAuthError(error instanceof Error ? error.message : "Le paiement a échoué.");
                } finally {
                  setAuthBusy(false);
                }
              }}
            >
              {authBusy ? "Préparation du paiement…" : "Continuer vers le paiement sécurisé"}
            </button>
            {billingSubscription && (
              <button className="btn ghost full billingManageButton" disabled={billingBusy} onClick={() => void openBillingPortal()}>
                {billingBusy ? "Ouverture…" : "Gérer mes factures ou mon abonnement"}
              </button>
            )}
          </div>
        </main>
      )}
      {page === "profile" && (
        <main className="shell profilePage">
          <section className="profileHero">
            <div className="profileHeroIcon" aria-hidden="true">✦</div>
            <div>
              <span className="profileEyebrow">ESPACE PERSONNEL</span>
              <h1>Mon profil</h1>
              <p>Vos informations, votre parcours, votre espace. Personnalisez votre profil Mara-Sprach.</p>
            </div>
            <div className="profilePrivacyPill"><span aria-hidden="true">●</span> Privé et sécurisé</div>
          </section>
          {profileLoading && <p role="status">Chargement du profil…</p>}
          {profileError && <p className="authError" role="alert">{profileError}</p>}
          {profileData && (
            <section className="card profileCard">
              <div className="profileCardHeading">
                <span className="profileSectionIcon" aria-hidden="true">👋</span>
                <div>
                  <h2>Mes informations</h2>
                  <p>Gardez vos coordonnées à jour pour profiter pleinement de vos cours.</p>
                </div>
              </div>
              <div className="profilePhotoEditor">
                {profileData.avatar_url
                  ? <Image src={profileData.avatar_url} alt="Photo de profil" width={96} height={96} unoptimized className="profileAvatar" />
                  : <div className="profileAvatar profileAvatarPlaceholder" aria-label="Aucune photo de profil">{profileData.first_name.slice(0, 1).toUpperCase() || "?"}</div>}
                <div className="profilePhotoContent">
                  <strong>Votre photo</strong>
                  <p>Choisissez une image nette pour personnaliser votre espace.</p>
                  <input
                    id="profile-avatar"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="profileFileInput"
                    disabled={profileBusy}
                    onChange={async (event) => {
                      const input = event.currentTarget;
                      const file = input.files?.[0];
                      if (!file) return;
                      if (file.size > 10 * 1024 * 1024) {
                        setProfileError("Choisissez une image de 10 Mo maximum.");
                        input.value = "";
                        return;
                      }
                      setProfileBusy(true);
                      setProfileError("");
                      setProfileMessage("");
                      try {
                        const storageClient = createClient();
                        if (!storageClient) throw new Error("Le stockage des photos n’est pas configuré.");
                        const preparationResponse = await fetch("/api/profile", {
                          method: "POST",
                          headers: { "content-type": "application/json" },
                          body: JSON.stringify({ action: "begin", mimeType: file.type, sizeBytes: file.size }),
                        });
                        const preparation = await preparationResponse.json();
                        if (!preparationResponse.ok) throw new Error(preparation.error || "Impossible de préparer l’envoi de la photo.");
                        const { error: uploadError } = await storageClient.storage
                          .from("profile-avatars")
                          .uploadToSignedUrl(preparation.storagePath, preparation.uploadToken, file, { contentType: file.type });
                        if (uploadError) throw new Error("Supabase n’a pas accepté l’envoi de la photo.");
                        const completionResponse = await fetch("/api/profile", {
                          method: "POST",
                          headers: { "content-type": "application/json" },
                          body: JSON.stringify({
                            action: "complete",
                            mimeType: file.type,
                            sizeBytes: file.size,
                            storagePath: preparation.storagePath,
                          }),
                        });
                        const result: { error?: string; avatar_url?: string } = await completionResponse.json();
                        if (!completionResponse.ok) throw new Error(result.error || "Impossible d’enregistrer cette photo.");
                        setProfileData((current) => current ? { ...current, avatar_url: result.avatar_url ?? null } : current);
                        setProfileMessage("Photo de profil mise à jour.");
                      } catch (error) {
                        setProfileError(error instanceof Error ? error.message : "Impossible d’enregistrer cette photo.");
                      } finally {
                        setProfileBusy(false);
                        input.value = "";
                      }
                    }}
                  />
                  <div className={`profilePhotoActions ${profileBusy ? "isBusy" : ""}`}>
                    <label className="profileFileButton" htmlFor="profile-avatar">
                      {profileBusy ? "Veuillez patienter…" : "Choisir une photo"}
                    </label>
                    <span>JPG, PNG ou WebP · 10 Mo maximum</span>
                    {profileData.avatar_url && (
                      <button
                        type="button"
                        className="profileRemovePhoto"
                        disabled={profileBusy}
                        onClick={async () => {
                        setProfileBusy(true);
                        setProfileError("");
                        setProfileMessage("");
                        try {
                          const response = await fetch("/api/profile", { method: "DELETE" });
                          const result: { error?: string; avatar_url?: string | null } = await response.json();
                          if (!response.ok) throw new Error(result.error || "Impossible de supprimer cette photo.");
                          setProfileData((current) => current ? { ...current, avatar_url: result.avatar_url ?? null } : current);
                          setProfileMessage("Photo de profil supprimée.");
                        } catch (error) {
                          setProfileError(error instanceof Error ? error.message : "Impossible de supprimer cette photo.");
                        } finally {
                          setProfileBusy(false);
                        }
                        }}
                      >
                        Supprimer la photo
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <form
                onSubmit={async (event) => {
                  event.preventDefault();
                  setProfileSaving(true);
                  setProfileError("");
                  setProfileMessage("");
                  try {
                    const response = await fetch("/api/profile", {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        first_name: profileData.first_name,
                        last_name: profileData.last_name,
                        email: profileData.email,
                        phone: profileData.phone,
                        country: profileData.country,
                        city: profileData.city,
                        birth_date: profileData.birth_date,
                        preferred_language: profileData.preferred_language,
                        german_level: profileData.german_level,
                      }),
                    });
                    const result: { error?: string; emailChangePending?: boolean; profile?: Partial<UserProfile> } = await response.json();
                    if (!response.ok) throw new Error(result.error || "Impossible d’enregistrer votre profil.");
                    if (!result.profile) throw new Error("Le serveur n’a pas confirmé les modifications.");
                    setProfileData((current) => current ? { ...current, ...result.profile } : current);
                    setUser((current) => current ? { ...current, firstName: result.profile?.first_name ?? current.firstName } : current);
                    setUiLanguage(profileData.preferred_language);
                    localStorage.setItem("mara-ui-language-v1", profileData.preferred_language);
                    setProfileMessage(result.emailChangePending
                      ? "Profil enregistré. Confirmez la nouvelle adresse e-mail depuis le message envoyé par Supabase."
                      : "Profil enregistré.");
                  } catch (error) {
                    setProfileError(error instanceof Error ? error.message : "Impossible d’enregistrer votre profil.");
                  } finally {
                    setProfileSaving(false);
                  }
                }}
              >
                <div className="profileFormGrid">
                <div className="field profileField">
                  <label htmlFor="profile-first-name">Prénom</label>
                  <input id="profile-first-name" autoComplete="given-name" maxLength={100} required value={profileData.first_name}
                    onChange={(event) => setProfileData((current) => current ? { ...current, first_name: event.target.value } : current)} />
                </div>
                <div className="field profileField">
                  <label htmlFor="profile-last-name">Nom</label>
                  <input id="profile-last-name" autoComplete="family-name" maxLength={100} required value={profileData.last_name}
                    onChange={(event) => setProfileData((current) => current ? { ...current, last_name: event.target.value } : current)} />
                </div>
                <div className="field profileField profileFullRow">
                  <label htmlFor="profile-email">Adresse e-mail</label>
                  <input id="profile-email" type="email" autoComplete="email" required value={profileData.email}
                    onChange={(event) => setProfileData((current) => current ? { ...current, email: event.target.value } : current)} />
                  <small>Une confirmation sera demandée avant que la nouvelle adresse remplace l’actuelle.</small>
                </div>
                <div className="field profileField">
                  <label htmlFor="profile-phone">Téléphone</label>
                  <input id="profile-phone" type="tel" autoComplete="tel" maxLength={20} pattern="\\+?[0-9().\\s-]{6,20}" title="Saisissez un numéro valide (20 caractères maximum)." value={profileData.phone ?? ""}
                    onChange={(event) => setProfileData((current) => current ? { ...current, phone: event.target.value || null } : current)} />
                  <small>20 caractères maximum, indicatif international accepté.</small>
                </div>
                <div className="field profileField">
                  <label htmlFor="profile-country">Pays</label>
                  <input id="profile-country" list="profile-country-options" autoComplete="country-name" maxLength={100} value={profileData.country ?? ""}
                    onChange={(event) => setProfileData((current) => current ? { ...current, country: event.target.value || null } : current)} />
                  <datalist id="profile-country-options">
                    {["France", "Allemagne", "Cameroun", "Côte d’Ivoire", "Sénégal", "Mali", "Burkina Faso", "République démocratique du Congo"].map((country) => (
                      <option key={country} value={country} />
                    ))}
                  </datalist>
                </div>
                <div className="field profileField">
                  <label htmlFor="profile-city">Ville</label>
                  <input id="profile-city" autoComplete="address-level2" maxLength={100} value={profileData.city ?? ""}
                    onChange={(event) => setProfileData((current) => current ? { ...current, city: event.target.value || null } : current)} />
                </div>
                <div className="field profileField">
                  <label htmlFor="profile-birth-date">Date de naissance (facultatif)</label>
                  <input id="profile-birth-date" type="date" autoComplete="bday" max={new Date().toISOString().slice(0, 10)} value={profileData.birth_date ?? ""}
                    onChange={(event) => setProfileData((current) => current ? { ...current, birth_date: event.target.value || null } : current)} />
                </div>
                <div className="field profileField">
                  <label htmlFor="profile-language">Langue préférée</label>
                  <select id="profile-language" value={profileData.preferred_language}
                    onChange={(event) => {
                      const value = event.target.value;
                      if (value === "fr" || value === "de" || value === "en") {
                        setProfileData((current) => current ? { ...current, preferred_language: value } : current);
                      }
                    }}>
                    <option value="fr">Français</option>
                    <option value="de">Deutsch</option>
                    <option value="en">English</option>
                  </select>
                </div>
                <div className="field profileField">
                  <label htmlFor="profile-german-level">Niveau d’allemand (facultatif)</label>
                  <select id="profile-german-level" value={profileData.german_level ?? ""}
                    onChange={(event) => setProfileData((current) => current ? { ...current, german_level: event.target.value || null } : current)}>
                    <option value="">Non renseigné</option>
                    {["A1", "A2", "B1", "B2", "C1", "C2"].map((level) => <option key={level} value={level}>{level}</option>)}
                  </select>
                </div>
                </div>
                <div className="profileFormFooter">
                  <div>
                    {profileError && <p className="authError" role="alert">{profileError}</p>}
                    {profileMessage && <p className="authMessage" role="status">{profileMessage}</p>}
                    <small>Vos informations sont enregistrées de façon privée dans votre compte.</small>
                  </div>
                  <button type="submit" className="profileSaveButton" disabled={profileSaving || profileLoading}>
                    <span aria-hidden="true">✓</span> {profileSaving ? "Enregistrement…" : "Enregistrer mon profil"}
                  </button>
                </div>
              </form>
            </section>
          )}
        </main>
      )}
      {page === "dashboard" && (
        <main className="shell">
          <h1>Bonjour {user?.firstName || "Ibrahima"} 👋</h1>
          <p className="muted">Reprenez votre apprentissage.</p>
          <div className="stats">
            <div className="stat">
              Progression<b>{overallCourseProgress} %</b>
            </div>
            <div className="stat">
              Leçons terminées<b>{completedCourseLessons} / {totalCourseLessons}</b>
            </div>
            <div className="stat">
              LIVE<b>{registered.length}</b>
            </div>
            <div className="stat">
              Accès<b style={{ color: "#059669" }}>Actif</b>
            </div>
          </div>
          <div className="dashboardDestinations">
            <section className="dashboardDestination">
              <span className="liveInfoLabel">APPRENTISSAGE</span>
              <h2>Vos cours</h2>
              <p className="muted">Retrouvez vos parcours, les leçons et leurs documents pédagogiques.</p>
              <button className="btn primary" onClick={() => go("courses")}>Ouvrir le catalogue</button>
            </section>
            <section className="dashboardDestination">
              <span className="liveInfoLabel">RENDEZ-VOUS</span>
              <h2>Sessions LIVE</h2>
              <p className="muted">Consultez le calendrier, gérez vos inscriptions et rejoignez une séance.</p>
              <button className="btn secondary" onClick={() => go("live")}>Voir le calendrier</button>
            </section>
            {user?.role !== "teacher" && user?.role !== "admin" && (
              <section className="dashboardDestination">
                <span className="liveInfoLabel">ABONNEMENT & FACTURES</span>
                <h2>{billingSubscription ? `Formule ${coursePlans[billingSubscription.plan_id].name}` : "Votre formule de cours"}</h2>
                <p className="muted">
                  {billingSubscription?.status === "active"
                    ? billingSubscription.cancel_at_period_end
                      ? "Votre formule restera active jusqu’à la fin de la période déjà payée."
                      : "Abonnement mensuel actif. Consultez vos factures ou gérez votre abonnement."
                    : "Consultez les factures disponibles et gérez votre formule Stripe."}
                </p>
                {billingSubscription && (
                  <button className="btn secondary" disabled={billingBusy} onClick={() => void openBillingPortal()}>
                    {billingBusy ? "Ouverture…" : "Gérer mon abonnement et mes factures"}
                  </button>
                )}
                {!billingSubscription && (
                  <button className="btn secondary" onClick={() => go("payment")}>Choisir une formule</button>
                )}
              </section>
            )}
          </div>
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
      {(page === "course" || page === "live-room") && (
        <main className="shell">
          <button className="btn ghost" onClick={() => go(page === "live-room" ? "live" : "courses")}>
            {page === "live-room" ? "← Calendrier LIVE" : "← Catalogue"}
          </button>
          <h1>{page === "live-room" ? "Espace LIVE" : selected.title}</h1>
          {page === "course" && (
            <nav className="courseTabs" aria-label="Contenu du cours">
              <button type="button" className={activeCourseTab === "learning" ? "active" : ""} onClick={() => setActiveCourseTab("learning")}>Parcours</button>
              <button type="button" className={activeCourseTab === "documents" ? "active" : ""} onClick={() => setActiveCourseTab("documents")}>Documents</button>
            </nav>
          )}
          {page === "course" && activeCourseTab === "documents" && (
            <section className="courseDocumentsPage">
              <header className="documentsHeading">
                <div>
                  <span className="liveInfoLabel">RESSOURCES PÉDAGOGIQUES</span>
                  <h2>Documents · {selected.title}</h2>
                  <p className="muted">Supports de cours à consulter ou télécharger, classés par parcours.</p>
                </div>
                <span className="documentCount">{courseDocuments.filter((document) => document.course_key === String(selected.id)).length} fichiers</span>
              </header>

              <section className="documentLibrary">
                <h3>Fichiers à télécharger</h3>
                {courseDocuments.filter((document) => document.course_key === String(selected.id)).length ? (
                  <div className="documentList">
                    {courseDocuments.filter((document) => document.course_key === String(selected.id)).map((document) => (
                      <article className="documentRow" key={document.id}>
                        <div className="documentFileIcon" aria-hidden="true">{document.file_name.split(".").pop()?.toUpperCase() ?? "DOC"}</div>
                        <div className="documentFileInfo">
                          <strong>{document.title}</strong>
                          <span>{document.file_name} · {(document.size_bytes / 1024 / 1024).toFixed(1)} Mo</span>
                        </div>
                        <a className="btn secondary documentDownload" href={document.public_url} target="_blank" rel="noreferrer" download={document.file_name}>
                          Télécharger
                        </a>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="documentsEmpty">Aucun fichier n’a encore été ajouté à ce cours.</p>
                )}
              </section>

              <section className="documentLibrary">
                <h3>Fiches et sujets abordés</h3>
                <div className="documentReferenceList">
                  {selected.documents.map((document) => (
                    <article className="documentReference" key={document.title}>
                      <span>{document.type}</span>
                      <div><strong>{document.title}</strong><p>{document.summary}</p></div>
                    </article>
                  ))}
                </div>
              </section>

              <section className="documentUploadSection">
                <div>
                  <span className="liveInfoLabel">GESTION PÉDAGOGIQUE</span>
                  <h3>Ajouter un document</h3>
                  <p className="muted">Les fichiers ajoutés seront disponibles au téléchargement pour les apprenants de ce cours.</p>
                </div>
                {documentStorageAvailable ? (
                  <form className="documentUploadForm" onSubmit={async (event) => {
                    event.preventDefault();
                    setDocumentUploadError("");
                    if (!documentAdminToken || !documentFile || !documentTitle.trim()) {
                      setDocumentUploadError("Indiquez le titre, le fichier et le code de dépôt administrateur.");
                      return;
                    }
                    const form = event.currentTarget;
                    setDocumentUploading(true);
                    try {
                      const storageClient = createClient();
                      if (!storageClient) throw new Error("Renseignez NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY pour déposer un fichier.");
                      const headers = {
                        "content-type": "application/json",
                        "x-course-documents-token": documentAdminToken,
                      };
                      const preparationResponse = await fetch("/api/course-documents", {
                        method: "POST",
                        headers,
                        body: JSON.stringify({
                          action: "begin",
                          courseKey: String(selected.id),
                          title: documentTitle.trim(),
                          fileName: documentFile.name,
                          sizeBytes: documentFile.size,
                        }),
                      });
                      const preparation = await preparationResponse.json();
                      if (!preparationResponse.ok) throw new Error(preparation.error || "Le dépôt n’a pas pu être préparé.");
                      const { error: uploadError } = await storageClient.storage
                        .from("course-documents")
                        .uploadToSignedUrl(preparation.storagePath, preparation.uploadToken, documentFile, {
                          contentType: preparation.mimeType,
                          cacheControl: "3600",
                        });
                      if (uploadError) throw new Error("Supabase n’a pas accepté le transfert du fichier.");
                      const completionResponse = await fetch("/api/course-documents", {
                        method: "POST",
                        headers,
                        body: JSON.stringify({
                          action: "complete",
                          courseKey: String(selected.id),
                          title: documentTitle.trim(),
                          fileName: documentFile.name,
                          sizeBytes: documentFile.size,
                          mimeType: preparation.mimeType,
                          storagePath: preparation.storagePath,
                        }),
                      });
                      const result = await completionResponse.json();
                      if (!completionResponse.ok) throw new Error(result.error || "Le document n’a pas pu être enregistré.");
                      setCourseDocuments((documents) => [result.document, ...documents]);
                      setDocumentTitle("");
                      setDocumentFile(null);
                      setDocumentAdminToken("");
                      form.reset();
                      notify("Document ajouté au cours");
                    } catch (error) {
                      setDocumentUploadError(error instanceof Error ? error.message : "Erreur lors du dépôt du document.");
                    } finally {
                      setDocumentUploading(false);
                    }
                  }}>
                    <div className="field">
                      <label htmlFor="course-document-title">Titre du document</label>
                      <input id="course-document-title" value={documentTitle} onChange={(event) => setDocumentTitle(event.target.value)} required maxLength={120} placeholder="Ex. Fiche de vocabulaire du module 1" />
                    </div>
                    <div className="field">
                      <label htmlFor="course-document-file">Fichier (PDF, Office, TXT, MP3, M4A, WAV, OGG, MP4 ou WebM · 15 Mo maximum)</label>
                      <input id="course-document-file" type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.mp3,.m4a,.wav,.ogg,.mp4,.webm" onChange={(event) => setDocumentFile(event.target.files?.[0] ?? null)} required />
                    </div>
                    <div className="field">
                      <label htmlFor="course-document-token">Code de dépôt administrateur</label>
                      <input id="course-document-token" type="password" autoComplete="off" value={documentAdminToken} onChange={(event) => setDocumentAdminToken(event.target.value)} required />
                    </div>
                    {documentUploadError && <p className="documentUploadError" role="alert">{documentUploadError}</p>}
                    <button type="submit" className="btn primary" disabled={documentUploading}>
                      {documentUploading ? "Envoi en cours…" : "Ajouter le fichier"}
                    </button>
                  </form>
                ) : (
                  <div className="documentSetupNotice" role="status">
                    <strong>Bibliothèque indisponible</strong>
                    <p>{documentSetupMessage}</p>
                    {documentMissingVariables.length > 0 && (
                      <p>Variables manquantes : {documentMissingVariables.map((variable) => <code key={variable}>{variable}</code>)}</p>
                    )}
                    <p>En local, ajoutez-les dans <code>.env.local</code>. Sur Vercel, ajoutez-les dans les paramètres Environment Variables puis redéployez. Si la migration est indiquée, exécutez <code>supabase/migrations/002_course_documents.sql</code> dans le SQL Editor du projet Supabase.</p>
                  </div>
                )}
              </section>
            </section>
          )}
          {page === "live-room" && (
            <div className="livePanel liveRoomPage">
              <div className="liveHeader">
                <div>
                  <span className="liveBadge">EN DIRECT</span>
                  <h2>{activeLive?.title || "Session LIVE"}</h2>
                </div>
                <div className="liveMeta" aria-live="polite">
                  <span className="liveDot" />
                  {liveJoined ? "Vous êtes dans le cours" : "Préparez votre caméra et votre micro"}
                </div>
              </div>

              <div className="liveInfoBar">
                <div className="liveInfoItem">
                  <span className="liveInfoLabel">Professeur</span>
                  <strong>{activeLive?.teacher || "À confirmer"}</strong>
                </div>
                <div className="liveInfoItem">
                  <span className="liveInfoLabel">Horaire</span>
                  <strong>{activeLive?.date || "À programmer"}</strong>
                </div>
                <div className="liveInfoItem">
                  <span className="liveInfoLabel">Cours</span>
                  <strong>{activeLive?.course || "Français"}</strong>
                </div>
              </div>

              <div className="liveJoinGuidance">
                {isValidTeamsUrl(activeLive?.roomUrl) ? (
                  <>
                    <strong>Votre cours se déroule sur Microsoft Teams.</strong>
                    <p>
                      Ouvrez la réunion avec le bouton ci-dessous. Teams peut s’ouvrir dans l’application ou le navigateur;
                      autorisez le micro et la caméra si votre téléphone le demande. Après le cours, revenez à Mara-Sprach.
                    </p>
                  </>
                ) : (
                  <>
                    <strong>Votre cours s’ouvre ici, dans Mara-Sprach.</strong>
                    <p>
                      Dans l’aperçu vidéo, vérifiez le micro et la caméra, autorisez-les si votre navigateur le demande,
                      puis cliquez sur « Rejoindre ». Une bonne lumière et une connexion Wi-Fi stable aident à obtenir
                      une image plus nette.
                    </p>
                  </>
                )}
              </div>

              {isValidTeamsUrl(activeLive?.roomUrl) ? (
                <section className="teamsLiveJoin">
                  <a
                    className="btn primary"
                    href={activeLive.roomUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Ouvrir la réunion Teams
                  </a>
                  <p>Si Teams vous le propose, choisissez « Continuer dans ce navigateur » pour rejoindre sans installer l’application.</p>
                </section>
              ) : (
                <JitsiRoom
                  roomUrl={activeLive?.roomUrl || "https://meet.jit.si/MaraSprachA1Live"}
                  displayName={user?.firstName || "Participant"}
                  onJoined={() => setLiveJoined(true)}
                  onReadyToClose={leaveLiveRoom}
                />
              )}

              <div className="liveActions">
                <button type="button" className="btn secondary" onClick={leaveLiveRoom}>
                  {liveJoined ? "Quitter la réunion" : "Annuler et revenir au calendrier"}
                </button>
                <button type="button" className="btn ghost" onClick={copyLiveLink}>
                  Copier le lien
                </button>
              </div>
            </div>
          )}
          {page === "course" && activeCourseTab === "learning" && (germanCurriculum ? (
            <section className="courseCurriculumCard">
              <header className="curriculumHeading">
                <div>
                  <span className="liveInfoLabel">PARCOURS DE FORMATION · {germanCurriculum.level}</span>
                  <h2>{selected.title}</h2>
                  <p className="muted">Parcours aligné sur {germanCurriculum.source}.</p>
                </div>
                <div className="curriculumStats">
                  <strong>{germanCurriculum.modules.length}</strong><span>modules</span>
                  <strong>{germanCurriculum.lessons.length}</strong><span>leçons</span>
                  <strong>{germanCurriculum.quizzes.length}</strong><span>quiz</span>
                </div>
              </header>
              <div className="curriculumProgress">
                <div className="curriculumProgressLabel">
                  <span>Progression des leçons</span>
                  <strong>{selectedCompletedLessons.length} / {germanCurriculum.lessons.length} terminées</strong>
                </div>
                <div className="progress" aria-label={`${Math.round((selectedCompletedLessons.length / germanCurriculum.lessons.length) * 100)} % des leçons terminées`}>
                  <span style={{ width: `${(selectedCompletedLessons.length / germanCurriculum.lessons.length) * 100}%` }} />
                </div>
              </div>
              <GermanVoiceStatus />
              <div className="courseLearningLayout">
                <nav className="courseCurriculum" aria-label="Curriculum du cours">
                  <h3>Curriculum</h3>
                  {germanCurriculum.modules.map((module) => (
                    <section className="curriculumModule" key={module.id}>
                      <h4>{module.title}</h4>
                      <div className="curriculumItems">
                        {module.items.map((item, index) => {
                          const lesson = item.type === "lesson" ? germanCurriculum.lessons.find((entry) => entry.id === item.id) : undefined;
                          const quiz = item.type === "quiz" ? germanCurriculum.quizzes.find((entry) => entry.id === item.id) : undefined;
                          const isActive = item.type === "lesson" ? activeGermanQuizId === null && activeGermanLessonId === item.id : activeGermanQuizId === item.id;
                          return (
                            <button
                              type="button"
                              key={`${item.type}-${item.id}`}
                              className={`curriculumItem ${isActive ? "active" : ""} ${item.type === "quiz" ? "quizItem" : ""}`}
                              aria-current={isActive ? "step" : undefined}
                              onClick={() => {
                                if (item.type === "lesson") {
                                  setActiveGermanLessonId(item.id);
                                  setActiveGermanQuizId(null);
                                } else if (quiz) {
                                  setActiveGermanLessonId(quiz.lessonId);
                                  setActiveGermanQuizId(quiz.id);
                                }
                              }}
                            >
                              <span className="curriculumItemNumber">{item.type === "lesson" ? String(item.id).padStart(2, "0") : "Q"}</span>
                              <span className="curriculumItemText">{item.type === "lesson" ? lesson?.title : quiz?.title}</span>
                              {item.type === "lesson" && selectedCompletedLessons.includes(item.id) && <span className="lessonCompleteMark" aria-label="Leçon terminée">✓</span>}
                              {item.type === "quiz" && <span className="curriculumItemType">{quiz?.mode === "multiple" ? "Multi" : quiz?.mode === "boolean" ? "Vrai/Faux" : "Quiz"}</span>}
                              <span className="srOnly">Étape {index + 1}</span>
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  ))}
                </nav>

                <div className="courseLessonContent">
                  {activeGermanQuiz ? (
                    <article className="lessonArticle">
                      <span className="lessonKicker">MODULE {germanCurriculum.modules.find((module) => module.items.some((item) => item.type === "quiz" && item.id === activeGermanQuiz.id))?.id} · ÉVALUATION</span>
                      <h2>{activeGermanQuiz.title}</h2>
                      <p className="muted">{activeGermanQuiz.mode === "multiple" ? "Plusieurs réponses sont correctes. Sélectionnez toutes les bonnes réponses." : activeGermanQuiz.mode === "boolean" ? "Choisissez vrai ou faux, puis validez votre réponse." : "Sélectionnez une réponse, puis validez votre choix."}</p>
                      <form onSubmit={async (event) => {
                        event.preventDefault();
                        const answers = germanQuizAnswers[activeGermanQuiz.id] ?? [];
                        if (!answers.length) return;
                        const isCorrect = answers.length === activeGermanQuiz.answers.length && activeGermanQuiz.answers.every((answer) => answers.includes(answer));
                        const score = isCorrect ? 100 : 0;
                        setLearningSaveBusy(true);
                        setLearningSaveError("");
                        try {
                          await saveLearningRecord(`course-${selected.id}`, "quiz", `german-${activeGermanQuiz.id}`, score);
                          setGermanQuizResults((results) => ({ ...results, [activeGermanQuiz.id]: isCorrect }));
                          setQuizScores((scores) => ({ ...scores, [`course-${selected.id}:german-${activeGermanQuiz.id}`]: score }));
                        } catch (error) {
                          setLearningSaveError(error instanceof Error ? error.message : "Impossible d’enregistrer le résultat du quiz.");
                        } finally {
                          setLearningSaveBusy(false);
                        }
                      }}>
                        <fieldset className="quizQuestion">
                          <legend>{activeGermanQuiz.question}</legend>
                          {activeGermanQuiz.audioPrompt && (
                            <div className="quizQuestionTools">
                              <GermanPronunciationButton text={activeGermanQuiz.audioPrompt} label="Écouter l’énoncé" />
                            </div>
                          )}
                          <div className="quizChoices">
                            {activeGermanQuiz.options.map((option, index) => {
                              const answers = germanQuizAnswers[activeGermanQuiz.id] ?? [];
                              const isSelected = answers.includes(option);
                              const hasResult = germanQuizResults[activeGermanQuiz.id] !== undefined;
                              const isCorrectOption = activeGermanQuiz.answers.includes(option);
                              const resultClass = hasResult && isCorrectOption ? "correct" : hasResult && isSelected ? "incorrect" : "";
                              return (
                                <div className="quizChoiceRow" key={option}>
                                  <button
                                    type="button"
                                    className={`quizChoice ${isSelected ? "selected" : ""} ${resultClass}`}
                                    aria-pressed={isSelected}
                                    onClick={() => {
                                      setGermanQuizAnswers((current) => {
                                        const currentAnswers = current[activeGermanQuiz.id] ?? [];
                                        const nextAnswers = activeGermanQuiz.mode === "multiple"
                                          ? currentAnswers.includes(option) ? currentAnswers.filter((answer) => answer !== option) : [...currentAnswers, option]
                                          : [option];
                                        return { ...current, [activeGermanQuiz.id]: nextAnswers };
                                      });
                                      setGermanQuizResults((results) => {
                                        const next = { ...results };
                                        delete next[activeGermanQuiz.id];
                                        return next;
                                      });
                                    }}
                                  >
                                    <span className="quizChoiceMarker">{isSelected ? "✓" : String.fromCharCode(65 + index)}</span>
                                    <span>{option}</span>
                                  </button>
                                  {activeGermanQuiz.speakOptions !== false && <GermanPronunciationButton text={option} label="Prononcer" />}
                                </div>
                              );
                            })}
                          </div>
                        </fieldset>
                        <div className="quizActions">
                          <button className="btn primary" type="submit" disabled={learningSaveBusy || !(germanQuizAnswers[activeGermanQuiz.id]?.length)}>
                            {learningSaveBusy ? "Enregistrement…" : "Valider ma réponse"}
                          </button>
                          {germanQuizResults[activeGermanQuiz.id] !== undefined && (
                            <strong className={`quizResult ${germanQuizResults[activeGermanQuiz.id] ? "success" : "retry"}`} role="status">
                              {germanQuizResults[activeGermanQuiz.id] ? "Score : 100 % · Bonne réponse" : "Score : 0 % · À revoir"}
                            </strong>
                          )}
                          {learningSaveError && <p className="authError" role="alert">{learningSaveError}</p>}
                        </div>
                        {germanQuizResults[activeGermanQuiz.id] !== undefined && (
                          <div className={`quizExplanation ${germanQuizResults[activeGermanQuiz.id] ? "success" : "retry"}`}>
                            <strong>{germanQuizResults[activeGermanQuiz.id] ? "Pourquoi ?" : `Réponse${activeGermanQuiz.answers.length > 1 ? "s" : ""} attendue${activeGermanQuiz.answers.length > 1 ? "s" : ""} : ${activeGermanQuiz.answers.join(" · ")}`}</strong>
                            <p>{activeGermanQuiz.explanation}</p>
                          </div>
                        )}
                      </form>
                    </article>
                  ) : activeGermanLesson ? (
                    <article className="lessonArticle">
                      <span className="lessonKicker">LEÇON {String(activeGermanLesson.id).padStart(2, "0")} · {activeGermanLesson.duration}</span>
                      <h2>{activeGermanLesson.title}</h2>
                      <section className="lessonSection">
                        <h3>Objectifs pédagogiques</h3>
                        <ul className="lessonObjectives">
                          {activeGermanLesson.objectives.map((objective) => <li key={objective}>{objective}</li>)}
                        </ul>
                      </section>
                      <section className="lessonSection">
                        <h3>Le cours</h3>
                        {activeGermanLesson.explanation.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                      </section>
                      <section className="lessonSection">
                        <h3>Vocabulaire essentiel</h3>
                        <div className="vocabularyList">
                          {activeGermanLesson.vocabulary.map((entry) => (
                            <div className="vocabularyRow" key={entry.word}>
                              <strong lang="de">{entry.word}</strong><span>{entry.meaning}</span><small>Prononciation : {entry.pronunciation}</small>
                              <GermanPronunciationButton text={entry.word} label="Prononcer" />
                            </div>
                          ))}
                        </div>
                      </section>
                      <section className="lessonSection">
                        <h3>Exemples en contexte</h3>
                        <div className="lessonExamples">
                          {activeGermanLesson.examples.map((example) => (
                            <blockquote className="lessonExample" key={example.german}>
                              <strong lang="de">{example.german}</strong>
                              <span>{example.french}</span>
                              <small>{example.note}</small>
                              <GermanPronunciationButton text={example.german} label="Écouter l’exemple" />
                            </blockquote>
                          ))}
                        </div>
                      </section>
                      <section className="lessonSection">
                        <h3>Récapitulatif de grammaire</h3>
                        <ul className="grammarSummaryList">
                          {activeGermanLesson.grammarSummary.map((rule) => <li key={rule}>{rule}</li>)}
                        </ul>
                      </section>
                      <section className="lessonSection">
                        <h3>Mini-dialogue · compréhension et jeu de rôle</h3>
                        <div className="lessonDialogue">
                          {activeGermanLesson.dialogue.map((line, index) => (
                            <div className="lessonDialogueLine" key={`${line.speaker}-${index}`}>
                              <span>{line.speaker}</span>
                              <div><strong lang="de">{line.german}</strong><small>{line.french}</small><GermanPronunciationButton text={line.german} label="Écouter le dialogue" /></div>
                            </div>
                          ))}
                        </div>
                        <p className="lessonMediaNote">Piste audio et vidéo du dialogue : fichier à ajouter aux documents du cours.</p>
                      </section>
                      <section className="lessonSection lessonPortfolio">
                        <span className="liveInfoLabel">PORTFOLIO · À CONSERVER</span>
                        <h3>Production personnelle</h3>
                        <p>{activeGermanLesson.portfolioTask}</p>
                      </section>
                      <footer className="lessonFooter">
                        <span>{selectedCompletedLessons.includes(activeGermanLesson.id) ? "Leçon terminée" : "Prenez le temps de répéter les exemples à voix haute."}</span>
                        <button
                          type="button"
                          className={`btn ${selectedCompletedLessons.includes(activeGermanLesson.id) ? "secondary" : "primary"}`}
                          onClick={async () => {
                            setLearningSaveBusy(true);
                            setLearningSaveError("");
                            try {
                              await saveLearningRecord(`course-${selected.id}`, "lesson", `lesson-${activeGermanLesson.id}`);
                              setCompletedGermanLessons((completed) => ({
                                ...completed,
                                [selected.id]: (completed[selected.id] ?? []).includes(activeGermanLesson.id)
                                  ? completed[selected.id]
                                  : [...(completed[selected.id] ?? []), activeGermanLesson.id],
                              }));
                            } catch (error) {
                              setLearningSaveError(error instanceof Error ? error.message : "Impossible d’enregistrer la leçon terminée.");
                            } finally {
                              setLearningSaveBusy(false);
                            }
                          }}
                          disabled={learningSaveBusy || selectedCompletedLessons.includes(activeGermanLesson.id)}
                        >
                          {learningSaveBusy ? "Enregistrement…" : selectedCompletedLessons.includes(activeGermanLesson.id) ? "Leçon validée" : "Terminer cette leçon"}
                        </button>
                        {learningSaveError && <p className="authError" role="alert">{learningSaveError}</p>}
                      </footer>
                    </article>
                  ) : null}
                </div>
              </div>
            </section>
          ) : (
            <div className="card">
              <span className="liveInfoLabel">{selected.language} · Niveau {selected.level}</span>
              <h2>Ressources du cours</h2>
              <div style={{ display: "grid", gap: "12px" }}>
                {selected.documents.map((document) => (
                  <article key={document.title} style={{ padding: "12px 0", borderBottom: "1px solid #e2e8f0" }}>
                    <span className="liveInfoLabel">{document.type}</span>
                    <h3 style={{ margin: "4px 0" }}>{document.title}</h3>
                    <p className="muted" style={{ margin: 0 }}>{document.summary}</p>
                  </article>
                ))}
              </div>
              <h2 style={{ marginTop: "24px" }}>Quiz de validation</h2>
              <form onSubmit={async (event) => {
                event.preventDefault();
                const score = selected.quiz.length
                  ? Math.round((selected.quiz.filter((item, index) => quizAnswers[index] === item.answer).length / selected.quiz.length) * 100)
                  : 0;
                setLearningSaveBusy(true);
                setLearningSaveError("");
                try {
                  await saveLearningRecord(`course-${selected.id}`, "quiz", `general-${selected.id}`, score);
                  setQuizScores((scores) => ({ ...scores, [`course-${selected.id}:general-${selected.id}`]: score }));
                  setQuizSubmitted(true);
                } catch (error) {
                  setLearningSaveError(error instanceof Error ? error.message : "Impossible d’enregistrer le résultat du quiz.");
                } finally {
                  setLearningSaveBusy(false);
                }
              }}>
                <div style={{ display: "grid", gap: "18px" }}>
                  {selected.quiz.map((item, index) => (
                    <fieldset key={item.question} style={{ border: 0, borderTop: "1px solid #e2e8f0", padding: "14px 0 0", margin: 0 }}>
                      <legend style={{ fontWeight: 700, padding: "0 0 8px" }}>{index + 1}. {item.question}</legend>
                      <div style={{ display: "grid", gap: "8px" }}>
                        {item.options.map((option) => (
                          <label key={option} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <input
                              type="radio"
                              name={`quiz-${selected.id}-${index}`}
                              value={option}
                              checked={quizAnswers[index] === option}
                              onChange={() => setQuizAnswers((answers) => ({ ...answers, [index]: option }))}
                            />
                            {option}
                          </label>
                        ))}
                      </div>
                      {quizSubmitted && (
                        <p className="muted" style={{ marginBottom: 0 }}>
                          {quizAnswers[index] === item.answer ? "Correct. " : `Réponse attendue : ${item.answer}. `}{item.explanation}
                        </p>
                      )}
                    </fieldset>
                  ))}
                </div>
                <button className="btn primary" type="submit" style={{ marginTop: "16px" }} disabled={learningSaveBusy}>
                  {learningSaveBusy ? "Enregistrement…" : "Vérifier mes réponses"}
                </button>
              </form>
              {learningSaveError && <p className="authError" role="alert">{learningSaveError}</p>}
              {quizScores[`course-${selected.id}:general-${selected.id}`] !== undefined && (
                <p className="authMessage" role="status">
                  Dernier score enregistré : {quizScores[`course-${selected.id}:general-${selected.id}`]} %
                </p>
              )}
              <button
                className="btn secondary"
                style={{ marginTop: "12px" }}
                onClick={() => {
                  notify("Progression enregistrée");
                  setPage("home");
                }}
              >
                Marquer comme terminée
              </button>
            </div>
          ))}
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
                  setSelected(courses.find((course) => course.language === live.course) ?? courses[0]);
                  go("live-room");
                  openLiveRoom(live);
                  notify("Vous êtes maintenant dans le live");
                }}
              >
                Rejoindre le cours
              </button>
            </div>
          </div>
        </main>
      )}
      {page === "support" && (
        <main className="shell">
          <h1>Demande d'accompagnement</h1>
          <div className="card">
            {supportSent ? (
              <>
                <h2>✓ Demande envoyée</h2>
                <p className="muted">
                  {supportRequests[0]
                    ? `« ${supportRequests[0].subject} » · ${supportRequests[0].status}`
                    : "Votre demande a été enregistrée dans votre compte."}
                </p>
                <button type="button" className="btn secondary" onClick={() => setSupportSent(false)}>
                  Envoyer une autre demande
                </button>
              </>
            ) : (
              <form onSubmit={submitSupportRequest}>
                <div className="field">
                  <label htmlFor="support-type">Type</label>
                  <select id="support-type" value={supportType} onChange={(event) => setSupportType(event.target.value)}>
                    <option>Démarches administratives</option>
                    <option>Aide numérique</option>
                    <option>Cours de français</option>
                    <option>Cours d'Allemand</option>
                    <option>Autres</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="support-subject">Objet</label>
                  <input
                    id="support-subject"
                    value={supportSubject}
                    onChange={(event) => setSupportSubject(event.target.value)}
                    maxLength={200}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="support-description">Description</label>
                  <textarea
                    id="support-description"
                    rows={6}
                    value={supportDescription}
                    onChange={(event) => setSupportDescription(event.target.value)}
                    maxLength={3000}
                    required
                  />
                </div>
                {supportError && <p className="authError" role="alert">{supportError}</p>}
                <button className="btn primary" type="submit" disabled={supportSubmitting}>
                  {supportSubmitting ? "Envoi…" : "Envoyer"}
                </button>
              </form>
            )}
            {supportRequests.length > 0 && (
              <section aria-labelledby="support-history-title">
                <h2 id="support-history-title">Mes demandes</h2>
                <ul>
                  {supportRequests.map((request) => (
                    <li key={request.id}>
                      {request.subject} — {request.status} ({new Date(request.created_at).toLocaleDateString("fr-FR")})
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </main>
      )}
      <div className="footer">
        <p>{localizedText("Par Mr.ALATA Ibrahima [© 2026 Mara-Sprach Team • Cours de (Français • Allemand) et Accompagnement]", "Von Mr.ALATA Ibrahima [© 2026 Mara-Sprach Team • Französisch- und Deutschkurse sowie Begleitung]", "By Mr.ALATA Ibrahima [© 2026 Mara-Sprach Team • French and German courses and support]")}</p>
        <button type="button" className="cookieSettingsLink" onClick={() => setCookiePreferencesOpen(true)}>
          {localizedText("Préférences cookies", "Cookie-Einstellungen", "Cookie settings")}
        </button>
      </div>
      {cookieReady && (!cookieChoice || cookiePreferencesOpen) && (
        <aside className="cookieBanner" role="dialog" aria-label={localizedText("Préférences de cookies", "Cookie-Einstellungen", "Cookie preferences")}>
          <h2>{cookiePreferencesOpen ? localizedText("Vos préférences", "Ihre Einstellungen", "Your preferences") : localizedText("Votre confidentialité compte", "Ihre Privatsphäre ist uns wichtig", "Your privacy matters")}</h2>
          {cookiePreferencesOpen ? (
            <div className="cookieDetails">
              <p><strong>{localizedText("Cookies nécessaires", "Notwendige Cookies", "Essential cookies")}</strong><br />{localizedText("Toujours actifs pour la connexion et le fonctionnement du site.", "Für Anmeldung und Betrieb der Website immer aktiv.", "Always active for sign-in and site functionality.")}</p>
              <p><strong>{localizedText("Mesure d’audience", "Reichweitenmessung", "Analytics")}</strong><br />{localizedText("Aucun outil de mesure d’audience n’est actuellement activé.", "Derzeit ist kein Reichweitenmessungs-Tool aktiviert.", "No analytics tool is currently enabled.")}</p>
              <button type="button" className="btn secondary" onClick={() => saveCookieChoice("necessary")}>
                {localizedText("Enregistrer les cookies nécessaires", "Nur notwendige Cookies speichern", "Save essential cookies only")}
              </button>
              <button type="button" className="cookieTextButton" onClick={() => setCookiePreferencesOpen(false)}>
                {localizedText("Retour", "Zurück", "Back")}
              </button>
            </div>
          ) : (
            <>
              <p>{localizedText("Les cookies et le stockage local nécessaires assurent la connexion et le fonctionnement de Mara-Sprach Team. Vous pouvez accepter tout le stockage ou garder uniquement le nécessaire.", "Notwendige Cookies und lokaler Speicher ermöglichen die Anmeldung und den Betrieb von Mara-Sprach Team. Sie können alles akzeptieren oder nur notwendige Speicherungen zulassen.", "Essential cookies and local storage support sign-in and the operation of Mara-Sprach Team. You can accept all storage or allow only what is necessary.")}</p>
              <button type="button" className="cookiePrimaryButton" onClick={() => saveCookieChoice("all")}>
                {localizedText("Tout accepter", "Alle akzeptieren", "Accept all")}
              </button>
              <button type="button" className="cookieSecondaryButton" onClick={() => saveCookieChoice("necessary")}>
                {localizedText("Uniquement nécessaires", "Nur notwendige", "Essential only")}
              </button>
              <button type="button" className="cookieTextButton" onClick={() => setCookiePreferencesOpen(true)}>
                {localizedText("Gérer mes préférences", "Einstellungen verwalten", "Manage preferences")}
              </button>
            </>
          )}
        </aside>
      )}
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
