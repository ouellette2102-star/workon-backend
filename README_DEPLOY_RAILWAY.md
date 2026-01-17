# 🚀 Guide de Déploiement Railway - WorkOn Backend

Ce guide vous explique **étape par étape** comment déployer ce backend NestJS sur Railway et le connecter à FlutterFlow.

---

## 📋 Pré-requis

- [ ] Compte GitHub (gratuit)
- [ ] Compte Railway (gratuit: https://railway.app)
- [ ] Git installé localement
- [ ] Node.js 20+ installé
- [ ] Accès aux clés API:
  - Clerk (si utilisation auth Clerk)
  - Stripe (si utilisation paiements)

---

## 🎯 Vue d'Ensemble

**Ce que Railway va faire automatiquement:**
1. Détecter le projet NestJS
2. Installer les dépendances (`npm install`)
3. Générer le client Prisma (`prisma generate`)
4. Compiler TypeScript (`npm run build`)
5. Exécuter les migrations Prisma (`prisma migrate deploy`)
6. Démarrer l'application (`npm run start:prod`)

**Ce que VOUS devez faire:**
1. Pousser le code sur GitHub
2. Connecter Railway à votre repo GitHub
3. Ajouter une base de données PostgreSQL
4. Configurer les variables d'environnement
5. Déployer!

---

## 📦 ÉTAPE 1: Préparer le Dépôt Git Local

### 1.1. Vérifier que le projet compile

```bash
# Dans le dossier backend/
cd C:\Users\ouell\WorkOnApp\backend

# Vérifier la compilation
npm run build

# Résultat attendu: Build réussi sans erreurs
```

### 1.2. Créer un .gitignore (si pas déjà présent)

Vérifiez que votre `.gitignore` contient au minimum:

```
node_modules/
dist/
.env
.env.local
.env.production
*.log
uploads/
```

### 1.3. Initialiser Git (si pas déjà fait)

```bash
# Vérifier si Git est déjà initialisé
git status

# Si erreur "not a git repository", initialiser:
git init

# Ajouter tous les fichiers
git add .

# Premier commit
git commit -m "Initial commit - WorkOn Backend ready for Railway"
```

---

## 🐙 ÉTAPE 2: Pousser sur GitHub

### 2.1. Créer un nouveau dépôt sur GitHub

1. Aller sur https://github.com/new
2. Nom du repo: `workon-backend` (ou autre)
3. **Privé** (recommandé si code sensible)
4. **NE PAS** cocher "Initialize with README" (on a déjà du code)
5. Cliquer "Create repository"

### 2.2. Lier le dépôt local à GitHub

GitHub vous donne des commandes, mais voici le détail:

```bash
# Ajouter le remote (REMPLACER par VOTRE URL GitHub)
git remote add origin https://github.com/VOTRE-USERNAME/workon-backend.git

# Vérifier
git remote -v

# Pousser le code
git branch -M main
git push -u origin main
```

**✅ Checkpoint:** Votre code est maintenant sur GitHub!

---

## 🚂 ÉTAPE 3: Créer un Projet Railway

### 3.1. Connexion à Railway

1. Aller sur https://railway.app
2. Cliquer "Login" → Se connecter avec GitHub
3. Autoriser Railway à accéder à vos repos

### 3.2. Créer un nouveau projet

1. Cliquer "New Project"
2. Sélectionner "Deploy from GitHub repo"
3. Chercher et sélectionner `workon-backend` (ou le nom choisi)
4. Cliquer sur le repo

**Railway va automatiquement:**
- Détecter NestJS
- Lancer un build initial (qui va ÉCHOUER car manque DATABASE_URL)
- C'est NORMAL! On va configurer la DB maintenant

### 3.3. Ajouter PostgreSQL

1. Dans votre projet Railway, cliquer "+ New"
2. Sélectionner "Database" → "Add PostgreSQL"
3. Railway crée automatiquement une base de données

**Magie Railway:** La variable `DATABASE_URL` est automatiquement injectée dans votre service backend!

---

## ⚙️ ÉTAPE 4: Configurer les Variables d'Environnement

### 4.1. Accéder aux Variables

1. Dans Railway, cliquer sur votre service backend (pas la DB)
2. Onglet "Variables"
3. Cliquer "Raw Editor" (plus facile pour copier-coller)

### 4.2. Copier-Coller les Variables Essentielles

**⚠️ IMPORTANT:** Remplacez les valeurs `CHANGE-ME` par vos vraies clés!

```env
# NODE & APP
NODE_ENV=production
API_PREFIX=api/v1

# JWT (OBLIGATOIRE - Générer avec: openssl rand -base64 32)
JWT_SECRET=CHANGE-ME-strong-secret-min-32-chars-for-production
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=CHANGE-ME-another-strong-secret-for-refresh-tokens
JWT_REFRESH_EXPIRES_IN=30d

# CLERK (si vous utilisez Clerk - sinon omettez)
CLERK_SECRET_KEY=sk_live_VOTRE_CLE_CLERK
CLERK_PUBLISHABLE_KEY=pk_live_VOTRE_CLE_CLERK

# STRIPE (si vous utilisez Stripe - sinon omettez)
STRIPE_SECRET_KEY=sk_live_VOTRE_CLE_STRIPE
STRIPE_WEBHOOK_SECRET=whsec_VOTRE_WEBHOOK_SECRET
STRIPE_PUBLISHABLE_KEY=pk_live_VOTRE_CLE_STRIPE

# CORS (OBLIGATOIRE pour FlutterFlow)
FRONTEND_URL=https://yourapp.flutterflow.app
CORS_ORIGIN=${{RAILWAY_PUBLIC_DOMAIN}},https://yourapp.flutterflow.app

# SWAGGER (pour tester dans FlutterFlow)
ENABLE_SWAGGER_PROD=true

# SÉCURITÉ
BCRYPT_ROUNDS=12
THROTTLE_TTL=60
THROTTLE_LIMIT=100
LOG_LEVEL=info
```

### 4.3. Variables Spéciales Railway

Railway fournit automatiquement:
- `DATABASE_URL` (de la DB PostgreSQL)
- `PORT` (le port que Railway assigne)
- `RAILWAY_PUBLIC_DOMAIN` (votre domaine public)

**Vous pouvez les référencer avec:** `${{VARIABLE_NAME}}`

Exemple pour CORS:
```
CORS_ORIGIN=${{RAILWAY_PUBLIC_DOMAIN}},https://yourapp.flutterflow.app
```

### 4.4. Générer des Secrets Sécurisés

**Sur Windows (PowerShell):**
```powershell
# JWT_SECRET
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))

# JWT_REFRESH_SECRET (générer à nouveau)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

**Sur Mac/Linux:**
```bash
openssl rand -base64 32
```

---

## 🔄 ÉTAPE 5: Configurer le Build et Déploiement

### 5.1. Build et Start Commands (Railway)

**Start Command requis (Railway):** `npm run start:railway`

**Build Command:**
```bash
npm run build
```

**Start Command:**
```bash
npm run start:railway
```

**Start script:** `scripts/railway-start.js` exécute `npx prisma migrate deploy` puis lance `node dist/main.js`.

---

## 🚀 ÉTAPE 6: Déployer!

### 6.1. Déclencher le Déploiement

Railway redéploie automatiquement à chaque push sur `main`, MAIS pour forcer maintenant:

1. Onglet "Deployments"
2. Cliquer "Deploy" (coin supérieur droit)

**OU** pousser un commit:
```bash
git commit --allow-empty -m "Trigger Railway deployment"
git push
```

### 6.2. Suivre les Logs

1. Onglet "Deployments" → Dernier déploiement
2. Cliquer sur le déploiement en cours
3. Voir les logs en temps réel

**Logs à surveiller:**
```
✓ npm install
✓ Prisma generate
✓ Build NestJS
✓ Prisma migrate deploy
✓ Application is running on: http://0.0.0.0:PORT/api/v1
```

### 6.3. En Cas d'Erreur

**Erreur fréquente #1: `DATABASE_URL not found`**
- Solution: Vérifier que PostgreSQL est bien ajouté et lié au service

**Erreur fréquente #2: `Prisma migrate failed`**
- Solution: Vérifier que `prisma/schema.prisma` est bien commité
- Solution: Lancer manuellement via Railway Shell (voir section Troubleshooting)

**Erreur fréquente #3: `JWT_SECRET not set`**
- Solution: Ajouter `JWT_SECRET` dans Variables

---

## ✅ ÉTAPE 7: Vérifier le Déploiement

### 7.1. Obtenir l'URL Publique

1. Onglet "Settings" de votre service backend
2. Section "Domains"
3. Railway génère une URL: `https://workon-backend-production.up.railway.app`

**OU** cliquer "Generate Domain" si pas encore généré.

### 7.2. Tester les Endpoints

**Health Check:**
```bash
curl https://VOTRE-DOMAINE.railway.app/healthz
```

**Résultat attendu:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-20T01:00:00.000Z"
}
```

**API Health (avec prefix):**
```bash
curl https://VOTRE-DOMAINE.railway.app/api/v1/health
```

**Swagger Docs:**
```
https://VOTRE-DOMAINE.railway.app/api/docs
```

**Si ENABLE_SWAGGER_PROD=true, vous devriez voir la documentation Swagger UI!**

### 7.3. Tester l'Authentification

```bash
# Register un utilisateur
curl -X POST https://VOTRE-DOMAINE.railway.app/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!",
    "firstName": "Test",
    "lastName": "User",
    "role": "worker",
    "city": "Montreal"
  }'
```

**Résultat attendu:** Token JWT + user info

---

## 📱 ÉTAPE 8: Intégrer avec FlutterFlow

### 8.1. Obtenir l'URL de Base

Votre URL de base pour FlutterFlow:
```
https://VOTRE-DOMAINE.railway.app/api/v1
```

### 8.2. Configurer FlutterFlow API Group

1. Dans FlutterFlow: **Settings** → **API Calls**
2. Créer un nouveau "API Group": `WorkOn API`
3. **Base URL:** `https://VOTRE-DOMAINE.railway.app/api/v1`
4. **Headers** (pour auth):
   ```
   Content-Type: application/json
   Authorization: Bearer [token_variable]
   ```

### 8.3. Endpoints à Créer dans FlutterFlow

| Endpoint | Method | Path | Description |
|----------|--------|------|-------------|
| Register | POST | `/auth/register` | Inscription utilisateur |
| Login | POST | `/auth/login` | Connexion |
| Get Me | GET | `/auth/me` | Profil utilisateur (auth required) |
| List Missions | GET | `/missions/available` | Liste missions (auth required) |
| Create Mission | POST | `/missions` | Créer mission (auth required) |

### 8.4. Tester dans Swagger

1. Aller sur: `https://VOTRE-DOMAINE.railway.app/api/docs`
2. Tester `/auth/register` → Copier le token
3. Cliquer 🔓 "Authorize" → Coller `Bearer YOUR_TOKEN`
4. Tester `/auth/me` → Doit retourner vos infos
5. Copier les requêtes curl pour les reproduire dans FlutterFlow

---

## 🔒 ÉTAPE 9: Sécurité Post-Déploiement

### 9.1. Mettre à Jour CORS

Une fois votre app FlutterFlow déployée:

```env
CORS_ORIGIN=${{RAILWAY_PUBLIC_DOMAIN}},https://votreapp.flutterflow.app,https://votredomaine.com
```

### 9.2. Désactiver Swagger en Prod (optionnel)

Si vous ne voulez pas exposer Swagger publiquement:

```env
ENABLE_SWAGGER_PROD=false
```

### 9.3. Activer Sentry (Monitoring d'Erreurs)

1. Créer compte sur https://sentry.io
2. Créer un projet NestJS
3. Copier le DSN
4. Ajouter dans Railway Variables:
   ```env
   SENTRY_DSN=https://xxx@yyy.ingest.sentry.io/zzz
   SENTRY_ENVIRONMENT=production
   ```

### 9.4. Configurer un Domaine Personnalisé (Optionnel)

1. Railway Settings → Domains
2. Cliquer "Custom Domain"
3. Entrer: `api.votre-domaine.com`
4. Configurer le CNAME dans votre DNS:
   ```
   CNAME api → workon-backend-production.up.railway.app
   ```

---

## 🛠️ Troubleshooting

### ❌ Problème: Build échoue avec "Prisma Client not generated"

**Solution:**
```bash
# Ajouter dans Build Command:
npm install && npx prisma generate && npm run build
```

### ❌ Problème: Migrations Prisma échouent

**Solution:**
1. Railway → Votre service → "Shell" (en haut à droite)
2. Exécuter manuellement:
   ```bash
   npx prisma migrate deploy
   ```

### ❌ Problème: CORS Errors depuis FlutterFlow

**Solution:**
```env
# Ajouter le domaine FlutterFlow complet:
CORS_ORIGIN=${{RAILWAY_PUBLIC_DOMAIN}},https://votreapp.flutterflow.app,https://ff-debug.web.app
```

### ❌ Problème: 502 Bad Gateway

**Causes possibles:**
1. App crashed → Vérifier logs
2. Port incorrect → Vérifier que `main.ts` lit `process.env.PORT`
3. Timeout au démarrage → Augmenter timeout Railway (Settings)

### ❌ Problème: Variables d'environnement non prises en compte

**Solution:**
1. Vérifier que les variables sont bien dans l'onglet "Variables"
2. Redéployer (Railway → Deployments → Deploy)

### 🔍 Accéder aux Logs en Direct

```bash
# Dans Railway:
1. Service → "Deployments" → Dernier déploiement
2. Voir logs en temps réel

# OU via Railway CLI:
railway logs
```

---

## 📊 Monitoring

### Vérifier la Santé de l'App

**Healthcheck Railway (automatique):**
Railway ping automatiquement `/healthz` toutes les 30s.

**Uptime Monitoring Externe (optionnel):**
- UptimeRobot (gratuit): https://uptimerobot.com
- Pingdom
- Configurez pour ping `https://VOTRE-DOMAINE.railway.app/healthz`

### Métriques Railway

Railway fournit:
- CPU usage
- Memory usage
- Network traffic
- Request logs

Accessible dans: Service → "Metrics"

---

## 🔄 Mises à Jour (Déploiements Futurs)

### Workflow Standard

```bash
# 1. Faire des changements localement
# 2. Tester localement
npm run build
npm run start:prod

# 3. Commit
git add .
git commit -m "feat: nouvelle fonctionnalité"

# 4. Push vers GitHub
git push origin main

# Railway redéploie AUTOMATIQUEMENT! 🎉
```

### Rollback en Cas de Problème

1. Railway → "Deployments"
2. Trouver le dernier déploiement qui fonctionnait
3. Cliquer les 3 points → "Rollback to this deployment"

---

## 💰 Coûts Railway

**Plan Gratuit (Hobby):**
- $5 de crédit gratuit/mois
- Suffisant pour petits projets
- App dort après inactivité (réveil automatique sur requête)

**Plan Developer ($5/mois):**
- $5 de crédit inclus
- Pas de sommeil
- Meilleur pour production

**Estimation pour WorkOn:**
- Backend NestJS: ~$3-5/mois
- PostgreSQL: ~$2-3/mois
- **Total: ~$5-8/mois**

---

## ✅ Checklist Finale

- [ ] Code poussé sur GitHub
- [ ] Projet Railway créé et connecté à GitHub
- [ ] PostgreSQL ajouté et lié
- [ ] Variables d'environnement configurées (JWT, CORS, etc.)
- [ ] Build & Start commands configurés
- [ ] Déploiement réussi (logs verts)
- [ ] `/healthz` retourne `{"status":"ok"}`
- [ ] `/api/v1/health` accessible
- [ ] `/api/docs` Swagger accessible (si enabled)
- [ ] Auth testée (`/auth/register`, `/auth/login`)
- [ ] CORS configuré avec domaine FlutterFlow
- [ ] FlutterFlow API Group créé avec URL Railway
- [ ] Sentry configuré (optionnel)
- [ ] Domaine personnalisé (optionnel)

---

## 🎉 Félicitations!

Votre backend NestJS WorkOn est maintenant en production sur Railway! 🚀

**URL de votre API:**
```
https://VOTRE-DOMAINE.railway.app/api/v1
```

**Prochaines étapes:**
1. Intégrer l'API dans FlutterFlow
2. Tester tous les flows depuis l'app mobile
3. Configurer monitoring + alertes
4. Déployer votre app FlutterFlow

**Besoin d'aide?**
- Railway Discord: https://discord.gg/railway
- Railway Docs: https://docs.railway.app
- NestJS Docs: https://docs.nestjs.com

