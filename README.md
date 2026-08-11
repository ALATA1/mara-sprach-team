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
3. Renseigner les variables Supabase dans `.env.local` et dans Vercel.
4. Avant production, compléter les politiques RLS pour les rôles professeur, volontaire et administrateur.

## Stripe

1. Créer un produit avec un prix ponctuel de 10 €.
2. Renseigner `STRIPE_SECRET_KEY` et `STRIPE_PRICE_ID`.
3. Configurer le webhook sur `/api/webhooks/stripe` et renseigner `STRIPE_WEBHOOK_SECRET`.
4. Compléter le TODO du webhook pour activer `memberships` uniquement après `checkout.session.completed`.

## Déploiement Vercel

Importer le dépôt dans Vercel, ajouter les variables d'environnement, puis déployer. Définir `NEXT_PUBLIC_SITE_URL` avec l'URL Vercel affectée au projet.

## Important

Le projet est immédiatement testable et déployable en mode démo. Pour accepter de vrais paiements et de vraies données personnelles, finaliser l'authentification Supabase, le webhook Stripe, les politiques RLS, le RGPD, les mentions légales et les tests de sécurité.
