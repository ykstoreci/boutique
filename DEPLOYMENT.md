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

## Optionnel : Appliquer les migrations Supabase depuis votre ordinateur

Si vous souhaitez initialiser ou vérifier les tables Supabase depuis votre terminal local :

```powershell
$env:DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[MOT_DE_PASSE]@aws-0-....pooler.supabase.com:6543/postgres"
npm run db:migrate:prod
```
