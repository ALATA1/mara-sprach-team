export type GermanLesson = {
  id: number;
  title: string;
  duration: string;
  objectives: string[];
  explanation: string[];
  vocabulary: { word: string; meaning: string; pronunciation: string }[];
  examples: { german: string; french: string; note: string }[];
  grammarSummary: string[];
  dialogue: { speaker: string; german: string; french: string }[];
  portfolioTask: string;
};

export type GermanQuiz = {
  id: number;
  lessonId: number;
  title: string;
  mode: "single" | "multiple" | "boolean";
  question: string;
  options: string[];
  answers: string[];
  explanation: string;
  audioPrompt?: string;
  speakOptions?: boolean;
};

export type GermanCurriculumItem = { type: "lesson" | "quiz"; id: number };
export type GermanCurriculum = {
  level: "A1" | "A2" | "B1";
  source: string;
  modules: { id: number; title: string; items: GermanCurriculumItem[] }[];
  lessons: GermanLesson[];
  quizzes: GermanQuiz[];
};

export type GermanProgramChapter = Omit<GermanLesson, "id"> & {
  quiz: Omit<GermanQuiz, "id" | "lessonId" | "title">;
};

export type GermanProgram = {
  level: "A1" | "A2" | "B1";
  source: string;
  title: string;
  description: string;
  chapters: { title: string; topics: string[]; grammar: string[] }[];
  learningMaterials: string[];
};

export const germanA1Program: GermanProgram = {
  level: "A1",
  source: "Schritte plus Neu – Kursbuch A1/1",
  title: "Niveau d’allemand A1",
  description: "Six chapitres pour acquérir les bases et commencer à communiquer dans les situations du quotidien.",
  chapters: [
    { title: "Guten Tag!", topics: ["Se présenter", "Nom, origine et langues", "Alphabet et épellation", "Premières questions simples"], grammar: ["Le verbe sein", "Questions en W-", "Phrases déclaratives"] },
    { title: "Freunde, Kollegen und ich", topics: ["Décrire des personnes", "Famille, amis et collègues", "Professions"], grammar: ["Possessifs mein et dein", "Formation du pluriel", "Conjugaison des verbes"] },
    { title: "Essen und Trinken", topics: ["Aliments et boissons", "Commander au café", "Prix et quantités"], grammar: ["Accusatif", "Articles à l’accusatif", "Verbe haben"] },
    { title: "Alltag und Freizeit", topics: ["Routine quotidienne", "Heure", "Activités de loisirs"], grammar: ["Verbes à particule séparable", "Position du verbe dans la phrase"] },
    { title: "Kontakte", topics: ["Téléphoner", "Écrire des e-mails", "Fixer un rendez-vous"], grammar: ["Verbe modal können", "Impératif"] },
    { title: "Orientierung", topics: ["Indiquer un itinéraire", "Lieux en ville", "Moyens de transport"], grammar: ["Prépositions in, auf et an", "Indications de lieu au datif"] },
  ],
  learningMaterials: ["Audio de compréhension pour chaque chapitre (fichiers à ajouter)", "Mini-dialogues vidéo (scripts de dialogue intégrés, vidéos à ajouter)", "Quiz et exercices interactifs par chapitre", "Portfolio de progression et récapitulatif grammatical"],
};

export const germanA2Program: GermanProgram = {
  level: "A2",
  source: "Schritte plus Neu – Arbeitsbuch A2/2",
  title: "Niveau d’allemand A2",
  description: "Six chapitres pour gagner en autonomie dans les achats, la santé, le travail, le logement, les loisirs et les voyages.",
  chapters: [
    { title: "Kleidung & Einkaufen", topics: ["Vêtements, tailles et couleurs", "Dialogues en magasin", "Retour ou échange d’un produit"], grammar: ["Terminaisons des adjectifs", "Comparatif"] },
    { title: "Gesundheit", topics: ["Chez le médecin", "Symptômes, maladies et conseils", "Ordonnances et pharmacie"], grammar: ["Impératif", "Verbes modaux sollen et müssen"] },
    { title: "Arbeit & Beruf", topics: ["Recherche d’emploi", "CV simple et annonces", "Conditions de travail"], grammar: ["Subordonnées avec weil et dass"] },
    { title: "Wohnen", topics: ["Types de logements", "Problèmes dans l’appartement", "Appeler le propriétaire"], grammar: ["Prépositions avec datif et accusatif", "Prépositions mixtes"] },
    { title: "Freizeit & Medien", topics: ["Utilisation des médias", "Invitations et événements"], grammar: ["Révision du Perfekt", "Futur I"] },
    { title: "Reisen", topics: ["Réservations", "Informations touristiques"], grammar: ["Propositions relatives avec der, die et das"] },
  ],
  learningMaterials: ["Dialogues de compréhension et exercices de situation", "Fiches de vocabulaire par thème", "Mini-tests interactifs et corrections expliquées", "Exercices de lecture, formulaires et rédaction courte"],
};

export const germanB1Program: GermanProgram = {
  level: "B1",
  source: "Parcours pédagogique Mara-Sprach Team · repères CECRL B1",
  title: "Niveau d’allemand B1",
  description: "Huit séquences pour raconter ses expériences, expliquer son point de vue et agir avec plus d’autonomie dans la vie sociale et professionnelle.",
  chapters: [
    { title: "Erfahrungen und Lebensweg", topics: ["Raconter une expérience", "Présenter son parcours", "Organiser un récit"], grammar: ["Perfekt et Präteritum", "Connecteurs temporels", "Place du verbe"] },
    { title: "Zusammenleben und Meinung", topics: ["Exprimer un accord ou un désaccord", "Argumenter avec respect", "Parler de règles communes"], grammar: ["obwohl et trotzdem", "weil et deshalb", "Ordre des propositions"] },
    { title: "Ausbildung und Beruf", topics: ["Présenter ses compétences", "Répondre à une annonce", "Préparer un entretien"], grammar: ["um ... zu et damit", "Infinitif avec zu", "Propositions subordonnées"] },
    { title: "Medien und Nachrichten", topics: ["Comprendre une information", "Distinguer fait et opinion", "Parler des médias"], grammar: ["Passif au présent", "Questions indirectes", "ob et mots interrogatifs"] },
    { title: "Umwelt und Konsum", topics: ["Décrire un problème environnemental", "Comparer des habitudes", "Proposer des solutions"], grammar: ["Konjunktiv II de conseil", "damit et um ... zu", "Comparatifs de révision"] },
    { title: "Gesundheit und Alltag", topics: ["Décrire un besoin de santé", "Demander conseil", "Expliquer une démarche"], grammar: ["Verbes avec préposition", "da- et wo- composés", "Questions indirectes"] },
    { title: "Wohnen und Gesellschaft", topics: ["Décrire son quartier", "Parler de mobilité", "Présenter une initiative locale"], grammar: ["Relatives au datif", "Prépositions locales", "Connecteurs d’argumentation"] },
    { title: "Pläne und Diskussion", topics: ["Présenter un projet", "Défendre une proposition", "Faire le bilan de ses acquis"], grammar: ["Konjunktiv II poli", "Futur et hypothèses", "Connecteurs pour structurer un avis"] },
  ],
  learningMaterials: ["Huit leçons avec dialogues prononcés en allemand", "Vocabulaire contextualisé et révision grammaticale", "Exercices de production personnelle", "Quiz corrigés avec score et suivi de progression"],
};

const a1Chapters: GermanProgramChapter[] = [
  {
    title: "Chapitre 1 · Guten Tag!",
    duration: "25 min",
    objectives: ["Se présenter et demander le nom d’une personne", "Dire son origine et les langues parlées", "Épeler un nom et poser une question simple"],
    explanation: ["Pour se présenter, associez les informations dans un ordre simple : « Ich heiße… », « Ich komme aus… » et « Ich spreche… ». Dans un premier échange, les questions en W- permettent de demander une information précise : wie (comment/quel), woher (d’où), was (quoi).", "Le verbe sein est irrégulier : ich bin, du bist, er/sie/es ist, wir sind, ihr seid, sie/Sie sind. Dans une phrase déclarative, le verbe conjugué occupe généralement la deuxième position. Pour épeler, utilisez « Wie schreibt man das? » puis nommez les lettres."],
    vocabulary: [{ word: "heißen", meaning: "s’appeler", pronunciation: "haï-sen" }, { word: "kommen aus", meaning: "venir de", pronunciation: "ko-men aous" }, { word: "sprechen", meaning: "parler", pronunciation: "chprè-khen" }, { word: "buchstabieren", meaning: "épeler", pronunciation: "boukh-chta-bi-ren" }],
    examples: [{ german: "Ich heiße Lina und komme aus Syrien.", french: "Je m’appelle Lina et je viens de Syrie.", note: "Deux informations reliées par und." }, { german: "Welche Sprachen sprichst du?", french: "Quelles langues parles-tu ?", note: "Question en W- avec le verbe en deuxième position." }],
    grammarSummary: ["sein : ich bin, du bist, er/sie/es ist, wir sind, ihr seid, sie/Sie sind.", "Question en W- : mot interrogatif + verbe + sujet ? Exemple : Woher kommst du?", "Phrase déclarative : le verbe conjugué est en deuxième position."],
    dialogue: [{ speaker: "A", german: "Guten Tag! Wie heißt du?", french: "Bonjour ! Comment t’appelles-tu ?" }, { speaker: "B", german: "Ich heiße Samira. Und du?", french: "Je m’appelle Samira. Et toi ?" }, { speaker: "A", german: "Ich bin Paul. Woher kommst du?", french: "Je suis Paul. Tu viens d’où ?" }, { speaker: "B", german: "Ich komme aus Marokko und spreche Arabisch und Französisch.", french: "Je viens du Maroc et je parle arabe et français." }],
    portfolioTask: "Enregistrez ou écrivez une présentation de quatre phrases : nom, origine, langues parlées et une question à poser à un camarade.",
    quiz: { mode: "single", question: "Complétez : Ich ___ aus Guinea.", options: ["bist", "bin", "ist"], answers: ["bin"], explanation: "Avec le pronom ich, le verbe sein se conjugue bin : « Ich bin aus Guinea »." , audioPrompt: "Ich bin aus Guinea." },
  },
  {
    title: "Chapitre 2 · Freunde, Kollegen und ich",
    duration: "25 min",
    objectives: ["Présenter un membre de sa famille ou un collègue", "Décrire une personne et nommer sa profession", "Utiliser les possessifs mein et dein"],
    explanation: ["Pour parler d’une personne, combinez un prénom ou un pronom, une profession et une caractéristique : « Das ist mein Bruder. Er ist Mechaniker. » Les noms allemands prennent une majuscule ; l’article aide à apprendre leur genre.", "Les possessifs mein et dein s’accordent avec le nom qui suit : mein Bruder, meine Schwester, mein Kind. Pour parler de plusieurs personnes, de nombreux noms forment leur pluriel avec -e, -en, -er ou sans terminaison ; mémorisez le pluriel avec le nom."],
    vocabulary: [{ word: "die Familie", meaning: "la famille", pronunciation: "di fa-mi-li-eu" }, { word: "der Kollege / die Kollegin", meaning: "le collègue / la collègue", pronunciation: "ko-lé-gue / ko-lé-guin" }, { word: "der Beruf", meaning: "la profession", pronunciation: "be-rouf" }, { word: "freundlich", meaning: "sympathique", pronunciation: "froïnt-likh" }],
    examples: [{ german: "Das ist meine Schwester. Sie ist Ärztin.", french: "Voici ma sœur. Elle est médecin.", note: "meine s’accorde avec le nom féminin Schwester." }, { german: "Mein Kollege arbeitet in Berlin.", french: "Mon collègue travaille à Berlin.", note: "mein accompagne le nom masculin Kollege." }],
    grammarSummary: ["mein + nom masculin/neutre : mein Bruder, mein Kind.", "meine + nom féminin ou pluriel : meine Schwester, meine Freunde.", "La terminaison du verbe change avec le sujet : ich arbeite, du arbeitest, er arbeitet."],
    dialogue: [{ speaker: "A", german: "Wer ist das?", french: "Qui est-ce ?" }, { speaker: "B", german: "Das ist mein Kollege David. Er ist Ingenieur.", french: "C’est mon collègue David. Il est ingénieur." }, { speaker: "A", german: "Und wer ist die Frau dort?", french: "Et qui est la femme là-bas ?" }, { speaker: "B", german: "Das ist seine Frau. Sie arbeitet als Lehrerin.", french: "C’est sa femme. Elle travaille comme enseignante." }],
    portfolioTask: "Créez une fiche de présentation de deux personnes de votre entourage avec leur lien, leur profession et une qualité.",
    quiz: { mode: "single", question: "Quelle phrase signifie « Voici ma sœur » ?", options: ["Das ist mein Schwester.", "Das ist meine Schwester.", "Das ist meine Bruder."], answers: ["Das ist meine Schwester."], explanation: "Schwester est féminin : on emploie meine. Bruder est masculin : mein Bruder.", audioPrompt: "Das ist meine Schwester." },
  },
  {
    title: "Chapitre 3 · Essen und Trinken",
    duration: "25 min",
    objectives: ["Nommer des aliments et des boissons", "Commander au café", "Demander un prix et une quantité"],
    explanation: ["Au café, une demande polie peut commencer par « Ich möchte… » (je voudrais) ou se terminer par « bitte ». Pour demander le prix, dites « Was kostet…? ». Apprenez les aliments avec leur article et ajoutez des quantités simples : ein Kilo, eine Flasche, ein Stück.", "L’accusatif marque notamment le complément direct. Au masculin, l’article change : der Kaffee devient ich nehme einen Kaffee. Les articles féminins et neutres gardent généralement leur forme : eine Suppe, ein Wasser. Haben sert à exprimer ce que l’on a ou ce que l’on souhaite commander."],
    vocabulary: [{ word: "das Getränk", meaning: "la boisson", pronunciation: "gué-trèngk" }, { word: "die Rechnung", meaning: "l’addition", pronunciation: "rèkh-noung" }, { word: "bestellen", meaning: "commander", pronunciation: "be-ch tè-len" }, { word: "ein Stück Kuchen", meaning: "une part de gâteau", pronunciation: "aïn chtuk kou-khen" }],
    examples: [{ german: "Ich möchte einen Tee und ein Stück Kuchen, bitte.", french: "Je voudrais un thé et une part de gâteau, s’il vous plaît.", note: "einen est l’article masculin à l’accusatif." }, { german: "Was kostet die Flasche Wasser?", french: "Combien coûte la bouteille d’eau ?", note: "Was kostet…? permet de demander un prix." }],
    grammarSummary: ["Accusatif masculin : der → den, ein → einen.", "Accusatif féminin : die/eine restent die/eine ; neutre : das/ein restent das/ein.", "haben : ich habe, du hast, er/sie/es hat, wir haben, ihr habt, sie/Sie haben."],
    dialogue: [{ speaker: "Service", german: "Guten Tag. Was möchten Sie?", french: "Bonjour. Que désirez-vous ?" }, { speaker: "Client", german: "Ich nehme einen Kaffee und zwei Brötchen, bitte.", french: "Je prends un café et deux petits pains, s’il vous plaît." }, { speaker: "Service", german: "Gern. Sonst noch etwas?", french: "Avec plaisir. Autre chose ?" }, { speaker: "Client", german: "Nein, danke. Was kostet das?", french: "Non, merci. Combien cela coûte-t-il ?" }],
    portfolioTask: "Rédigez une commande de café comprenant trois articles, une quantité et une question sur le prix.",
    quiz: { mode: "single", question: "Complétez : Ich möchte ___ Kaffee.", options: ["ein", "einen", "eine"], answers: ["einen"], explanation: "Kaffee est masculin et complément direct : l’article devient einen à l’accusatif.", audioPrompt: "Ich möchte einen Kaffee." },
  },
  {
    title: "Chapitre 4 · Alltag und Freizeit",
    duration: "25 min",
    objectives: ["Décrire une journée type et donner l’heure", "Parler de ses loisirs", "Employer un verbe à particule séparable"],
    explanation: ["Pour raconter sa routine, utilisez des verbes fréquents comme aufstehen (se lever), anfangen (commencer) ou einkaufen (faire des courses). Au présent, la particule séparable se place en fin de phrase : « Ich stehe um sieben Uhr auf. »", "Pour demander l’heure, dites « Wie spät ist es? ». Pour situer une activité, « um » introduit l’heure exacte : um acht Uhr. Le sujet peut être suivi d’un complément avant le verbe, mais le verbe conjugué reste en deuxième position."],
    vocabulary: [{ word: "der Alltag", meaning: "le quotidien", pronunciation: "al-tak" }, { word: "aufstehen", meaning: "se lever", pronunciation: "aouf-chté-en" }, { word: "die Freizeit", meaning: "le temps libre", pronunciation: "fraï-tsaït" }, { word: "um halb neun", meaning: "à huit heures et demie", pronunciation: "oum halb noïn" }],
    examples: [{ german: "Ich stehe um sechs Uhr auf.", french: "Je me lève à six heures.", note: "La particule auf se place en fin de phrase." }, { german: "Am Samstag spiele ich Fußball.", french: "Le samedi, je joue au football.", note: "Le complément initial am Samstag précède le verbe conjugué." }],
    grammarSummary: ["Verbe séparable : préfixe à la fin, par exemple aufstehen → Ich stehe früh auf.", "Le verbe conjugué reste en deuxième position dans la phrase déclarative.", "um + heure : um sieben Uhr."],
    dialogue: [{ speaker: "A", german: "Wann stehst du normalerweise auf?", french: "À quelle heure te lèves-tu normalement ?" }, { speaker: "B", german: "Ich stehe um halb sieben auf. Danach frühstücke ich.", french: "Je me lève à six heures et demie. Ensuite, je prends mon petit-déjeuner." }, { speaker: "A", german: "Was machst du am Abend?", french: "Que fais-tu le soir ?" }, { speaker: "B", german: "Ich lese gern oder treffe Freunde.", french: "J’aime lire ou retrouver des amis." }],
    portfolioTask: "Présentez votre journée en cinq étapes et ajoutez une activité que vous aimez faire pendant votre temps libre.",
    quiz: { mode: "single", question: "Où place-t-on la particule dans « aufstehen » au présent ?", options: ["Avant le sujet", "À la fin de la phrase", "Juste après le sujet dans tous les cas"], answers: ["À la fin de la phrase"], explanation: "Dans une phrase principale, la particule séparable se place à la fin : Ich stehe um sieben Uhr auf.", audioPrompt: "Ich stehe um sieben Uhr auf.", speakOptions: false },
  },
  {
    title: "Chapitre 5 · Kontakte",
    duration: "25 min",
    objectives: ["Comprendre et laisser un message téléphonique simple", "Écrire un e-mail court", "Proposer et fixer un rendez-vous"],
    explanation: ["Pour organiser un rendez-vous, proposez un jour et une heure : « Hast du am Freitag Zeit? ». Le verbe modal können permet de parler d’une possibilité ou d’une disponibilité. Il se conjugue avec le sujet et l’infinitif reste en fin de phrase.", "Dans un e-mail simple, indiquez une formule d’appel, le motif, une proposition concrète puis une formule de fin. L’impératif sert à donner une consigne ou une invitation : « Ruf mich an! » (Appelle-moi !)."],
    vocabulary: [{ word: "anrufen", meaning: "téléphoner", pronunciation: "an-rou-fen" }, { word: "die Nachricht", meaning: "le message", pronunciation: "nakh-rikht" }, { word: "der Termin", meaning: "le rendez-vous", pronunciation: "tèr-min" }, { word: "Zeit haben", meaning: "avoir le temps", pronunciation: "tsaït ha-ben" }],
    examples: [{ german: "Kannst du mich heute Abend anrufen?", french: "Peux-tu m’appeler ce soir ?", note: "Le verbe modal est conjugué, l’infinitif est en fin de phrase." }, { german: "Treffen wir uns um 18 Uhr?", french: "On se retrouve à 18 heures ?", note: "Proposition simple pour fixer un rendez-vous." }],
    grammarSummary: ["können : ich kann, du kannst, er/sie/es kann, wir können, ihr könnt, sie/Sie können.", "Avec un modal, l’infinitif se place en fin : Ich kann morgen kommen.", "Impératif familier : Ruf mich an! / Kommt bitte pünktlich!"],
    dialogue: [{ speaker: "A", german: "Hallo, hier ist Nora. Hast du am Freitag Zeit?", french: "Salut, c’est Nora. Tu es libre vendredi ?" }, { speaker: "B", german: "Ja, ab sechs Uhr. Können wir zusammen essen?", french: "Oui, à partir de six heures. Est-ce qu’on peut dîner ensemble ?" }, { speaker: "A", german: "Gern. Ruf mich bitte an, wenn du da bist.", french: "Avec plaisir. Appelle-moi quand tu seras là." }, { speaker: "B", german: "Alles klar. Bis Freitag!", french: "Entendu. À vendredi !" }],
    portfolioTask: "Écrivez un e-mail court pour proposer un rendez-vous et préparez le message vocal que vous laisseriez en cas d’absence.",
    quiz: { mode: "single", question: "Complétez : Ich kann morgen ___ .", options: ["komme", "kommen", "kommt"], answers: ["kommen"], explanation: "Après le modal kann, le verbe principal reste à l’infinitif en fin de phrase.", audioPrompt: "Ich kann morgen kommen." },
  },
  {
    title: "Chapitre 6 · Orientierung",
    duration: "25 min",
    objectives: ["Demander et indiquer un itinéraire", "Nommer des lieux et moyens de transport", "Situer un lieu avec une préposition"],
    explanation: ["Pour demander un chemin, commencez par « Entschuldigung, wie komme ich zum Bahnhof? ». Les indications de direction utilisent des impératifs ou des repères : gehen Sie geradeaus (allez tout droit), links (à gauche), rechts (à droite).", "Les prépositions in, auf et an peuvent exprimer une position avec le datif. Dans une direction vers un lieu, certaines prépositions prennent l’accusatif : « Ich gehe in die Stadt » (je vais en ville), mais « Ich bin in der Stadt » (je suis en ville)."],
    vocabulary: [{ word: "der Bahnhof", meaning: "la gare", pronunciation: "ban-hof" }, { word: "die Haltestelle", meaning: "l’arrêt", pronunciation: "hal-teu-chtèl-leu" }, { word: "geradeaus", meaning: "tout droit", pronunciation: "gue-ra-de-aous" }, { word: "umsteigen", meaning: "changer de transport", pronunciation: "oum-chtai-guen" }],
    examples: [{ german: "Gehen Sie geradeaus und dann links.", french: "Allez tout droit puis à gauche.", note: "Impératif de politesse avec Sie." }, { german: "Die Apotheke ist neben dem Bahnhof.", french: "La pharmacie est à côté de la gare.", note: "dem Bahnhof est au datif après neben pour une position." }],
    grammarSummary: ["Position (où ?) : datif après les prépositions mixtes, par exemple in der Stadt.", "Direction (vers où ?) : accusatif, par exemple in die Stadt.", "Indications : geradeaus, links, rechts, an der Ecke."],
    dialogue: [{ speaker: "Voyageur", german: "Entschuldigung, wie komme ich zum Museum?", french: "Excusez-moi, comment aller au musée ?" }, { speaker: "Habitant", german: "Gehen Sie geradeaus bis zur Ampel und dann rechts.", french: "Allez tout droit jusqu’au feu puis à droite." }, { speaker: "Voyageur", german: "Ist das weit?", french: "Est-ce loin ?" }, { speaker: "Habitant", german: "Nein, das Museum ist neben dem Bahnhof.", french: "Non, le musée est à côté de la gare." }],
    portfolioTask: "Dessinez ou décrivez un itinéraire entre deux lieux de votre ville avec au moins trois étapes.",
    quiz: { mode: "single", question: "Quelle phrase indique une position : « Je suis en ville » ?", options: ["Ich gehe in die Stadt.", "Ich bin in der Stadt.", "Ich fahre die Stadt."], answers: ["Ich bin in der Stadt."], explanation: "La phrase décrit une position (où ?) : le datif apparaît après in, ici in der Stadt.", audioPrompt: "Ich bin in der Stadt." },
  },
];

const a2Chapters: GermanProgramChapter[] = [
  {
    title: "Chapitre 7 · Kleidung & Einkaufen",
    duration: "30 min",
    objectives: ["Décrire un vêtement, sa taille et sa couleur", "Demander un article et essayer un produit", "Demander un échange ou un retour"],
    explanation: ["En magasin, précisez le type de vêtement, la taille et la couleur : « Ich suche eine blaue Jacke in Größe M. » Pour comparer deux produits, le comparatif se forme souvent avec -er : billig, billiger (bon marché, moins cher).", "L’adjectif placé devant un nom reçoit une terminaison qui dépend de l’article, du genre, du nombre et du cas. Au niveau A2, apprenez les formes fréquentes dans des expressions complètes : ein rotes Kleid, eine schwarze Hose, der blaue Pullover."],
    vocabulary: [{ word: "die Größe", meaning: "la taille", pronunciation: "greu-seu" }, { word: "umtauschen", meaning: "échanger", pronunciation: "oum-taou-chen" }, { word: "passen", meaning: "aller (pour un vêtement)", pronunciation: "pa-sen" }, { word: "die Umkleidekabine", meaning: "la cabine d’essayage", pronunciation: "oum-klaï-deu-ka-bi-neu" }],
    examples: [{ german: "Haben Sie diese Jacke auch in Größe M?", french: "Avez-vous aussi cette veste en taille M ?", note: "Formule polie pour demander une autre taille." }, { german: "Die blaue Jacke ist leichter als die schwarze.", french: "La veste bleue est plus légère que la noire.", note: "Comparatif avec als pour comparer deux éléments." }],
    grammarSummary: ["Comparatif : adjectif + -er, souvent suivi de als : wärmer als (plus chaud que).", "L’adjectif épithète prend une terminaison : eine kleine Tasche, ein rotes Kleid.", "Pour un retour : Ich möchte das Produkt umtauschen / zurückgeben."],
    dialogue: [{ speaker: "Client", german: "Guten Tag. Ich suche eine warme Jacke.", french: "Bonjour. Je cherche une veste chaude." }, { speaker: "Vendeuse", german: "Welche Größe tragen Sie?", french: "Quelle taille portez-vous ?" }, { speaker: "Client", german: "Größe M. Kann ich diese Jacke anprobieren?", french: "Taille M. Puis-je essayer cette veste ?" }, { speaker: "Client", german: "Sie ist zu klein. Kann ich sie umtauschen?", french: "Elle est trop petite. Puis-je l’échanger ?" }],
    portfolioTask: "Comparez deux tenues et rédigez un dialogue de retour ou d’échange en magasin.",
    quiz: { mode: "single", question: "Complétez : Die Jacke ist ___ als der Mantel.", options: ["warm", "wärmer", "am wärmsten"], answers: ["wärmer"], explanation: "On compare deux vêtements : le comparatif de warm est wärmer et il est suivi de als.", audioPrompt: "Die Jacke ist wärmer als der Mantel." },
  },
  {
    title: "Chapitre 8 · Gesundheit",
    duration: "30 min",
    objectives: ["Expliquer un symptôme au médecin", "Comprendre un conseil ou une consigne", "Demander un produit à la pharmacie"],
    explanation: ["Pour parler de sa santé, décrivez le symptôme et depuis quand il existe : « Ich habe seit gestern Kopfschmerzen. » Le médecin peut poser une question sur la durée ou l’intensité ; répondez avec des phrases courtes et précises.", "Les verbes modaux müssen (devoir) et sollen (être censé/devoir selon un conseil) se conjuguent avec le sujet et envoient l’infinitif en fin de phrase. L’impératif sert à donner une consigne : « Nehmen Sie diese Tabletten zweimal täglich. »"],
    vocabulary: [{ word: "die Beschwerden", meaning: "les symptômes / troubles", pronunciation: "be-chver-den" }, { word: "Kopfschmerzen", meaning: "maux de tête", pronunciation: "kopf-chmèr-tsen" }, { word: "die Apotheke", meaning: "la pharmacie", pronunciation: "a-po-té-keu" }, { word: "zweimal täglich", meaning: "deux fois par jour", pronunciation: "tsvaï-mal tèg-likh" }],
    examples: [{ german: "Ich muss heute zum Arzt gehen.", french: "Je dois aller chez le médecin aujourd’hui.", note: "muss est conjugué, gehen reste à l’infinitif en fin de phrase." }, { german: "Sie sollen viel Wasser trinken.", french: "Vous devriez boire beaucoup d’eau.", note: "sollen exprime ici une recommandation." }],
    grammarSummary: ["müssen : obligation ; sollen : conseil ou consigne rapportée.", "Verbe modal en deuxième position + infinitif à la fin : Ich muss mich ausruhen.", "Impératif poli : Nehmen Sie… / Trinken Sie…"],
    dialogue: [{ speaker: "Médecin", german: "Was fehlt Ihnen?", french: "Qu’est-ce qui vous arrive ?" }, { speaker: "Patient", german: "Ich habe seit zwei Tagen Halsschmerzen.", french: "J’ai mal à la gorge depuis deux jours." }, { speaker: "Médecin", german: "Sie sollen viel trinken und sich ausruhen.", french: "Vous devriez beaucoup boire et vous reposer." }, { speaker: "Patient", german: "Muss ich die Tabletten nehmen?", french: "Dois-je prendre les comprimés ?" }],
    portfolioTask: "Rédigez une fiche de symptômes puis trois conseils de santé avec sollen ou müssen.",
    quiz: { mode: "single", question: "Complétez : Bei Fieber ___ Sie viel Wasser trinken.", options: ["sollen", "soll", "sollst"], answers: ["sollen"], explanation: "La formule s’adresse poliment à Sie : le verbe modal est sollen.", audioPrompt: "Bei Fieber sollen Sie viel Wasser trinken." },
  },
  {
    title: "Chapitre 9 · Arbeit & Beruf",
    duration: "30 min",
    objectives: ["Comprendre une annonce d’emploi simple", "Présenter son expérience et ses conditions de travail", "Relier deux idées avec weil et dass"],
    explanation: ["Une candidature courte présente le poste recherché, une expérience et une disponibilité. Lisez les informations essentielles d’une annonce : tâches, horaires, lieu et exigences. Un CV simple privilégie les dates, formations et expériences clairement identifiées.", "Dans une subordonnée introduite par weil (parce que) ou dass (que), le verbe conjugué se place à la fin : « Ich suche Arbeit, weil ich Erfahrung habe. » La subordonnée peut venir après la principale ou au début, auquel cas le verbe de la principale vient juste après la virgule."],
    vocabulary: [{ word: "die Bewerbung", meaning: "la candidature", pronunciation: "be-vèr-boung" }, { word: "die Erfahrung", meaning: "l’expérience", pronunciation: "èr-fa-roung" }, { word: "die Arbeitszeit", meaning: "les horaires de travail", pronunciation: "ar-baïts-tsaït" }, { word: "die Stelle", meaning: "le poste", pronunciation: "chtèl-leu" }],
    examples: [{ german: "Ich bewerbe mich, weil die Stelle interessant ist.", french: "Je postule parce que le poste est intéressant.", note: "Le verbe ist se place à la fin de la subordonnée en weil." }, { german: "Ich glaube, dass ich gut im Team arbeiten kann.", french: "Je crois que je peux bien travailler en équipe.", note: "Avec dass, le groupe verbal est rejeté en fin de subordonnée." }],
    grammarSummary: ["weil + sujet + compléments + verbe conjugué à la fin.", "dass introduit une proposition complétive : Ich denke, dass…", "Si la subordonnée ouvre la phrase, le verbe principal suit immédiatement la virgule."],
    dialogue: [{ speaker: "Recruteur", german: "Warum interessieren Sie sich für diese Stelle?", french: "Pourquoi ce poste vous intéresse-t-il ?" }, { speaker: "Candidat", german: "Ich bewerbe mich, weil ich gern im Team arbeite.", french: "Je postule parce que j’aime travailler en équipe." }, { speaker: "Recruteur", german: "Haben Sie schon Berufserfahrung?", french: "Avez-vous déjà de l’expérience professionnelle ?" }, { speaker: "Candidat", german: "Ja, ich habe zwei Jahre in einer Werkstatt gearbeitet.", french: "Oui, j’ai travaillé deux ans dans un atelier." }],
    portfolioTask: "Préparez une mini-candidature avec un paragraphe de motivation contenant weil et une phrase avec dass.",
    quiz: { mode: "single", question: "Où se place le verbe dans « weil ich heute ___ » ?", options: ["arbeite", "heute", "weil"], answers: ["arbeite"], explanation: "Dans la subordonnée en weil, le verbe conjugué se place à la fin : weil ich heute arbeite.", audioPrompt: "Ich bewerbe mich, weil die Stelle interessant ist." },
  },
  {
    title: "Chapitre 10 · Wohnen",
    duration: "30 min",
    objectives: ["Décrire son logement et son quartier", "Signaler un problème dans un appartement", "Appeler un propriétaire pour demander une intervention"],
    explanation: ["Pour décrire un logement, présentez les pièces, les équipements et leur emplacement. Les prépositions mixtes (in, an, auf, unter…) utilisent le datif pour une position fixe et l’accusatif pour un déplacement vers un lieu.", "Pour signaler un problème, indiquez ce qui ne fonctionne pas, depuis quand et ce que vous demandez : « Die Heizung funktioniert seit gestern nicht. Könnten Sie bitte jemanden schicken? » Restez précis et poli lors d’un appel au propriétaire."],
    vocabulary: [{ word: "die Heizung", meaning: "le chauffage", pronunciation: "haï-tsoung" }, { word: "der Vermieter", meaning: "le propriétaire bailleur", pronunciation: "fèr-mi-ter" }, { word: "die Miete", meaning: "le loyer", pronunciation: "mi-teu" }, { word: "kaputt sein", meaning: "être en panne / cassé", pronunciation: "ka-pout zaïn" }],
    examples: [{ german: "Das Sofa steht im Wohnzimmer.", french: "Le canapé se trouve dans le salon.", note: "Position fixe : datif dans dem → im." }, { german: "Ich stelle den Tisch in die Küche.", french: "Je place la table dans la cuisine.", note: "Déplacement vers un lieu : accusatif après in." }],
    grammarSummary: ["Wo? (où, position) → datif : in der Küche, auf dem Tisch.", "Wohin? (vers où, déplacement) → accusatif : in die Küche, auf den Tisch.", "Appel poli : Könnten Sie bitte…?"],
    dialogue: [{ speaker: "Locataire", german: "Guten Tag. Die Heizung funktioniert nicht.", french: "Bonjour. Le chauffage ne fonctionne pas." }, { speaker: "Propriétaire", german: "Seit wann gibt es das Problem?", french: "Depuis quand y a-t-il ce problème ?" }, { speaker: "Locataire", german: "Seit gestern. Könnten Sie bitte jemanden schicken?", french: "Depuis hier. Pourriez-vous envoyer quelqu’un, s’il vous plaît ?" }, { speaker: "Propriétaire", german: "Ja, ich kümmere mich darum.", french: "Oui, je m’en occupe." }],
    portfolioTask: "Décrivez votre logement et rédigez un court message au propriétaire au sujet d’un problème concret.",
    quiz: { mode: "single", question: "Complétez la position : Die Lampe hängt ___ der Küche.", options: ["in die", "in der", "in den"], answers: ["in der"], explanation: "La lampe est déjà située dans la cuisine (Wo?) : la position fixe demande le datif, in der Küche.", audioPrompt: "Die Lampe hängt in der Küche." },
  },
  {
    title: "Chapitre 11 · Freizeit & Medien",
    duration: "30 min",
    objectives: ["Parler de ses médias et loisirs", "Inviter quelqu’un à un événement", "Raconter un projet ou une expérience récente"],
    explanation: ["Pour inviter une personne, proposez une activité et une date, puis demandez si elle est disponible. Vous pouvez accepter, refuser poliment ou suggérer une autre date. Les messages courts gagnent à préciser le lieu et l’heure.", "Le Perfekt sert à raconter des événements passés à l’oral : haben/sein conjugué + participe passé en fin de phrase. Le Futur I se forme avec werden conjugué et l’infinitif à la fin : « Wir werden am Samstag einen Film sehen. »"],
    vocabulary: [{ word: "die Einladung", meaning: "l’invitation", pronunciation: "aïn-la-doung" }, { word: "die Veranstaltung", meaning: "l’événement", pronunciation: "fèr-chan-chal-toung" }, { word: "die Sendung", meaning: "l’émission", pronunciation: "zen-doung" }, { word: "sich verabreden", meaning: "se donner rendez-vous", pronunciation: "fèr-a-bre-den" }],
    examples: [{ german: "Am Wochenende habe ich einen Film gesehen.", french: "Le week-end, j’ai regardé un film.", note: "Perfekt : auxiliaire habe et participe gesehen en fin." }, { german: "Wir werden morgen ins Konzert gehen.", french: "Nous irons au concert demain.", note: "Futur I : werden conjugué + infinitif final." }],
    grammarSummary: ["Perfekt : haben/sein conjugué + participe passé en fin de proposition.", "Futur I : werden conjugué + infinitif en fin de proposition.", "Invitation : Hast du Lust, mitzukommen? (Cela te dit de venir ?)"],
    dialogue: [{ speaker: "A", german: "Hast du am Samstag Lust auf Kino?", french: "Ça te dit d’aller au cinéma samedi ?" }, { speaker: "B", german: "Gern! Welchen Film wollen wir sehen?", french: "Avec plaisir ! Quel film voulons-nous voir ?" }, { speaker: "A", german: "Ich habe eine Komödie im Internet gesehen.", french: "J’ai vu une comédie sur Internet." }, { speaker: "B", german: "Super. Danach werden wir etwas essen.", french: "Super. Après, nous irons manger quelque chose." }],
    portfolioTask: "Écrivez une invitation à un événement, puis répondez en acceptant ou en proposant une autre date.",
    quiz: { mode: "single", question: "Quelle phrase est au Perfekt ?", options: ["Ich sehe einen Film.", "Ich habe einen Film gesehen.", "Ich werde einen Film sehen."], answers: ["Ich habe einen Film gesehen."], explanation: "Le Perfekt utilise un auxiliaire conjugué suivi du participe passé en fin de phrase.", audioPrompt: "Ich habe einen Film gesehen." },
  },
  {
    title: "Chapitre 12 · Reisen",
    duration: "30 min",
    objectives: ["Réserver un hébergement ou un trajet", "Demander des renseignements touristiques", "Décrire un lieu avec une proposition relative"],
    explanation: ["Lors d’une réservation, indiquez les dates, le nombre de personnes et le type de chambre ou de billet souhaité. À l’office de tourisme, demandez les horaires, les accès et les lieux à visiter. Reformulez les informations importantes pour vérifier que vous avez bien compris.", "Une proposition relative complète un nom et commence par un pronom relatif : der pour un antécédent masculin sujet, die pour un féminin sujet et das pour un neutre sujet. Le verbe conjugué se place à la fin de la proposition relative."],
    vocabulary: [{ word: "die Unterkunft", meaning: "l’hébergement", pronunciation: "oun-ter-kounft" }, { word: "die Reservierung", meaning: "la réservation", pronunciation: "ré-zèr-vi-rונג" }, { word: "die Sehenswürdigkeit", meaning: "le site touristique", pronunciation: "zé-ens-vur-dikh-kaït" }, { word: "die Fahrkarte", meaning: "le billet de transport", pronunciation: "far-kar-teu" }],
    examples: [{ german: "Das ist das Hotel, das ich reserviert habe.", french: "C’est l’hôtel que j’ai réservé.", note: "La relative décrit Hotel et place habe à la fin." }, { german: "Wir suchen einen Zug, der direkt nach Köln fährt.", french: "Nous cherchons un train qui va directement à Cologne.", note: "der reprend Zug et le verbe fährt termine la relative." }],
    grammarSummary: ["Pronom relatif au nominatif : der (masculin), die (féminin), das (neutre), die (pluriel).", "Le verbe conjugué se place à la fin de la proposition relative.", "Réservation : Ich möchte ein Zimmer für zwei Nächte reservieren."],
    dialogue: [{ speaker: "Voyageur", german: "Guten Tag. Ich möchte ein Zimmer für zwei Nächte reservieren.", french: "Bonjour. Je voudrais réserver une chambre pour deux nuits." }, { speaker: "Accueil", german: "Ein Einzelzimmer oder ein Doppelzimmer?", french: "Une chambre simple ou double ?" }, { speaker: "Voyageur", german: "Ein Doppelzimmer. Haben Sie ein Zimmer, das ruhig ist?", french: "Une chambre double. Avez-vous une chambre qui est calme ?" }, { speaker: "Accueil", german: "Ja, wir haben ein Zimmer, das zum Innenhof liegt.", french: "Oui, nous avons une chambre qui donne sur la cour intérieure." }],
    portfolioTask: "Préparez une demande de réservation et une courte fiche touristique sur un lieu que vous aimeriez visiter.",
    quiz: { mode: "single", question: "Complétez : Das ist das Hotel, ___ ich reserviert habe.", options: ["der", "die", "das"], answers: ["das"], explanation: "Hotel est neutre : le pronom relatif au nominatif est das. Le verbe de la relative reste en fin.", audioPrompt: "Das ist das Hotel, das ich reserviert habe." },
  },
];

const b1Chapters: GermanProgramChapter[] = [
  {
    title: "Chapitre 1 · Erfahrungen und Lebensweg",
    duration: "35 min",
    objectives: ["Raconter une expérience passée de façon structurée", "Présenter les étapes de son parcours", "Employer des connecteurs temporels"],
    explanation: ["Pour raconter une expérience, situe d’abord le contexte, puis les événements et enfin leur résultat. À l’oral, le Perfekt est fréquent : « Ich habe ein Praktikum gemacht ». Le Präteritum apparaît surtout avec sein, haben et les verbes modaux : « Ich war in Berlin ».", "Des connecteurs comme zuerst, danach, während et schließlich rendent le récit plus clair. Dans une proposition introduite par während ou nachdem, le verbe conjugué se place à la fin ; le verbe de la proposition principale vient ensuite."],
    vocabulary: [{ word: "die Erfahrung", meaning: "l’expérience", pronunciation: "èr-fa-roung" }, { word: "der Lebenslauf", meaning: "le parcours / CV", pronunciation: "lé-bens-laouf" }, { word: "zuerst", meaning: "d’abord", pronunciation: "tsou-èrst" }, { word: "schließlich", meaning: "finalement", pronunciation: "chlis-likh" }],
    examples: [{ german: "Zuerst habe ich ein Praktikum gemacht, danach fand ich eine Stelle.", french: "D’abord, j’ai fait un stage, ensuite j’ai trouvé un poste.", note: "zuerst et danach ordonnent les événements." }, { german: "Während ich in Hamburg war, habe ich viel Deutsch gesprochen.", french: "Pendant que j’étais à Hambourg, j’ai beaucoup parlé allemand.", note: "Le verbe de la proposition en während est placé à la fin." }],
    grammarSummary: ["Perfekt : auxiliaire haben/sein conjugué + participe passé en fin de proposition.", "Präteritum fréquent : ich war, ich hatte, ich konnte, ich musste.", "Connecteurs : zuerst, danach, während, schließlich."],
    dialogue: [{ speaker: "A", german: "Wie war dein Praktikum in Köln?", french: "Comment s’est passé ton stage à Cologne ?" }, { speaker: "B", german: "Es war sehr interessant. Zuerst habe ich im Büro gearbeitet.", french: "C’était très intéressant. D’abord, j’ai travaillé au bureau." }, { speaker: "A", german: "Und was hast du danach gemacht?", french: "Et qu’as-tu fait ensuite ?" }, { speaker: "B", german: "Danach habe ich ein eigenes Projekt vorbereitet.", french: "Ensuite, j’ai préparé un projet personnel." }],
    portfolioTask: "Raconte en six phrases une expérience de travail, d’étude ou de vie quotidienne en utilisant au moins trois connecteurs temporels.",
    quiz: { mode: "single", question: "Complète : Während ich in Berlin ___, habe ich viele Museen besucht.", options: ["war", "bin", "gewesen"], answers: ["war"], explanation: "Le récit est au passé et während introduit une subordonnée ; war est le Präteritum de sein et se place à la fin.", audioPrompt: "Während ich in Berlin war, habe ich viele Museen besucht." },
  },
  {
    title: "Chapitre 2 · Zusammenleben und Meinung",
    duration: "35 min",
    objectives: ["Exprimer et justifier un avis", "Nuancer un désaccord", "Relier deux idées opposées"],
    explanation: ["Pour donner un avis, utilise « Ich bin der Meinung, dass… » ou « Meiner Ansicht nach… ». Ajoute une raison, un exemple ou une conséquence afin que ton interlocuteur comprenne ton point de vue.", "obwohl introduit une concession et place le verbe à la fin : « Obwohl es regnet, gehen wir spazieren. » trotzdem relie deux propositions principales et garde le verbe en deuxième position : « Es regnet. Trotzdem gehen wir spazieren. »"],
    vocabulary: [{ word: "die Meinung", meaning: "l’avis", pronunciation: "maï-noung" }, { word: "zustimmen", meaning: "être d’accord", pronunciation: "tsou-chtim-men" }, { word: "der Vorschlag", meaning: "la proposition", pronunciation: "for-chlak" }, { word: "obwohl", meaning: "bien que", pronunciation: "op-vol" }],
    examples: [{ german: "Obwohl die Miete hoch ist, wohnen viele gern hier.", french: "Bien que le loyer soit élevé, beaucoup aiment vivre ici.", note: "Le verbe ist termine la proposition en obwohl." }, { german: "Ich verstehe deinen Punkt. Trotzdem sehe ich das anders.", french: "Je comprends ton point de vue. Malgré tout, je vois les choses autrement.", note: "trotzdem est suivi du verbe conjugué en deuxième position." }],
    grammarSummary: ["obwohl + sujet + compléments + verbe conjugué à la fin.", "trotzdem + verbe conjugué + sujet + compléments.", "Formules : Ich bin der Meinung, dass… / Ich stimme dir teilweise zu."],
    dialogue: [{ speaker: "A", german: "Soll die Straße im Zentrum autofrei werden?", french: "La rue du centre devrait-elle devenir piétonne ?" }, { speaker: "B", german: "Ich finde die Idee gut, obwohl manche Geschäfte dagegen sind.", french: "Je trouve l’idée bonne, bien que certains commerces soient contre." }, { speaker: "A", german: "Die Busse sind dort aber schon sehr voll.", french: "Mais les bus y sont déjà très pleins." }, { speaker: "B", german: "Das stimmt. Trotzdem könnten wir zuerst einen Versuch machen.", french: "C’est vrai. Malgré tout, nous pourrions d’abord faire un essai." }],
    portfolioTask: "Écris un avis de cinq phrases sur une règle de vie collective ; ajoute un argument avec obwohl et une proposition avec trotzdem.",
    quiz: { mode: "single", question: "Complète : Obwohl der Weg weit ist, ___ sie jeden Tag zu Fuß.", options: ["geht", "sie geht", "gehen"], answers: ["geht"], explanation: "Dans la proposition introduite par obwohl, le verbe conjugué se place à la fin.", audioPrompt: "Obwohl der Weg weit ist, geht sie jeden Tag zu Fuß." },
  },
  {
    title: "Chapitre 3 · Ausbildung und Beruf",
    duration: "35 min",
    objectives: ["Présenter ses compétences et son expérience", "Comprendre une annonce de formation ou d’emploi", "Formuler un objectif professionnel"],
    explanation: ["Une présentation professionnelle efficace cite une compétence, un exemple et un objectif. Pour expliquer le but d’une action avec le même sujet, emploie um … zu : « Ich lerne Deutsch, um in einem Team zu arbeiten. » Avec deux sujets différents, utilise damit.", "Après certains verbes et expressions, zu accompagne l’infinitif : « Ich habe vor, eine Weiterbildung zu machen. » Pour un verbe séparable, zu s’insère entre le préfixe et le verbe : « anzufangen »."],
    vocabulary: [{ word: "die Weiterbildung", meaning: "la formation continue", pronunciation: "vaï-ter-bil-doung" }, { word: "die Fähigkeit", meaning: "la compétence", pronunciation: "fé-khikh-kaït" }, { word: "sich bewerben", meaning: "postuler", pronunciation: "zikh be-vèr-ben" }, { word: "das Vorstellungsgespräch", meaning: "l’entretien d’embauche", pronunciation: "for-chtèl-loungs-gue-chprèkh" }],
    examples: [{ german: "Ich mache einen Deutschkurs, um mich besser bewerben zu können.", french: "Je suis un cours d’allemand pour pouvoir mieux postuler.", note: "um … zu exprime un objectif avec le même sujet." }, { german: "Die Firma bietet Kurse an, damit die Mitarbeitenden sich weiterbilden.", french: "L’entreprise propose des cours afin que les salariés puissent continuer à se former.", note: "damit est utilisé ici parce que les sujets des propositions diffèrent." }],
    grammarSummary: ["um … zu + infinitif : objectif lorsque le sujet est identique.", "damit + proposition avec verbe à la fin : sujets identiques ou différents.", "Verbe séparable + zu : anzufangen, sich vorzubereiten."],
    dialogue: [{ speaker: "Recruteuse", german: "Warum möchten Sie bei uns arbeiten?", french: "Pourquoi souhaitez-vous travailler chez nous ?" }, { speaker: "Candidat", german: "Ich möchte meine Erfahrung im Kundenservice einbringen.", french: "Je souhaite mettre à profit mon expérience du service client." }, { speaker: "Recruteuse", german: "Was möchten Sie noch lernen?", french: "Qu’aimeriez-vous encore apprendre ?" }, { speaker: "Candidat", german: "Ich plane, eine Weiterbildung im Projektmanagement zu machen.", french: "Je prévois de suivre une formation en gestion de projet." }],
    portfolioTask: "Rédige une courte présentation de candidature avec deux compétences, un exemple et une phrase d’objectif utilisant um … zu.",
    quiz: { mode: "single", question: "Complète : Sie besucht einen Kurs, ___ ihre Chancen zu verbessern.", options: ["um", "damit", "obwohl"], answers: ["um"], explanation: "Le même sujet (sie) réalise les deux actions ; la structure correcte est um … zu.", audioPrompt: "Sie besucht einen Kurs, um ihre Chancen zu verbessern." },
  },
  {
    title: "Chapitre 4 · Medien und Nachrichten",
    duration: "35 min",
    objectives: ["Résumer une information", "Distinguer un fait d’un commentaire", "Rapporter une question indirectement"],
    explanation: ["Pour résumer une nouvelle, indique le sujet, l’information principale et sa source. Des expressions comme « Der Bericht handelt von… » ou « Laut der Nachricht… » aident à attribuer l’information sans la présenter comme une certitude personnelle.", "Au présent, le passif se forme avec werden conjugué et le participe passé : « Die Straße wird gesperrt. » Une question indirecte devient une subordonnée : « Können Sie mir sagen, wann der Zug fährt? » Le verbe conjugué se place à la fin."],
    vocabulary: [{ word: "die Meldung", meaning: "l’information brève", pronunciation: "mèl-doung" }, { word: "die Quelle", meaning: "la source", pronunciation: "kvèl-leu" }, { word: "berichten über", meaning: "rendre compte de", pronunciation: "be-rikh-ten u-ber" }, { word: "zuverlässig", meaning: "fiable", pronunciation: "tsou-fèr-lè-sikh" }],
    examples: [{ german: "Die neue Brücke wird im Sommer eröffnet.", french: "Le nouveau pont sera inauguré en été.", note: "Passif présent : wird + participe passé eröffnet." }, { german: "Weißt du, wann die Sendung beginnt?", french: "Sais-tu quand l’émission commence ?", note: "Dans la question indirecte, beginnt termine la subordonnée." }],
    grammarSummary: ["Passif présent : werden conjugué + participe passé.", "Question indirecte avec mot interrogatif : mot + sujet + compléments + verbe final.", "ob introduit une question indirecte sans mot interrogatif."],
    dialogue: [{ speaker: "A", german: "Hast du die Meldung über den Bahnhof gelesen?", french: "As-tu lu l’information sur la gare ?" }, { speaker: "B", german: "Ja. Der Eingang wird nächste Woche repariert.", french: "Oui. L’entrée sera réparée la semaine prochaine." }, { speaker: "A", german: "Weißt du, ob die Busse dort halten?", french: "Sais-tu si les bus s’arrêtent là-bas ?" }, { speaker: "B", german: "Das steht noch nicht in der Nachricht.", french: "Ce n’est pas encore indiqué dans l’information." }],
    portfolioTask: "Résume une information locale en quatre phrases en indiquant sa source et en utilisant une question indirecte.",
    quiz: { mode: "single", question: "Choisis la question indirecte correcte : Weißt du, ___?", options: ["wann der Zug fährt", "wann fährt der Zug", "der Zug wann fährt"], answers: ["wann der Zug fährt"], explanation: "Dans une question indirecte, le verbe conjugué se place à la fin de la proposition.", audioPrompt: "Weißt du, wann der Zug fährt?" },
  },
  {
    title: "Chapitre 5 · Umwelt und Konsum",
    duration: "35 min",
    objectives: ["Décrire une habitude de consommation", "Comparer des solutions écologiques", "Proposer une action réalisable"],
    explanation: ["Pour parler de l’environnement, décris d’abord un problème concret puis compare les solutions selon leur coût, leur facilité et leur effet. « Man sollte… » permet de formuler un conseil ; « Wir könnten… » présente une possibilité de façon moins catégorique.", "damit et um … zu expriment un objectif. « Wir fahren mit dem Bus, um Energie zu sparen. » Utilise le Konjunktiv II de können ou sollen pour proposer une action avec tact : « Wir könnten öfter teilen. »"],
    vocabulary: [{ word: "der Verbrauch", meaning: "la consommation", pronunciation: "fèr-braoukh" }, { word: "wiederverwenden", meaning: "réutiliser", pronunciation: "vi-der-fèr-vèn-den" }, { word: "die Verpackung", meaning: "l’emballage", pronunciation: "fèr-pa-koung" }, { word: "die Maßnahme", meaning: "la mesure / action", pronunciation: "mass-na-meu" }],
    examples: [{ german: "Wir könnten Mehrwegflaschen benutzen, um weniger Müll zu produzieren.", french: "Nous pourrions utiliser des bouteilles réutilisables pour produire moins de déchets.", note: "könnten formule une proposition ; um … zu annonce son objectif." }, { german: "Man sollte Produkte länger verwenden.", french: "On devrait utiliser les produits plus longtemps.", note: "sollte exprime un conseil général." }],
    grammarSummary: ["Konjunktiv II : könnte/könnten pour proposer, sollte/sollten pour conseiller.", "um … zu + infinitif indique le but d’une action.", "Comparaison : praktischer als, genauso wichtig wie."],
    dialogue: [{ speaker: "A", german: "Wie können wir im Büro weniger Papier verbrauchen?", french: "Comment pouvons-nous consommer moins de papier au bureau ?" }, { speaker: "B", german: "Wir könnten doppelseitig drucken.", french: "Nous pourrions imprimer recto verso." }, { speaker: "A", german: "Das wäre einfach umzusetzen.", french: "Ce serait facile à mettre en place." }, { speaker: "B", german: "Ja, und wir könnten Dokumente öfter digital teilen.", french: "Oui, et nous pourrions partager plus souvent les documents sous forme numérique." }],
    portfolioTask: "Propose trois mesures réalistes pour réduire les déchets à la maison ou au travail ; justifie chacune avec un objectif.",
    quiz: { mode: "single", question: "Quelle phrase exprime une proposition polie ?", options: ["Wir könnten öfter den Bus nehmen.", "Wir nehmen gestern den Bus.", "Wir den Bus öfter nehmen."], answers: ["Wir könnten öfter den Bus nehmen."], explanation: "könnten est le Konjunktiv II de können et permet de formuler une proposition.", audioPrompt: "Wir könnten öfter den Bus nehmen." },
  },
  {
    title: "Chapitre 6 · Gesundheit und Alltag",
    duration: "35 min",
    objectives: ["Expliquer un besoin ou une difficulté", "Poser une question précise à un service", "Employer des verbes avec préposition"],
    explanation: ["Dans un rendez-vous médical ou administratif, décris le problème, sa durée et ce que tu demandes. Pour rester poli, commence par « Könnten Sie mir bitte erklären…? » ou « Ich würde gern wissen… ».", "Certains verbes se construisent avec une préposition fixe : warten auf, sich interessieren für, teilnehmen an. Pour remplacer une chose, emploie darauf, dafür ou daran. Dans la question, wo(r) + préposition donne worauf, wofür ou woran."],
    vocabulary: [{ word: "teilnehmen an", meaning: "participer à", pronunciation: "taïl-né-men an" }, { word: "sich kümmern um", meaning: "s’occuper de", pronunciation: "zikh ku-mer-n oum" }, { word: "die Untersuchung", meaning: "l’examen médical", pronunciation: "oun-ter-zou-koung" }, { word: "worauf", meaning: "à quoi / sur quoi", pronunciation: "vo-raouf" }],
    examples: [{ german: "Ich warte auf den Termin und bereite mich darauf vor.", french: "J’attends le rendez-vous et je m’y prépare.", note: "darauf reprend le complément introduit par auf." }, { german: "Wofür interessieren Sie sich? – Ich interessiere mich für Ernährung.", french: "À quoi vous intéressez-vous ? – Je m’intéresse à l’alimentation.", note: "wofür interroge sur un complément introduit par für." }],
    grammarSummary: ["Apprends le verbe avec sa préposition : warten auf, teilnehmen an, sich interessieren für.", "Préposition + chose reprise : darauf, daran, dafür.", "Question sur une chose : wo(r) + préposition ; sur une personne : préposition + wen/wem."],
    dialogue: [{ speaker: "Patient", german: "Ich würde gern wissen, wann die Untersuchung stattfindet.", french: "J’aimerais savoir quand l’examen aura lieu." }, { speaker: "Accueil", german: "Der Termin ist am Donnerstag um zehn Uhr.", french: "Le rendez-vous est jeudi à dix heures." }, { speaker: "Patient", german: "Muss ich mich darauf vorbereiten?", french: "Dois-je m’y préparer ?" }, { speaker: "Accueil", german: "Nein, Sie müssen nur Ihre Versichertenkarte mitbringen.", french: "Non, vous devez seulement apporter votre carte d’assurance." }],
    portfolioTask: "Prépare une demande polie pour un rendez-vous de santé ou un service administratif, puis note trois questions utiles.",
    quiz: { mode: "single", question: "Complète : Ich interessiere mich ___ einem Deutschkurs.", options: ["für", "an", "auf"], answers: ["für"], explanation: "La construction correcte est sich interessieren für etwas.", audioPrompt: "Ich interessiere mich für einen Deutschkurs." },
  },
  {
    title: "Chapitre 7 · Wohnen und Gesellschaft",
    duration: "35 min",
    objectives: ["Décrire un quartier et ses services", "Présenter une initiative locale", "Utiliser une relative au datif"],
    explanation: ["Pour décrire un quartier, associe un lieu, un service et une appréciation : « Es gibt einen Park, in dem… ». Pour présenter une initiative, explique qui y participe, ce qui est proposé et à qui cela sert.", "Dans une proposition relative, le pronom dépend du genre et du cas du nom remplacé. Au datif, on utilise dem au masculin/neutre, der au féminin et denen au pluriel : « die Nachbarin, der ich helfe ». Le verbe de la relative reste à la fin."],
    vocabulary: [{ word: "die Nachbarschaft", meaning: "le voisinage", pronunciation: "nakh-bar-chaft" }, { word: "die Einrichtung", meaning: "la structure / établissement", pronunciation: "aïn-rikh-toung" }, { word: "ehrenamtlich", meaning: "bénévole", pronunciation: "é-ren-amt-likh" }, { word: "die Umgebung", meaning: "les environs", pronunciation: "oum-gé-boung" }],
    examples: [{ german: "Das ist die Nachbarin, der ich beim Einkaufen helfe.", french: "C’est la voisine que j’aide pour les courses.", note: "der est au datif féminin après helfen." }, { german: "Wir besuchen ein Zentrum, in dem es Sprachkurse gibt.", french: "Nous visitons un centre où il y a des cours de langue.", note: "in dem reprend Zentrum et exprime le lieu." }],
    grammarSummary: ["Relatif au datif : dem (masculin/neutre), der (féminin), denen (pluriel).", "helfen + datif : der Nachbarin helfen.", "Le verbe conjugué termine la proposition relative."],
    dialogue: [{ speaker: "A", german: "Gibt es in deinem Viertel einen Treffpunkt?", french: "Y a-t-il un lieu de rencontre dans ton quartier ?" }, { speaker: "B", german: "Ja, es gibt ein Zentrum, in dem man Deutsch üben kann.", french: "Oui, il y a un centre où l’on peut pratiquer l’allemand." }, { speaker: "A", german: "Wer organisiert die Gespräche?", french: "Qui organise les conversations ?" }, { speaker: "B", german: "Freiwillige, denen die Nachbarschaft wichtig ist.", french: "Des bénévoles à qui le voisinage tient à cœur." }],
    portfolioTask: "Décris un lieu utile de ton quartier avec deux propositions relatives, dont une au datif.",
    quiz: { mode: "single", question: "Complète : Das ist der Kollege, ___ ich bei der Arbeit helfe.", options: ["den", "dem", "der"], answers: ["dem"], explanation: "helfen se construit avec le datif ; le relatif masculin au datif est dem.", audioPrompt: "Das ist der Kollege, dem ich bei der Arbeit helfe." },
  },
  {
    title: "Chapitre 8 · Pläne und Diskussion",
    duration: "35 min",
    objectives: ["Présenter un projet et ses étapes", "Défendre une proposition avec des arguments", "Faire le bilan de sa progression"],
    explanation: ["Pour présenter un projet, formule d’abord l’objectif, puis les étapes, les personnes concernées et le résultat attendu. Utilise erstens, außerdem, deshalb et zum Schluss pour guider ton auditoire.", "Le Konjunktiv II permet de formuler une demande polie ou une hypothèse : « Ich würde gern… », « Wir könnten… ». Pour rapporter une condition possible, utilise wenn avec le verbe à la fin : « Wenn wir mehr Zeit hätten, würden wir… »"],
    vocabulary: [{ word: "das Ziel", meaning: "l’objectif", pronunciation: "tsi:l" }, { word: "der Vorteil", meaning: "l’avantage", pronunciation: "for-taïl" }, { word: "die Voraussetzung", meaning: "la condition préalable", pronunciation: "for-aous-zèt-tsoung" }, { word: "umsetzen", meaning: "mettre en œuvre", pronunciation: "oum-zèt-tsen" }],
    examples: [{ german: "Wenn wir früher anfangen würden, könnten alle teilnehmen.", french: "Si nous commencions plus tôt, tout le monde pourrait participer.", note: "La proposition en wenn place würden à la fin ; könnten ouvre la principale." }, { german: "Ich würde vorschlagen, dass wir zuerst einen Termin vereinbaren.", french: "Je proposerais que nous fixions d’abord une date.", note: "Formule polie suivie d’une proposition en dass." }],
    grammarSummary: ["Konjunktiv II poli : ich würde, wir könnten, man sollte.", "wenn + sujet + compléments + verbe à la fin.", "Connecteurs : erstens, außerdem, deshalb, zum Schluss."],
    dialogue: [{ speaker: "A", german: "Wie können wir einen Sprachtreff organisieren?", french: "Comment pouvons-nous organiser une rencontre linguistique ?" }, { speaker: "B", german: "Ich würde vorschlagen, dass wir uns jeden Mittwoch treffen.", french: "Je proposerais que nous nous retrouvions chaque mercredi." }, { speaker: "A", german: "Das wäre gut. Wenn wir einen Raum finden, könnten mehr Leute kommen.", french: "Ce serait bien. Si nous trouvions une salle, plus de personnes pourraient venir." }, { speaker: "B", german: "Dann frage ich zuerst im Nachbarschaftszentrum nach.", french: "Alors je vais d’abord me renseigner au centre de quartier." }],
    portfolioTask: "Présente un projet en une minute : objectif, trois étapes, avantage principal et une condition avec wenn.",
    quiz: { mode: "single", question: "Quelle formule est la plus polie pour proposer une idée ?", options: ["Ich würde vorschlagen, dass wir später anfangen.", "Wir anfangen später.", "Ich schlage gestern vor."], answers: ["Ich würde vorschlagen, dass wir später anfangen."], explanation: "Ich würde vorschlagen est une formule polie au Konjunktiv II ; le verbe de la proposition en dass vient à la fin.", audioPrompt: "Ich würde vorschlagen, dass wir später anfangen." },
  },
];

export const germanA1Curriculum = createCurriculum(germanA1Program, a1Chapters);
export const germanA2Curriculum = createCurriculum(germanA2Program, a2Chapters);
export const germanB1Curriculum = createCurriculum(germanB1Program, b1Chapters);

function createCurriculum(program: GermanProgram, chapters: GermanProgramChapter[]): GermanCurriculum {
  const lessons = chapters.map((chapter, index) => ({
    id: index + 1,
    title: chapter.title,
    duration: chapter.duration,
    objectives: chapter.objectives,
    explanation: chapter.explanation,
    vocabulary: chapter.vocabulary,
    examples: chapter.examples,
    grammarSummary: chapter.grammarSummary,
    dialogue: chapter.dialogue,
    portfolioTask: chapter.portfolioTask,
  }));
  const quizzes = chapters.map((chapter, index) => ({
    ...chapter.quiz,
    id: index + 1,
    lessonId: index + 1,
    title: `Quiz ${index + 1} · ${chapter.title.replace(/^Chapitre \d+ · /, "")}`,
  }));

  return {
    level: program.level,
    source: program.source,
    modules: chapters.map((chapter, index) => ({
      id: index + 1,
      title: chapter.title,
      items: [{ type: "lesson" as const, id: index + 1 }, { type: "quiz" as const, id: index + 1 }],
    })),
    lessons,
    quizzes,
  };
}
