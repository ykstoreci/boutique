# Guide de Déploiement : Netlify + Supabase (PostgreSQL)

Ce projet est configuré pour fonctionner :
- **En développement local** : avec **PGlite** (`DATABASE_URL=pglite:./storage/pgdata`) et accès direct sans mot de passe à `/admin`.
- **En production** : hébergé sur **Netlify** et connecté à une base de données **Supabase PostgreSQL**, avec authentification propriétaire obligatoire et création automatique des 27 tables au premier démarrage.

---

## Étape 1 : Créer la base de données sur Supabase

1. Rendez-vous sur [https://supabase.com](https://supabase.com) et cliquez sur **New Project**.
2. Choisissez un nom de projet (ex. `boutique-db`) et définissez un **Database Password** robuste (conservez-le).
3. Une fois le projet prêt, cliquez sur le bouton **Connect** (en haut) ou allez dans **Project Settings → Database**.
4. Dans l'onglet **Connection String → URI**, copiez l'URL du **Transaction Pooler (port 6543)** ou **Session Pooler (port 5432)** :
   ```text
   postgresql://postgres.[PROJECT_REF]:[VOTRE_MOT_DE_PASSE]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
   ```
   *(Remplacez `[YOUR-PASSWORD]` par le mot de passe choisi à l'étape 2).*

---

## Étape 2 : Déployer sur Netlify

1. Poussez ce projet sur un nouveau dépôt GitHub privé ou public.
2. Rendez-vous sur [https://app.netlify.com](https://app.netlify.com) et cliquez sur **Add new site → Import an existing project**.
3. Sélectionnez votre dépôt GitHub.
4. Netlify détecte automatiquement la configuration de `netlify.toml` :
   - **Build command** : `npm run build`
   - **Publish directory** : `.next`
   - **Runtime** : Next.js (`@netlify/plugin-nextjs`)
5. Avant de cliquer sur *Deploy*, ouvrez **Environment variables** et ajoutez :

   | Clé (Key) | Valeur (Value) |
   | :--- | :--- |
   | `DATABASE_URL` | `postgresql://postgres.[PROJECT_REF]:[MOT_DE_PASSE]@aws-0-....pooler.supabase.com:6543/postgres` |
   | `INITIAL_ADMIN_EMAIL` | *(Facultatif)* Votre email d'administrateur (ex: `contact@maboutique.com`) |
   | `INITIAL_ADMIN_PASSWORD` | *(Facultatif)* Votre mot de passe administrateur (min. 8 caractères) |

6. Cliquez sur **Deploy site**.

---

## Étape 3 : Initialisation automatique & Connexion

- Au premier démarrage sur Netlify, l'application crée automatiquement les **27 tables** dans votre base Supabase PostgreSQL (`products`, `orders`, `stock_arrivals`, `stock_arrival_items`, `themes`, etc.).
- Si vous n'avez pas défini `INITIAL_ADMIN_EMAIL` et `INITIAL_ADMIN_PASSWORD` dans Netlify, rendez-vous sur :
  `https://votre-site.netlify.app/admin/setup`
  pour créer votre compte propriétaire (cette page se verrouille définitivement dès que le compte est créé).
- Sinon, connectez-vous directement sur :
  `https://votre-site.netlify.app/admin/login`

---

## Étape 4 : Activer les Notifications de Commande en Temps Réel sur iPhone & Android

Une fois votre site déployé sur Netlify :

1. **Variables d'environnement VAPID (sur Netlify)** :
   Ajoutez les variables suivantes dans **Site configuration → Environment variables** :
   - `VAPID_PUBLIC_KEY` : copiez la valeur de votre `.env` ou exécutez `npm run vapid:generate`
   - `VAPID_PRIVATE_KEY` : copiez la valeur correspondante
   - `VAPID_SUBJECT` : `mailto:contact@votre-domaine.com`

2. **Installation sur iPhone (iOS 16.4+)** :
   - Ouvrez Safari sur votre iPhone et rendez-vous sur `https://votre-site.netlify.app/admin`.
   - Touchez le bouton **Partager** (icône rectangle avec flèche vers le haut ⎋).
   - Touchez **Sur l'écran d'accueil** puis **Ajouter**.
   - Lancez l'application depuis votre écran d'accueil et touchez **Activer les notifications push** dans le bandeau jaune en haut.
   - Vous recevrez désormais des alertes sonores et des notifications push en temps réel pour chaque nouvelle commande client, même lorsque votre écran est verrouillé !

3. **Synchronisation Temps Réel Boutique <-> Admin** :
   - Le système synchronise automatiquement en continu les nouvelles commandes vers l'espace admin (bannière instantanée + carillon sonore + mise à jour des compteurs et tableaux sans recharger).
   - Les modifications de stock, prix et statut de commande faites dans l'administration sont répercutées en direct sur la boutique publique.

---

## Optionnel : Appliquer les migrations Supabase depuis votre ordinateur

Si vous souhaitez initialiser ou vérifier les tables Supabase depuis votre terminal local :

```powershell
$env:DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[MOT_DE_PASSE]@aws-0-....pooler.supabase.com:6543/postgres"
npm run db:migrate:prod
```
