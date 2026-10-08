# Ensemble MVP

Application Next.js du parcours bénéficiaire : inscription, paiement de 10 €, tableau de bord, cours français/allemand, LIVE et accompagnement.

## Démarrage local

```bash
npm install
cp .env.example .env.local
npm run dev
```

Ouvrir http://localhost:3000. Sans variables externes, l'application fonctionne en mode démonstration avec persistance locale.

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
9. Avant production, compléter les politiques RLS pour les rôles professeur, volontaire et administrateur.

Les documents de cours publiés sont téléchargeables par les visiteurs. Le dépôt est limité à l'API serveur avec `SUPABASE_SERVICE_ROLE_KEY` et `COURSE_DOCUMENTS_ADMIN_TOKEN`; les accès d'écriture anonymes au bucket ne sont pas autorisés. Les fichiers acceptés sont PDF, Word, PowerPoint, Excel, TXT, MP3, M4A, WAV, OGG, MP4 et WebM, jusqu'à 15 Mo.

Les informations de profil (nom, prénom, téléphone, pays, ville, date de naissance facultative, langue et niveau d'allemand) sont privées au compte. La photo est stockée dans le bucket privé `profile-avatars` (JPEG, PNG ou WebP, 5 Mo maximum) et servie par un lien signé temporaire. Le changement d'adresse e-mail passe par Supabase Auth et sa confirmation.

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
4. Configurer `/api/webhooks/stripe` pour `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.finalized`, `invoice.payment_succeeded`, `invoice.payment_failed`, `invoice.voided` et `charge.refunded`. Renseigner le secret de signature dans `STRIPE_WEBHOOK_SECRET`.
5. Appliquer les migrations `20261008_payments_ledger.sql` et `20261008165000_course_billing_access.sql`. La seconde crée le registre d'abonnements, les politiques d'accès aux cours et transforme le bucket documentaire en bucket privé.
6. Définir `NEXT_PUBLIC_SITE_URL` avec l'URL publique exacte du site (en local : `http://localhost:3000`).
7. Les formules sont des abonnements mensuels facturés automatiquement. Si l'utilisateur n'a pas encore payé son adhésion, les 10 € ponctuels sont ajoutés au premier paiement uniquement. Stripe génère les factures mensuelles, visibles depuis le portail de facturation.
8. L'accès aux cours, documents, vidéos et LIVE requiert une adhésion payée et un abonnement de cours actif. Les paiements échoués ou en attente ne donnent pas accès ; l'accès des formateurs et administrateurs reste inchangé.

## Déploiement Vercel

Importer le dépôt dans Vercel, ajouter toutes les variables d'environnement nécessaires depuis `.env.example`, définir `NEXT_PUBLIC_SITE_URL` avec le domaine de production, puis déployer. Après l'ajout ou la modification d'une variable, redéployer l'application.

## Important

Le projet est immédiatement testable en mode démo. Pour accepter de vrais paiements et de vraies données personnelles, appliquer toutes les migrations, configurer Supabase Auth et son fournisseur SMTP, configurer Stripe et son webhook, puis vérifier les politiques RLS, le RGPD, les mentions légales et les tests de sécurité avant la mise en production.



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