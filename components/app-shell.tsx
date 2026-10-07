"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { JitsiRoom } from "@/components/jitsi-room";
import { GermanPronunciationButton, GermanVoiceStatus } from "@/components/german-pronunciation";
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
type ProtectedPage = "video-courses" | "live";
type TeacherCourse = { id: string; title: string; language: string; level: string; published: boolean };

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
    [authLoading, setAuthLoading] = useState(true),
    [authBusy, setAuthBusy] = useState(false),
    [authError, setAuthError] = useState(""),
    [authMessage, setAuthMessage] = useState(""),
    [pendingConfirmationEmail, setPendingConfirmationEmail] = useState(""),
    [signupAccountType, setSignupAccountType] = useState<"student" | "teacher" | "">(""),
    [teacherCourses, setTeacherCourses] = useState<TeacherCourse[]>([]),
    [language, setLanguage] = useState("Tous"),
    [selected, setSelected] = useState(courses[0]),
    [registered, setRegistered] = useState<number[]>([]),
    [support, setSupport] = useState(false),
    [toast, setToast] = useState(""),
    [photoOpen, setPhotoOpen] = useState(false),
    [logoOpen, setLogoOpen] = useState(false),
    [formationMenuOpen, setFormationMenuOpen] = useState(false),
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
    [completedGermanLessons, setCompletedGermanLessons] = useState<Record<number, number[]>>({}),
    [liveSessions, setLiveSessions] = useState<LiveSession[]>(defaultLiveSessions),
    [activeLive, setActiveLive] = useState<LiveSession>(defaultLiveSessions[0]);

  const loadAccount = async (supabaseUser: SupabaseUser, redirectAfterLoad = true) => {
    const client = createClient();
    if (!client) return;

    const [{ data: profile }, { data: membership }] = await Promise.all([
      client.from("profiles").select("first_name, role").eq("id", supabaseUser.id).maybeSingle(),
      client.from("memberships").select("status").eq("user_id", supabaseUser.id).maybeSingle(),
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
    setPaid(role === "teacher" || role === "admin" || membership?.status === "active");

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
      if (role === "teacher" || role === "admin" || membership?.status === "active") go("dashboard");
      else go("payment");
    }
  };

  const signOut = async () => {
    const client = createClient();
    if (client) await client.auth.signOut();
    setUser(null);
    setPaid(false);
    setTeacherCourses([]);
    go("home");
  };

  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem("ensemble-v1") || "null");
      if (s) {
        setRegistered(s.registered || []);
        setSupport(!!s.support);
        setCompletedGermanLessons(
          Array.isArray(s.completedGermanLessons)
            ? { 3: s.completedGermanLessons }
            : s.completedGermanLessons && typeof s.completedGermanLessons === "object"
              ? s.completedGermanLessons
              : {},
        );
      }
    } catch {}
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
        setTeacherCourses([]);
      }
    });

    if (parameters.get("auth") === "confirmation-error") {
      setAuthError("Le lien de confirmation est invalide ou expiré. Demandez un nouvel e-mail de confirmation.");
      go("login");
    }
    if (parameters.get("payment") === "confirmed") setToast("Paiement confirmé. Votre accès étudiant est activé.");
    if (parameters.get("payment") === "error") setAuthError("Le paiement n’a pas pu être confirmé. Contactez l’équipe avant de réessayer.");
    if (parameters.get("payment") === "cancelled") setAuthMessage("Paiement annulé. Votre accès n’a pas été activé.");

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
    localStorage.setItem("ensemble-v1", JSON.stringify({ registered, support, completedGermanLessons }));
  }, [registered, support, completedGermanLessons]);

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
  const go = (p: string) => {
      if (p === "video-courses" || p === "live") {
        if (authLoading) return;
        if (!user) {
          setPendingProtectedPage(p);
          setPage("login");
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
      await loadAccount(data.user, !destination);
      if (destination) {
        setPendingProtectedPage(null);
        setPage(destination);
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
          {user && (
            <div
              className={`navDropdown ${formationMenuOpen ? "open" : ""}`}
              onMouseEnter={() => setFormationMenuOpen(true)}
              onMouseLeave={() => setFormationMenuOpen(false)}
              onFocusCapture={() => setFormationMenuOpen(true)}
              onBlurCapture={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                  setFormationMenuOpen(false);
                }
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setFormationMenuOpen(false);
                  event.currentTarget.querySelector<HTMLButtonElement>(".formationTrigger")?.focus();
                }
              }}
            >
              <button
                type="button"
                className={`btn ghost hideMobile formationTrigger ${["courses", "programme-a1", "programme-a2", "programme-b1"].includes(page) ? "active" : ""}`}
                aria-expanded={formationMenuOpen}
                onClick={() => setFormationMenuOpen(true)}
              >
                {localizedText("Formation", "Lernen", "Learning")}
              </button>
              <div className="formationMenu" aria-label="Sous-menus Formation">
                {(paid || user.role === "teacher") && (
                  <button className={page === "courses" ? "active" : ""} onClick={() => { setFormationMenuOpen(false); go("courses"); }}>
                    {localizedText("Cours", "Kurse", "Courses")}
                  </button>
                )}
                <button className={page === "programme-a1" ? "active" : ""} onClick={() => { setFormationMenuOpen(false); go("programme-a1"); }}>
                  Niveau A1
                </button>
                <button className={page === "programme-a2" ? "active" : ""} onClick={() => { setFormationMenuOpen(false); go("programme-a2"); }}>
                  Niveau A2
                </button>
                <button className={page === "programme-b1" ? "active" : ""} onClick={() => { setFormationMenuOpen(false); go("programme-b1"); }}>
                  Niveau B1
                </button>
              </div>
            </div>
          )}
          {user ? (
            <>
              {(paid || user.role === "teacher") && (
                <>
                  <button className="btn ghost hideMobile" onClick={() => go("live")}>LIVE</button>
                  <button className="btn ghost hideMobile" onClick={() => go("support")}>{localizedText("Accompagnement", "Begleitung", "Support")}</button>
                </>
              )}
              <button className="btn secondary" onClick={() => go(paid || user.role === "teacher" ? "dashboard" : "payment")}>
                {user.role === "teacher" ? localizedText("Espace enseignant", "Lehrkraftbereich", "Teacher area") : paid ? localizedText("Espace étudiant", "Lernbereich", "Student area") : localizedText("Finaliser mon accès", "Zugang abschließen", "Complete my access")}
              </button>
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
          <div className="auth">
            <h1>Activez votre espace étudiant</h1>
            <div className="price">10 €</div>
            <p className="muted">{user?.email ? `Compte confirmé : ${user.email}.` : "Compte confirmé."} Le règlement sécurisé par Stripe active l’adhésion après confirmation du paiement.</p>
            {authError && <p className="authError" role="alert">{authError}</p>}
            <button
              className="btn primary full"
              disabled={authBusy}
              onClick={async () => {
                setAuthBusy(true);
                setAuthError("");
                try {
                  const response = await fetch("/api/checkout", { method: "POST" });
                  const result = await response.json();
                  if (!response.ok) throw new Error(result.error || "Le paiement n’a pas pu être préparé.");
                  if (result.alreadyActive) {
                    setPaid(true);
                    go("dashboard");
                    return;
                  }
                  if (!result.url) throw new Error("Stripe n’a pas renvoyé de lien de paiement.");
                  window.location.assign(result.url);
                } catch (error) {
                  setAuthError(error instanceof Error ? error.message : "Le paiement a échoué.");
                } finally {
                  setAuthBusy(false);
                }
              }}
            >
              {authBusy ? "Préparation du paiement…" : "Continuer vers Stripe"}
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
                <strong>Votre cours s’ouvre ici, dans Mara-Sprach.</strong>
                <p>
                  Dans l’aperçu vidéo, vérifiez le micro et la caméra, autorisez-les si votre navigateur le demande,
                  puis cliquez sur « Rejoindre ». Une bonne lumière et une connexion Wi-Fi stable aident à obtenir
                  une image plus nette.
                </p>
              </div>

              <JitsiRoom
                roomUrl={activeLive?.roomUrl || "https://meet.jit.si/MaraSprachA1Live"}
                displayName={user?.firstName || "Participant"}
                onJoined={() => setLiveJoined(true)}
                onReadyToClose={leaveLiveRoom}
              />

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
                      <form onSubmit={(event) => {
                        event.preventDefault();
                        const answers = germanQuizAnswers[activeGermanQuiz.id] ?? [];
                        if (!answers.length) return;
                        const isCorrect = answers.length === activeGermanQuiz.answers.length && activeGermanQuiz.answers.every((answer) => answers.includes(answer));
                        setGermanQuizResults((results) => ({ ...results, [activeGermanQuiz.id]: isCorrect }));
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
                          <button className="btn primary" type="submit" disabled={!(germanQuizAnswers[activeGermanQuiz.id]?.length)}>
                            Valider ma réponse
                          </button>
                          {germanQuizResults[activeGermanQuiz.id] !== undefined && (
                            <strong className={`quizResult ${germanQuizResults[activeGermanQuiz.id] ? "success" : "retry"}`} role="status">
                              {germanQuizResults[activeGermanQuiz.id] ? "Score : 100 % · Bonne réponse" : "Score : 0 % · À revoir"}
                            </strong>
                          )}
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
                          onClick={() => setCompletedGermanLessons((completed) => ({
                            ...completed,
                            [selected.id]: (completed[selected.id] ?? []).includes(activeGermanLesson.id)
                              ? completed[selected.id]
                              : [...(completed[selected.id] ?? []), activeGermanLesson.id],
                          }))}
                          disabled={selectedCompletedLessons.includes(activeGermanLesson.id)}
                        >
                          {selectedCompletedLessons.includes(activeGermanLesson.id) ? "Leçon validée" : "Terminer cette leçon"}
                        </button>
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
              <form onSubmit={(event) => { event.preventDefault(); setQuizSubmitted(true); }}>
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
                <button className="btn primary" type="submit" style={{ marginTop: "16px" }}>
                  Vérifier mes réponses
                </button>
              </form>
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
