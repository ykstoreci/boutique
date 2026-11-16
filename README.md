# Boutique E-Commerce Personnalisable & Administrable

Plateforme e-commerce professionnelle, moderne, entièrement administrable par un propriétaire unique, conçue selon une approche **Mobile First** stricte (optimisée pour 99 % des clients sur smartphone) et livrée **rigoureusement vierge de tout contenu commercial fictif**.

---

## 🌟 Points Forts & Respect du Cahier des Charges

1. **Expérience Client Mobile First Sans Compromis**
   - **Aucune barre de recherche sur mobile** (ni champ, ni icône, ni tiroir de recherche) pour préserver une interface épurée, fluide et axée sur les catégories et la découverte visuelle.
   - **Fiche produit & Checkout en 1 seule page** : le formulaire de commande est positionné directement sous la photo et les informations de l'article, sans tunnel d'achat multi-étapes.
   - Modes dynamiques **Livraison** (commune, quartier, lieu-dit) et **Expédition** (ville de destination).

2. **Système de Commande WhatsApp Fiabilisé**
   - **Vérification et réservation transactionnelle des stocks** côté serveur.
   - **Enregistrement préalable et obligatoire en base de données** avec génération d'un numéro de commande unique (`CMD-YYYYMMDD-XXXX`).
   - Redirection vers WhatsApp (`https://wa.me/...`) avec message prérempli complet uniquement **après** confirmation en base.
   - Page de confirmation avec récapitulatif détaillé, bouton de relance WhatsApp et copie en un clic si l'application ne s'ouvre pas automatiquement.

3. **Espace Administrateur Installable sur iPhone (PWA)**
   - Conçu comme une application native pour iPhone avec manifest PWA (`display: standalone`), icônes tactiles et navigation par onglets ergonomiques en bas d'écran.
   - **Vraies notifications push Web Push (VAPID)** pour les nouvelles commandes et alertes de stock faible (compatible iOS Safari ≥ 16.4 après ajout à l'écran d'accueil).
   - Tableau de bord en temps réel avec graphiques SVG natifs (sans bibliothèque lourde).
   - Éditeur visuel de thème avec aperçu interactif en direct (mobile / tablette / ordinateur), historique des versions et sauvegarde brouillon / publication.
   - Gestion des stocks avec journal d'audit complet de chaque mouvement.
   - Gestion fine des zones de livraison et d'expédition avec calcul automatique des frais.
   - Sauvegarde et restauration complètes (`npm run backup`, `npm run restore`).

---

## 📁 Architecture Technique

- **Framework** : Next.js 15 (App Router, Server & Client Components)
- **Langage** : TypeScript
- **Styles** : Tailwind CSS v4 & variables CSS dynamiques injectées par le moteur de thème
- **ORM** : Drizzle ORM avec schéma PostgreSQL unifié (25 tables relationnelles)
- **Base de données** :
  - **Développement local & tests** : PostgreSQL embarqué PGlite (`@electric-sql/pglite`) stocké dans `./storage/pgdata`, sans aucune installation requise.
  - **Production** : Compatible nativement avec tout serveur PostgreSQL standard via `DATABASE_URL=postgres://...`.
- **Traitement d'images** : Sharp (génération automatique de WebP haute performance en 400px, 800px et 1600px).
- **Notifications Push** : Web Push standard (chiffrement VAPID).

---

## 🚀 Démarrage Rapide

### 1. Prérequis
- Node.js version 18.18+ ou version 20+ (recommandé 20.x ou 22.x LTS).
- npm, pnpm ou yarn.

### 2. Installation des dépendances
```bash
npm install
```

### 3. Initialisation de la base et du compte administrateur
Les migrations et les données initiales sont appliquées via la commande :
```bash
npm run migrate
```

Un compte administrateur initial est configuré :
- **Email** : `admin@boutique.local`
- **Mot de passe initial** : `Admin1234!*`
*(Vous pouvez modifier ces identifiants ou en créer un nouveau avec `npm run create-admin`)*.

### 4. Lancement du serveur de développement
```bash
npm run dev
```
Ouvrez votre navigateur :
- **Boutique publique** : [http://localhost:3000](http://localhost:3000)
- **Administration** : [http://localhost:3000/admin](http://localhost:3000/admin)

### 5. Build et lancement en production
```bash
npm run build
npm start
```

---

## 📱 Installation de l'Administration sur iPhone (PWA & Push)

1. Ouvrez Safari sur votre iPhone et accédez à l'URL de votre boutique : `https://votre-domaine.com/admin`.
2. Connectez-vous avec vos identifiants administrateur.
3. Touchez l'icône **Partager** (le carré avec une flèche vers le haut) dans la barre de navigation de Safari.
4. Faites défiler vers le bas et sélectionnez **Sur l'écran d'accueil**.
5. Nommez l'application (ex. *Ma Boutique*) puis validez avec **Ajouter**.
6. Ouvrez l'application depuis votre écran d'accueil : elle s'exécute en plein écran sans l'interface de Safari.
7. Allez dans le menu **Notifications** ou cliquez sur la cloche pour autoriser les **Notifications Push**.
8. Cliquez sur **Envoyer un test push** pour tester la réception instantanée sur votre iPhone.

> **Note iOS** : Apple requiert impérativement une connexion **HTTPS** et l'ajout de l'application à l'écran d'accueil pour activer les notifications Web Push sur iOS (disponible depuis iOS 16.4).

---

## 💾 Sauvegarde et Restauration

### Créer une sauvegarde complète
Cette commande exporte l'intégralité des 25 tables en JSON ainsi que tous les médias téléversés dans un sous-dossier horodaté du répertoire `./backups/` :
```bash
npm run backup
```

### Restaurer une sauvegarde
Cette commande réinjecte les données et les images d'une sauvegarde antérieure :
```bash
npm run restore
```
Vous pouvez également passer le numéro ou le nom du dossier directement :
```bash
npm run restore 1
# ou
npm run restore backup-2026-11-11T17-29-24-734Z
```

---

## 🧪 Tests Automatisés

Le projet comprend une suite complète de tests unitaires et d'intégration validant le cycle de vie des commandes, la gestion des stocks, la protection contre les doubles soumissions (idempotence) et la validité du moteur de thèmes :

```bash
# Lancer les tests
npm test

# Vérification stricte des types TypeScript
npm run typecheck
```

---

## ⚙️ Variables d'Environnement

Le fichier `.env` configure l'application :

```ini
# Port du serveur
PORT=3000
NODE_ENV=production

# Base de données
# Laisser vide ou pglite:./storage/pgdata pour la base embarquée locale
# Ou renseigner une URL Postgres de production :
# DATABASE_URL=postgres://utilisateur:motdepasse@hote:5432/nom_base

# Clé secrète de session d'administration (au moins 32 caractères aléatoires)
SESSION_SECRET=boutique-super-secret-session-key-change-in-production-min-32-chars

# Stockage des fichiers média téléversés
LOCAL_STORAGE_DIR=./storage/uploads

# Clés VAPID pour les notifications Push Web
# Générées automatiquement avec : npm run generate-vapid
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:admin@boutique.local
```

---

## 📄 Licence
Propriétaire - Tous droits réservés.

