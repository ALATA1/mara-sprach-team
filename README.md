# Ensemble MVP

Application Next.js du parcours bénéficiaire : inscription, paiement de 10 €, tableau de bord, cours français/allemand, LIVE et accompagnement.

## Démarrage local

```bash
npm install
cp .env.example .env.local
npm run dev
```

Ouvrir http://localhost:3000. Sans variables externes, l'application fonctionne en mode démonstration avec persistance locale.

## Supabase

1. Créer un projet Supabase.
2. Exécuter `supabase/migrations/001_initial.sql` dans SQL Editor.
3. Exécuter `supabase/migrations/002_course_documents.sql` pour créer la bibliothèque de fichiers et le bucket `course-documents`.
4. Renseigner les variables Supabase dans `.env.local` et dans Vercel.
5. Générer un code administrateur long et aléatoire pour `COURSE_DOCUMENTS_ADMIN_TOKEN`. Cette variable reste côté serveur et n'est jamais préfixée par `NEXT_PUBLIC_`.
6. Avant production, compléter les politiques RLS pour les rôles professeur, volontaire et administrateur.

Les documents de cours publiés sont téléchargeables par les visiteurs. Le dépôt est limité à l'API serveur avec `SUPABASE_SERVICE_ROLE_KEY` et `COURSE_DOCUMENTS_ADMIN_TOKEN`; les accès d'écriture anonymes au bucket ne sont pas autorisés. Les fichiers acceptés sont PDF, Word, PowerPoint, Excel et TXT, jusqu'à 15 Mo.

## Stripe

1. Créer un produit avec un prix ponctuel de 10 €.
2. Renseigner `STRIPE_SECRET_KEY` et `STRIPE_PRICE_ID`.
3. Configurer le webhook sur `/api/webhooks/stripe` et renseigner `STRIPE_WEBHOOK_SECRET`.
4. Compléter le TODO du webhook pour activer `memberships` uniquement après `checkout.session.completed`.

## Déploiement Vercel

Importer le dépôt dans Vercel, ajouter les variables d'environnement, puis déployer. Définir `NEXT_PUBLIC_SITE_URL` avec l'URL Vercel affectée au projet.

## Important

Le projet est immédiatement testable et déployable en mode démo. Pour accepter de vrais paiements et de vraies données personnelles, finaliser l'authentification Supabase, le webhook Stripe, les politiques RLS, le RGPD, les mentions légales et les tests de sécurité.
