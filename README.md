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

## Sessions vidéo Daily

Les salles Daily Prebuilt s'affichent directement dans Mara-Sprach Team. Pour les activer :

1. Créer un compte Daily et des salles **privées** dans le tableau de bord Daily.
2. Copier la clé API Daily dans `DAILY_API_KEY` et le domaine du compte (par exemple `votre-espace.daily.co`) dans `DAILY_DOMAIN`, dans `.env.local` en développement et dans les variables d'environnement Vercel en production. Ces deux variables restent côté serveur.
3. Dans Supabase, renseigner pour chaque session Daily son URL exacte dans `live_sessions.meeting_url`, au format `https://votre-espace.daily.co/nom-de-salle`.
4. Redéployer l'application après avoir ajouté les variables Vercel.

L'API Mara-Sprach vérifie la connexion, limite chaque jeton à une salle planifiée et le fait expirer après deux heures. Les profils enseignant et administrateur reçoivent les commandes de propriétaire de salle. Les sessions encore configurées avec Jitsi continuent d'utiliser Jitsi.

## Stripe

1. Créer un produit avec un prix ponctuel de 10 €.
2. Renseigner `STRIPE_SECRET_KEY` et l'identifiant du prix dans `STRIPE_PRICE_ID`.
3. Configurer un webhook Stripe vers `https://<votre-domaine>/api/webhooks/stripe` pour les événements `checkout.session.completed` et `checkout.session.async_payment_succeeded`, puis renseigner sa clé de signature dans `STRIPE_WEBHOOK_SECRET`.
4. Définir `NEXT_PUBLIC_SITE_URL` avec l'URL publique exacte du site (en local : `http://localhost:3000`). Cette URL sert à construire les liens de retour du paiement.
5. L'accès étudiant est activé uniquement quand Stripe confirme le paiement comme payé. Le retour navigateur et le webhook peuvent tous deux confirmer la même session sans créer de double adhésion.

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