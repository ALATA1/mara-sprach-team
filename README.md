# Ensemble MVP

Application Next.js du parcours bénéficiaire : inscription, paiement de 10 €, tableau de bord, cours français/allemand, LIVE et accompagnement.

## Démarrage local

```bash
npm install
cp .env.example .env.local
npm run dev
```

Ouvrir http://localhost:3000. Sans variables externes, l'application fonctionne en mode démonstration avec persistance locale.

## Tests

`npm test` exécute les tests d'intégration Supabase des parcours étudiants (inscription/annulation LIVE, anti-doublon, capacité, progression et isolation), des restrictions RLS (aucune inscription LIVE directe, aucune modification directe d'une demande) et de l'administration des rôles (journal d'audit et protection du dernier administrateur). Les tests de webhook vérifient le rejet des signatures invalides et la synchronisation des états pending/failed du suivi de remboursement. Ils ne remplacent pas un parcours complet de paiement/remboursement sur le compte Stripe de test. Les tests nécessitent une instance Supabase locale avec les migrations appliquées ; ils refusent toute URL Supabase autre que `localhost` ou `127.0.0.1`.

Pour tester l'interface localement, définissez également `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` à partir de `npx supabase status -o env` avant de lancer `npm run dev` ou `npm run build`. Les variables `NEXT_PUBLIC_*` sont intégrées au JavaScript du navigateur pendant la compilation : ne compilez pas une version de développement avec l'URL de production.

Dans PowerShell, après avoir démarré Supabase avec `npx supabase start`, chargez les identifiants de l'instance locale puis lancez les tests :

```powershell
$status = npx supabase status -o env
$values = @{}
foreach ($line in $status) {
  if ($line -match '^([^=]+)=(.*)$') { $values[$matches[1]] = $matches[2].Trim('"') }
}
$api = [Uri]$values['API_URL']
if ($api.Host -notin @('localhost', '127.0.0.1')) { throw 'Les tests exigent une instance Supabase locale.' }
$env:SUPABASE_URL = $values['API_URL']
$env:SUPABASE_ANON_KEY = $values['ANON_KEY']
$env:SUPABASE_SERVICE_ROLE_KEY = $values['SERVICE_ROLE_KEY']
npm test
```

Ces tests créent des comptes et des séances temporaires, puis les suppriment. **Ne les lancez jamais contre un projet Supabase de production.**

## Espaces d’équipe

Les rôles sont vérifiés côté serveur pour chaque opération. Le secret `SUPABASE_SERVICE_ROLE_KEY` reste exclusivement côté serveur.

- Les formateurs gèrent leurs propres cours, leçons et séances LIVE depuis `/staff/teaching`. Ils peuvent publier un cours après avoir ajouté au moins une leçon, créer une séance, voir les inscrits, noter les présences, annuler ou reprogrammer. Une annulation ou un changement d'horaire envoie un e-mail aux inscrits si Resend est configuré ; sinon l'interface affiche un avertissement après l'enregistrement.
- Les bénévoles voient les demandes non attribuées ou les leurs, peuvent les prendre et suivre leur état dans `/staff`. Les administrateurs peuvent en plus attribuer les demandes à des bénévoles.
- Les administrateurs gèrent les rôles et consultent comptes, paiements et abonnements dans `/staff/admin`. La base journalise les changements de rôle et empêche de retirer le dernier administrateur. Un administrateur peut ouvrir le portail Stripe d'un compte pour l'aider à résoudre un problème de facturation.
- Le remboursement intégré est **intégral uniquement**, réservé aux paiements Stripe encaissés ; il exige une confirmation explicite et un motif, utilise une clé d’idempotence et journalise la demande. Il n’existe pas encore de remboursement partiel. Testez exclusivement avec les clés Stripe de test ; n’effectuez aucun remboursement réel lors des validations.

Les séances existantes sans formateur attribué restent administrables par les administrateurs. Pour qu'un formateur puisse les modifier, il faut lui affecter le champ `teacher_id`.

## Installation sur téléphone

Une fois l'application déployée en HTTPS, elle peut être ajoutée à l'écran d'accueil :

- **iPhone** : ouvrir le site dans Safari, toucher « Partager », puis « Sur l’écran d’accueil ».
- **Android** : ouvrir le site dans Chrome, toucher le menu, puis « Installer l’application » ou « Ajouter à l’écran d’accueil ».

## Supabase

1. Créer un projet Supabase.
2. Exécuter `supabase/migrations/001_initial.sql` dans SQL Editor.
3. Exécuter `supabase/migrations/002_course_documents.sql` pour créer la bibliothèque de fichiers et le bucket `course-documents`.
4. Exécuter `supabase/migrations/003_auth_roles_and_memberships.sql` pour créer les profils et adhésions nécessaires à l'inscription et au paiement.
5. Renseigner `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` dans `.env.local` et dans Vercel.
6. Dans Supabase Auth, activer la confirmation des e-mails, configurer l'URL du site et autoriser la redirection `https://<votre-domaine>/auth/callback` (ainsi que `http://localhost:3000/auth/callback` en développement).
7. Configurer un fournisseur d'e-mail SMTP pour la production et vérifier son domaine d'envoi afin que les messages de confirmation soient délivrés. Le bouton « Renvoyer l’e-mail » est disponible sur l'écran de confirmation.
8. Générer un code administrateur long et aléatoire pour `COURSE_DOCUMENTS_ADMIN_TOKEN`. Cette variable reste côté serveur et n'est jamais préfixée par `NEXT_PUBLIC_`.
9. Vérifier les politiques RLS des accès directs étudiants. Les routes des espaces formateur, bénévole et administration vérifient le rôle côté serveur avant l'usage de la clé service.
10. Appliquer les migrations restantes dans l'ordre chronologique : `20261008_payments_ledger.sql`, `20261008164000_course_billing_access.sql`, `20261008181000_live_registration_functions.sql`, `20261008182000_student_learning_records.sql`, `20261008183000_user_profiles.sql`, `20261008184000_profile_avatar_limit.sql`, `20261008210000_staff_operations.sql`, `20261008211000_admin_operations.sql`, `20261008212000_refund_processing_status.sql` et `20261008213000_staff_student_rls_hardening.sql`. Sur un projet existant, vérifier l'historique et n'appliquer que les migrations manquantes ; sauvegarder avant tout changement et ne jamais réinitialiser une base de production.

Les documents de cours publiés sont réservés aux comptes avec accès cours actif. Le dépôt est limité à l'API serveur avec `SUPABASE_SERVICE_ROLE_KEY` et `COURSE_DOCUMENTS_ADMIN_TOKEN`; les accès d'écriture anonymes au bucket ne sont pas autorisés. Les fichiers acceptés sont PDF, Word, PowerPoint, Excel, TXT, MP3, M4A, WAV, OGG, MP4 et WebM, jusqu'à 15 Mo.

Les informations de profil (nom, prénom, téléphone, pays, ville, date de naissance facultative, langue et niveau d'allemand) sont privées au compte. La photo est stockée dans le bucket privé `profile-avatars` (JPEG, PNG ou WebP, 10 Mo maximum) et servie par un lien signé temporaire. Le changement d'adresse e-mail passe par Supabase Auth et sa confirmation.

## Sessions vidéo Jitsi et Microsoft Teams

Les liens de salle des sessions sont stockés dans `live_sessions.meeting_url`.

Pour une séance Teams, créez la réunion dans Teams puis copiez son lien. Dans Supabase, renseignez ce lien dans `meeting_url` pour la séance concernée. Les liens `teams.microsoft.com` et `teams.live.com` ouvrent la réunion Teams dans un nouvel onglet ou l'application Teams; l'appel vidéo n'est pas intégré dans la page Mara-Sprach. Les étudiants peuvent devoir choisir de continuer dans leur navigateur. Après la réunion, ils reviennent à Mara-Sprach.

Un formateur ou administrateur connecté peut aussi coller le lien Teams dans le champ affiché sous la séance dans le calendrier LIVE, puis cliquer sur « Enregistrer ». L'enregistrement nécessite la configuration habituelle de `SUPABASE_SERVICE_ROLE_KEY` côté serveur Vercel.

Pour tester, utilisez une séance et un lien Teams distinct par cours, puis vérifiez le parcours avec un participant sans compte Microsoft sur ordinateur, iPhone et Android. L'offre Teams Free limite les réunions de groupe à 60 minutes et 100 participants; prévoyez une durée inférieure à une heure pour garder une marge.

Les anciennes séances avec un lien Jitsi continuent de s'afficher dans Mara-Sprach. Le service public `meet.jit.si` affiche toutefois un avertissement de démonstration pour l'intégration et n'est pas retenu pour les cours réguliers.

Les inscriptions et annulations LIVE sont enregistrées dans `live_registrations` pour le compte connecté. Une fonction Supabase verrouille la séance pendant la vérification de capacité, afin d'éviter les dépassements lors d'inscriptions simultanées. L'inscription requiert un accès cours actif et ferme au début de la séance. La progression des leçons, le dernier score de chaque quiz et les demandes d'accompagnement sont également liés au compte Supabase. Les migrations correspondantes doivent être appliquées avant le déploiement.

## Stripe

1. Créer le prix ponctuel de 10 € pour l'adhésion et les prix mensuels Découverte (25 €), Standard (40 €) et Premium (50 €).
2. Configurer `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, les trois variables `STRIPE_PRICE_*_MONTHLY_ID` et `STRIPE_BILLING_PORTAL_CONFIGURATION_ID`.
3. Dans les paramètres des moyens de paiement Stripe, activer les options voulues. Checkout affiche dynamiquement celles disponibles pour le compte, le pays et l'appareil.
4. Configurer `/api/webhooks/stripe` pour `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.finalized`, `invoice.payment_succeeded`, `invoice.payment_failed`, `invoice.voided`, `charge.refunded` et `refund.updated`. Renseigner le secret de signature dans `STRIPE_WEBHOOK_SECRET`.
5. Appliquer toutes les migrations listées dans la section Supabase, notamment `20261008_payments_ledger.sql` et `20261008164000_course_billing_access.sql`. Cette dernière crée le registre d'abonnements, les politiques d'accès aux cours et transforme le bucket documentaire en bucket privé.
6. Définir `NEXT_PUBLIC_SITE_URL` avec l'URL publique exacte du site (en local : `http://localhost:3000`).
7. Les formules sont des abonnements mensuels facturés automatiquement. Si l'utilisateur n'a pas encore payé son adhésion, les 10 € ponctuels sont ajoutés au premier paiement uniquement. Stripe génère les factures mensuelles, visibles depuis le portail de facturation.
8. L'accès aux cours, documents, vidéos et LIVE requiert une adhésion payée et un abonnement de cours actif. Les paiements échoués ou en attente ne donnent pas accès ; l'accès des formateurs et administrateurs reste inchangé.

## Déploiement Vercel

Importer le dépôt dans Vercel, ajouter toutes les variables d'environnement nécessaires depuis `.env.example`, définir `NEXT_PUBLIC_SITE_URL` avec le domaine de production, puis déployer. Après l'ajout ou la modification d'une variable, redéployer l'application.

## Important

Le projet est immédiatement testable en mode démo. Avant toute mise en production, appliquer les migrations manquantes après sauvegarde, confirmer les secrets de production, vérifier les politiques RLS et les webhooks en environnement de test, tester l'inscription, les rôles et les paiements avec des comptes contrôlés, essayer les parcours sur appareils réels, documenter la restauration des sauvegardes et la surveillance des erreurs, et faire valider la politique de confidentialité, les mentions légales, les conditions de vente et le processus de remboursement. Les tests du dépôt ne valident ni les services Stripe/Resend de production, ni la conformité juridique, ni les comptes stores.



## Installation application Adroid et Iphone : 

C’est normal : Mara-Sprach Team n’apparaît pas comme une application dans Safari ou l’App Store. Pour l’instant, c’est le site web que l’on peut ajouter à l’écran d’accueil.

Dans Safari sur votre iPhone, touchez la barre d’adresse, collez cette adresse complète, puis touchez Accéder :

https://mara-sprach-team.vercel.app/

Quand le site est ouvert, touchez Partager (le carré avec la flèche vers le haut), puis Ajouter à l’écran d’accueil. L’icône Mara-Sprach Team apparaîtra alors sur votre écran d’accueil.



Sur Android :

Ouvrez Chrome et saisissez l’adresse : mara-sprach-team.vercel.app.
Touchez le menu ⋮ en haut à droite.
Choisissez Installer l’application ou Ajouter à l’écran d’accueil — le libellé peut varier selon le téléphone.
Confirmez. L’icône apparaîtra sur l’écran d’accueil.
Si Chrome propose de créer un simple raccourci plutôt que d’installer l’application, choisissez Installer si cette option est disponible.