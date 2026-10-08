# Bilan de Mara-Sprach Team

**État du bilan : 8 octobre 2026 — mise à jour après déploiement**

## Résumé

Mara-Sprach Team possède déjà une base fonctionnelle : inscription et connexion, paiement, cours, vidéos, documents, calendrier LIVE et installation du site sur téléphone. L’application reste toutefois un MVP : plusieurs actions visibles ne sont pas encore reliées à un suivi durable dans le compte de l’étudiant, et les formateurs ne disposent pas encore d’un véritable espace d’administration des cours et des séances.

Le code principal de l’interface se trouve dans [`components/app-shell.tsx`](./components/app-shell.tsx). Les configurations et prérequis sont décrits dans [`README.md`](./README.md).

## Fonctionnalités déjà présentes

- Inscription, connexion, confirmation d’adresse e-mail et réinitialisation de mot de passe avec Supabase Auth.
- Rôles étudiant, formateur et administrateur prévus dans le profil Supabase.
- Espace « Mon profil » privé : photo, prénom, nom, adresse e-mail avec confirmation, téléphone, pays, ville, date de naissance facultative, langue préférée et niveau d’allemand.
- Paiement ponctuel de 10 € par Stripe, avec activation de l’accès après confirmation du paiement, si les clés et le webhook sont configurés.
- Catalogue de cours, contenus de français et d’allemand, parcours d’allemand A1 à B1 et quiz.
- Affichage de vidéos hébergées avec l’application et bibliothèque de documents de cours avec Supabase Storage.
- Calendrier de séances LIVE et ouverture des réunions par lien.
- Installation du site sur l’écran d’accueil d’un téléphone sous forme de PWA. Il ne s’agit pas encore d’une application distribuée sur l’App Store ou Google Play.
- Formulaire de contact pouvant envoyer un e-mail lorsque Resend est configuré.

## Limites et fonctionnalités manquantes

### 1. Progression et inscriptions des étudiants

Les inscriptions aux LIVE, la progression des leçons et les derniers scores des quiz sont désormais liés au compte Supabase. Les inscriptions respectent la capacité de façon atomique et requièrent un accès cours actif. Les demandes d’accompagnement sont enregistrées dans `support_requests`. Les migrations et le code correspondants ont été appliqués et déployés le 8 octobre 2026.

La vérification métier complète reste à faire avec un compte étudiant actif : inscription et annulation LIVE, reprise de la progression sur un second appareil, et consultation d’une demande après reconnexion.

### 2. Outils de gestion pour les formateurs

Il manque un espace formateur complet pour :

- créer, modifier, publier et archiver des cours ;
- créer une séance LIVE, définir son horaire, sa capacité et son lien ;
- voir et gérer les inscriptions ;
- noter les présences et suivre les participants ;
- annuler ou reprogrammer une séance et prévenir les inscrits.

Un formateur ou administrateur peut enregistrer un lien Teams sur une séance existante. L’interface ne crée pas encore de nouvelle séance et les inscriptions, présences et modifications restent à gérer par des outils distincts.

### 3. Cours et suivi pédagogique

Les contenus sont principalement prédéfinis dans le code. Il n’existe pas encore de parcours formateur pour créer et organiser toutes les leçons, activités, quiz, devoirs ou évaluations depuis l’application. Les résultats et la progression pédagogique ne constituent pas encore un dossier étudiant centralisé et synchronisé.

### 4. Visioconférence

Les liens Jitsi anciens sont encore pris en charge dans le code, mais le service public `meet.jit.si` a affiché un avertissement limitant l’intégration à une démonstration. Il ne convient donc pas aux cours réguliers dans cette configuration.

Teams fonctionne par ouverture d’un lien vers Teams ou son application : l’appel n’est pas intégré dans Mara-Sprach. Sur téléphone, l’étudiant peut devoir installer l’application Teams. Un compte Microsoft n’est généralement pas obligatoire pour participer comme invité, selon les réglages de la réunion. L’offre Teams Free est limitée à 60 minutes et 100 participants par réunion de groupe.

Une séance de test Teams avait été enregistrée pour le 8 octobre 2026, de 18 h à 19 h (heure ROM). Le code Teams est déployé. Le parcours réel avec un invité sans compte Microsoft reste à vérifier sur ordinateur, iPhone et Android.

### 5. Accompagnement et demandes

Le formulaire crée et affiche les demandes liées au compte étudiant. Il manque toujours un tableau de bord permettant aux bénévoles ou administrateurs de les attribuer, de les traiter et de les clôturer. Le contact par e-mail et le suivi interne des demandes sont deux fonctionnalités distinctes.

### 6. Gestion des comptes et des paiements

Les utilisateurs peuvent désormais modifier leur profil personnel. Les demandes d’accès formateur doivent être examinées et activées séparément par l’administration. L’application n’a pas encore de tableau de bord pour approuver les demandes, gérer les rôles, traiter les remboursements ou accompagner les paiements en échec.

### 7. Disponibilité, confidentialité et exploitation

Avant une utilisation à grande échelle, il reste à valider les règles d’accès Supabase (RLS), les sauvegardes et la restauration, la surveillance des erreurs et les notifications. Les pages complètes de mentions légales, conditions d’utilisation et politique de confidentialité doivent également être vérifiées ou ajoutées. Les prérequis de mise en production sont récapitulés dans [`README.md`](./README.md) et les règles de données dans [`supabase/migrations/`](./supabase/migrations/).

## Priorités recommandées

### Priorité 1 — Fiabiliser l’accès aux LIVE

1. Vérifier le parcours Teams déployé avec un formateur et un étudiant invité sur ordinateur, iPhone et Android.
2. Afficher clairement l’horaire, les conditions d’accès, la limite de durée et la marche à suivre si Teams demande son application.

### Priorité 2 — Synchroniser les données des étudiants

1. Enregistrer les inscriptions LIVE dans Supabase et faire respecter la capacité — implémenté et déployé.
2. Synchroniser la progression des leçons et les derniers résultats de quiz — implémenté et déployé.
3. Tester la reprise sur un second appareil avec un compte étudiant payant.

### Priorité 3 — Donner les outils essentiels aux formateurs

Créer une interface protégée pour gérer les cours et les séances, la liste des inscrits, les présences et les changements de dernière minute.

### Priorité 4 — Compléter l’accompagnement et préparer la production

Le suivi des demandes d’accompagnement est enregistré par compte. Il reste à créer les outils de traitement des demandes, finaliser les pages légales, vérifier les politiques Supabase, organiser les sauvegardes et tester les principaux parcours de paiement et de connexion.

#### Conclusion

La priorité n’est pas d’ajouter beaucoup de nouvelles pages : c’est de rendre persistants les parcours existants et de permettre aux formateurs de gérer les cours et les séances sans manipuler directement Supabase. L’accès LIVE Teams doit d’abord être testé sur les téléphones avant d’être annoncé comme opérationnel.