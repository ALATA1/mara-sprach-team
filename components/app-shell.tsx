"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

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

type GermanLesson = {
  id: number;
  title: string;
  duration: string;
  objectives: string[];
  explanation: string[];
  vocabulary: { word: string; meaning: string; pronunciation: string }[];
  examples: { german: string; french: string; note: string }[];
};

type GermanQuiz = {
  id: number;
  lessonId: number;
  title: string;
  mode: "single" | "multiple" | "boolean";
  question: string;
  options: string[];
  answers: string[];
  explanation: string;
};

type GermanCurriculumItem = { type: "lesson" | "quiz"; id: number };
type GermanCurriculum = {
  modules: { id: number; title: string; items: GermanCurriculumItem[] }[];
  lessons: GermanLesson[];
  quizzes: GermanQuiz[];
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

const germanA1Curriculum: GermanCurriculum = {
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
    lessons: 10,
    color: "#ea580c",
    documents: [
      { title: "Begrüßungen", type: "Vocabulaire", summary: "Les salutations et expressions de base pour démarrer une conversation." },
      { title: "Im Deutschkurs", type: "Dialogue", summary: "Un dialogue pour dire son nom, son pays et ses langues." },
      { title: "Personalpronomen", type: "Grammaire", summary: "Les pronoms personnels allemands dans des phrases simples." },
    ],
    quiz: [
      { question: "Comment dire « Je m'appelle Paul » en allemand ?", options: ["Ich heiße Paul.", "Ich bin heißen Paul.", "Ich komme Paul."], answer: "Ich heiße Paul.", explanation: "La tournure usuelle pour donner son nom est « Ich heiße… »." },
      { question: "Que signifie « Guten Morgen » ?", options: ["Bonsoir", "Bonjour (le matin)", "Au revoir"], answer: "Bonjour (le matin)", explanation: "« Guten Morgen » est la salutation utilisée le matin." },
    ],
    curriculum: germanA1Curriculum,
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
    [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({}),
    [quizSubmitted, setQuizSubmitted] = useState(false),
    [activeGermanLessonId, setActiveGermanLessonId] = useState(1),
    [activeGermanQuizId, setActiveGermanQuizId] = useState<number | null>(null),
    [germanQuizAnswers, setGermanQuizAnswers] = useState<Record<number, string[]>>({}),
    [germanQuizResults, setGermanQuizResults] = useState<Record<number, boolean>>({}),
    [completedGermanLessons, setCompletedGermanLessons] = useState<number[]>([]),
    [liveSessions, setLiveSessions] = useState<LiveSession[]>(defaultLiveSessions),
    [activeLive, setActiveLive] = useState<LiveSession>(defaultLiveSessions[0]);
  const livePopupRef = useRef<Window | null>(null);
  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem("ensemble-v1") || "null");
      if (s) {
        setUser(s.user);
        setPaid(!!s.paid);
        setRegistered(s.registered || []);
        setSupport(!!s.support);
        setCompletedGermanLessons(Array.isArray(s.completedGermanLessons) ? s.completedGermanLessons : []);
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
    localStorage.setItem("ensemble-v1", JSON.stringify({ user, paid, registered, support, completedGermanLessons }));
  }, [user, paid, registered, support, completedGermanLessons]);
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
  const germanCurriculum = selected.curriculum;
  const activeGermanLesson = germanCurriculum?.lessons.find((lesson) => lesson.id === activeGermanLessonId);
  const activeGermanQuiz = germanCurriculum?.quizzes.find((quiz) => quiz.id === activeGermanQuizId);
  const card = (c: Course) => {
    const courseProgress = c.curriculum
      ? Math.round((completedGermanLessons.length / c.curriculum.lessons.length) * 100)
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
            setCompletedGermanLessons([]);
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
              setSelected(courses[0]);
              go("course");
              openLiveRoom(l);
            }}
          >
            Rejoindre
          </button>
        </div>
      </div>
    );
  });
  const openLiveRoom = (item: LiveSession) => {
    setActiveLive(item);
    setLiveJoined(true);
    if (typeof window !== "undefined") {
      const popup = window.open(item.roomUrl, "_blank", "noopener,noreferrer");
      livePopupRef.current = popup;
    }
    notify("Salle live ouverte");
  };

  const leaveLiveRoom = () => {
    if (livePopupRef.current && !livePopupRef.current.closed) {
      livePopupRef.current.close();
      livePopupRef.current = null;
    }
    setLiveJoined(false);
    setPage("home");
    notify("Vous avez quitté le live");
  };

  const joinLiveSession = (item = activeLive) => {
    if (!item) return;
    openLiveRoom(item);
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

                <h3> 📚 Français et allemand</h3>

                <p className="muted">
                Des parcours organisés par niveau avec vidéos,
                exercices et documents.
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

                <h3> 🎥 Cours en direct</h3>

                <p className="muted">
                Participez à des séances collectives
                et posez vos questions.
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

                <h3>🧭 Aide personnalisée</h3>

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
                <a
                  href={activeLive?.roomUrl || "https://meet.jit.si/MaraSprachA1Live"}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "#2563eb", textDecoration: "underline", fontWeight: 700 }}
                >
                  {activeLive?.roomUrl || "https://meet.jit.si/MaraSprachA1Live"}
                </a>
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
                      onClick={leaveLiveRoom}
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
                  onClick={leaveLiveRoom}
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
          {germanCurriculum ? (
            <section className="courseCurriculumCard">
              <header className="curriculumHeading">
                <div>
                  <span className="liveInfoLabel">PARCOURS DE FORMATION · A1</span>
                  <h2>Allemand débutant</h2>
                  <p className="muted">Un parcours progressif pour comprendre les bases et commencer à communiquer.</p>
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
                  <strong>{completedGermanLessons.length} / {germanCurriculum.lessons.length} terminées</strong>
                </div>
                <div className="progress" aria-label={`${Math.round((completedGermanLessons.length / germanCurriculum.lessons.length) * 100)} % des leçons terminées`}>
                  <span style={{ width: `${(completedGermanLessons.length / germanCurriculum.lessons.length) * 100}%` }} />
                </div>
              </div>
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
                              {item.type === "lesson" && completedGermanLessons.includes(item.id) && <span className="lessonCompleteMark" aria-label="Leçon terminée">✓</span>}
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
                          <div className="quizChoices">
                            {activeGermanQuiz.options.map((option, index) => {
                              const answers = germanQuizAnswers[activeGermanQuiz.id] ?? [];
                              const isSelected = answers.includes(option);
                              const hasResult = germanQuizResults[activeGermanQuiz.id] !== undefined;
                              const isCorrectOption = activeGermanQuiz.answers.includes(option);
                              const resultClass = hasResult && isCorrectOption ? "correct" : hasResult && isSelected ? "incorrect" : "";
                              return (
                                <button
                                  type="button"
                                  key={option}
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
                              {germanQuizResults[activeGermanQuiz.id] ? "Bonne réponse" : "À revoir"}
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
                            </blockquote>
                          ))}
                        </div>
                      </section>
                      <footer className="lessonFooter">
                        <span>{completedGermanLessons.includes(activeGermanLesson.id) ? "Leçon terminée" : "Prenez le temps de répéter les exemples à voix haute."}</span>
                        <button
                          type="button"
                          className={`btn ${completedGermanLessons.includes(activeGermanLesson.id) ? "secondary" : "primary"}`}
                          onClick={() => setCompletedGermanLessons((completed) => completed.includes(activeGermanLesson.id) ? completed : [...completed, activeGermanLesson.id])}
                          disabled={completedGermanLessons.includes(activeGermanLesson.id)}
                        >
                          {completedGermanLessons.includes(activeGermanLesson.id) ? "Leçon validée" : "Terminer cette leçon"}
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
          )}
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
                  go("course");
                  openLiveRoom(live);
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
