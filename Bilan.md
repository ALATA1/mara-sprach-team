# Bilan de Mara-Sprach Team

**État du bilan : 8 octobre 2026 — mise à jour après déploiement**

## Résumé

Mara-Sprach Team possède une base fonctionnelle d'inscription, de paiement, de cours, de documents, de calendrier LIVE et d'installation PWA. Des espaces de travail viennent d'être ajoutés pour les formateurs, bénévoles et administrateurs. La sortie reste une bêta web : les migrations récentes doivent encore être vérifiées/appliquées en production et les services et parcours réels doivent être testés.

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

L’espace `/staff/teaching` permet aux formateurs de créer/modifier des cours et des leçons, de publier/dépublier un cours, de créer des séances LIVE, de voir les inscrits, noter les présences, reprogrammer ou annuler une séance. Les cours publiés et leurs leçons apparaissent dans le catalogue étudiant. Les liens Teams peuvent être enregistrés sur les séances.

Les accès de formateurs aux séances sont limités à celles dont ils sont responsables. Les séances historiques non attribuées restent réservées à la gestion administrateur. L’envoi de courriels d’annulation/reprogrammation dépend de Resend ; sans configuration ou en cas d’échec, l’espace affiche un avertissement. Il reste à tester ce parcours avec des comptes formateur/étudiant réels et à décider si les contenus vidéo et documents ont besoin d’édition plus complète depuis cet espace.

### 3. Cours et suivi pédagogique

Les cours créés par les formateurs ont un catalogue dynamique de leçons et un suivi de leçon terminé lié au compte. Les parcours français/allemand préexistants, quiz, devoirs et évaluations ne sont pas tous administrables depuis l’espace formateur ; la progression des cours dynamiques ne couvre pas encore les quiz/devoirs. Les enseignants doivent être affectés aux comptes par un administrateur.

### 4. Visioconférence

Les liens Jitsi anciens sont encore pris en charge dans le code, mais le service public `meet.jit.si` a affiché un avertissement limitant l’intégration à une démonstration. Il ne convient donc pas aux cours réguliers dans cette configuration.

Teams fonctionne par ouverture d’un lien vers Teams ou son application : l’appel n’est pas intégré dans Mara-Sprach. Sur téléphone, l’étudiant peut devoir installer l’application Teams. Un compte Microsoft n’est généralement pas obligatoire pour participer comme invité, selon les réglages de la réunion. L’offre Teams Free est limitée à 60 minutes et 100 participants par réunion de groupe.

Une séance de test Teams avait été enregistrée pour le 8 octobre 2026, de 18 h à 19 h (heure ROM). Le code Teams est déployé. Le parcours réel avec un invité sans compte Microsoft reste à vérifier sur ordinateur, iPhone et Android.

### 5. Accompagnement et demandes

Le formulaire crée et affiche les demandes liées au compte étudiant. L’espace `/staff` permet aux bénévoles de réclamer les demandes non attribuées et de suivre celles qui leur sont attribuées ; les administrateurs peuvent les attribuer à un bénévole et modifier leur état. L’API contrôle les rôles et filtre les demandes des bénévoles. Il reste à ajouter les notifications de création/affectation/changement d’état et un journal détaillé de suivi. Le contact e-mail reste distinct de ces demandes.

### 6. Gestion des comptes et des paiements

L’espace `/staff/admin` liste les comptes, rôles, adhésions et formules. Il permet de promouvoir/démouvoir les comptes avec journalisation et protection contre le retrait du dernier administrateur. L’administration peut consulter paiements et abonnements, ouvrir le portail Stripe d’un client pour l’aider, et initier un remboursement intégral avec confirmation, motif et clé d’idempotence. Les demandes d’accès formateur restent une décision manuelle via l’espace admin ; l’approbation n’est pas encore un processus dédié. Les remboursements partiels ne sont pas pris en charge.

### 7. Disponibilité, confidentialité et exploitation

Les nouvelles migrations `20261008210000_staff_operations.sql`, `20261008211000_admin_operations.sql`, `20261008212000_refund_processing_status.sql` et `20261008213000_staff_student_rls_hardening.sql` ont été appliquées à Supabase local seulement. Le contrôle local `supabase db lint` et les Security Advisors ne détectent pas de problème. Des politiques et privilèges trop permissifs ont été resserrés : les inscriptions LIVE passent par les fonctions atomiques (plus d'écriture directe) et un étudiant ne peut plus modifier directement l'état d'une demande. Il faut vérifier l'historique puis appliquer les migrations manquantes au projet de production après sauvegarde, sans réinitialisation. Les sauvegardes et la restauration, les alertes de production, la configuration SMTP/Resend, Stripe et Teams, ainsi que la disponibilité et l'accès à l'espace admin restent à valider en production contrôlée. **L’éditeur indique que Mara-Sprach Team n’est pas encore déclaré juridiquement en France et envisage une entreprise individuelle** : les mentions légales, conditions de vente/utilisation et documents de confidentialité ne peuvent donc pas être finalisés avec le seul nom de marque. L’identité et les coordonnées légales (dont l’immatriculation) devront être établies, puis les documents vérifiés par un professionnel compétent avant tout lancement commercial. Voir [`README.md`](./README.md).

### 8. Tests et qualité

Les tests d’intégration Supabase vérifient inscription/annulation LIVE, l’anti-doublon, la capacité, les présences, la progression et son isolation, les restrictions RLS d’écriture directe, ainsi que le traitement d’une demande, les changements de rôle, leur journalisation et la protection du dernier administrateur. Les tests webhook rejettent les signatures absentes/invalides et vérifient la synchronisation locale des états pending/failed à partir d’événements signés simulés. Ils créent et suppriment des comptes temporaires ; le harnais refuse toute cible Supabase hors `localhost`/`127.0.0.1`. Ils ne couvrent pas encore les API/UI complètes des tableaux de bord, les courriels Resend, les parcours d’authentification complets, ni le cycle complet des remboursements dans le compte Stripe de test.

**Contrôle local du 8 octobre 2026 :** les tests d’intégration passent sur Supabase local ; `supabase db lint` et les Security Advisors passent sans problème signalé ; `npm run build`, `npm run typecheck` et `npm run lint` passent, et `npm audit` ne signale aucune vulnérabilité. ESLint signale encore cinq avertissements préexistants dans `components/app-shell.tsx` (variables/types inutilisés, `any` et dépendances de hook). Les migrations récentes sont appliquées localement. Ces contrôles ne remplacent pas la validation des API avec chaque rôle, le cycle complet de paiement/remboursement sur une intégration Stripe de test, les courriels Resend, ni les essais métier sur appareils réels.

### 9. Application mobile et stores

Le dépôt est une application web Next.js. Il contient un manifeste et des icônes PWA, ainsi que des métadonnées Apple permettant l’ajout à l’écran d’accueil. Il ne contient pas de projet natif iOS ou Android, de configuration de compilation/signature, ni de chaîne de livraison App Store Connect ou Google Play Console. L’installation PWA décrite dans le README n’équivaut donc pas à une publication dans les stores. Le manifeste seul ne prouve pas non plus que l’installation PWA et le fonctionnement hors ligne sont complets sur tous les appareils.

## Priorités recommandées

### Priorité 1 — Vérifier la mise en production réelle

1. Vérifier la séparation des environnements : l’URL Supabase publique est intégrée au bundle lors de la compilation ; utiliser les variables Supabase locales pour les essais locaux. Vérifier ensuite les migrations manquantes du projet de production, sauvegarder puis planifier leur application. Le durcissement RLS est validé en local ; il n’est pas déployé en production.
2. Tester inscription, confirmation d’e-mail, récupération de mot de passe, accès étudiant/formateur, paiement réussi/échoué/remboursé, abonnement et webhook Stripe en environnement de test puis en production contrôlée.
3. Vérifier le parcours Teams avec un formateur et un étudiant invité sur ordinateur, iPhone et Android ; clarifier les conditions d’accès et les limites de durée.

### Priorité 2 — Valider les outils formateurs et bénévoles

Les interfaces de gestion des cours, leçons et séances, des inscriptions/présences et des demandes d’accompagnement sont maintenant présentes. Il reste à tester les parcours bout en bout avec des comptes de chaque rôle, vérifier les notifications e-mail Resend en environnement de test, et préciser le processus d’approbation des demandes d’accès formateur. Les quiz/devoirs des cours créés dans le nouvel espace formateur ne sont pas encore administrables depuis cette interface.

### Priorité 3 — Valider l’administration et les paiements

La console d’administration des comptes, rôles, adhésions, paiements et abonnements est disponible ; les changements de rôle sont audités et le dernier administrateur est protégé. Tester les remboursements et webhooks exclusivement avec Stripe en mode test (succès, attente, échec, reprise idempotente) avant toute décision de déploiement. Seuls les remboursements intégraux sont pris en charge ; aucun remboursement réel n’a été effectué.

### Priorité 4 — Fermer les prérequis de production

Auditer les règles RLS pour chaque table et rôle, vérifier les migrations après sauvegarde avant de les appliquer en production, et éprouver les sauvegardes/restaurations, alertes, journaux et procédures de support. Finaliser et faire valider les pages légales et la conformité RGPD, documenter les données collectées, leur durée de conservation et les procédures d’exercice des droits. Valider les paramètres réels de Supabase, Stripe, Teams et Resend dans un déploiement contrôlé, sans utiliser de données ou paiements réels pour les tests.

### Priorité 5 — Décider d’une publication sur les stores

La publication sur les stores est techniquement envisageable plus tard, soit avec une application native, soit avec une enveloppe web adaptée, mais elle demande un choix de produit et une vérification des règles des stores (notamment pour les paiements et les contenus numériques). Il faut aussi préparer les comptes développeur, les fiches de store, les captures d’écran, les icônes, la politique de confidentialité, les déclarations de collecte de données, les tests sur appareils réels et les versions signées.

#### Conclusion — peut-on publier maintenant ?

**Pour un accès web/PWA en bêta contrôlée : oui**, après vérification des migrations, des clés de production, des règles RLS et des parcours réels. Les utilisateurs peuvent déjà ouvrir le site sur iPhone et Android et, selon leur navigateur, l’ajouter à l’écran d’accueil.

**Pour une publication sur l’App Store et Google Play : c’est trop tôt dans l’état constaté du dépôt.** Il n’y a pas de livrable mobile natif prêt à signer et soumettre. Les interfaces de gestion des cours/séances, des demandes et de l’administration existent, mais leurs parcours complets, les paiements en mode test, la conformité légale/confidentialité et les essais sur appareils réels restent à valider. L’existence d’une URL Vercel ou d’une PWA installable ne signifie pas que l’application est prête pour les stores.

La recommandation est de poursuivre d’abord une bêta web/PWA limitée, de terminer les tests et les opérations indispensables, puis de choisir explicitement entre rester une PWA ou financer une vraie expérience mobile distribuée sur les stores. Une simple enveloppe du site ne garantit ni une bonne expérience mobile ni l’acceptation par les stores ; les exigences de publication et de paiement devront être revalidées au moment de la soumission.