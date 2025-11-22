# 🚀 Railway Deployment - Quick Commands Checklist

## 📋 Commandes à Exécuter (Dans l'Ordre)

### 1️⃣ Vérifier que Tout Compile

```bash
cd C:\Users\ouell\WorkOnApp\backend
npm run build
```

**✅ Attendu:** Build réussi sans erreurs

---

### 2️⃣ Initialiser Git (si pas déjà fait)

```bash
# Vérifier si git existe
git status

# Si erreur, initialiser:
git init
git add .
git commit -m "Initial commit - WorkOn Backend ready for Railway"
```

---

### 3️⃣ Créer Repo GitHub

**Via navigateur:**
1. https://github.com/new
2. Nom: `workon-backend`
3. Privé (recommandé)
4. NE PAS cocher "Initialize with README"
5. Créer

**En ligne de commande (REMPLACER VOTRE-USERNAME):**

```bash
git remote add origin https://github.com/VOTRE-USERNAME/workon-backend.git
git branch -M main
git push -u origin main
```

---

### 4️⃣ Générer Secrets JWT

**Windows PowerShell:**

```powershell
# JWT_SECRET
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))

# JWT_REFRESH_SECRET (réexécuter pour un nouveau)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

**Mac/Linux:**

```bash
openssl rand -base64 32  # JWT_SECRET
openssl rand -base64 32  # JWT_REFRESH_SECRET
```

**💾 SAUVEGARDER CES SECRETS** - Vous en aurez besoin pour Railway!

---

### 5️⃣ Créer Projet Railway (Via Interface Web)

1. **Aller sur:** https://railway.app
2. **Login** avec GitHub
3. **New Project** → "Deploy from GitHub repo"
4. **Sélectionner:** `workon-backend`
5. **Cliquer** "+ New" → "Database" → "Add PostgreSQL"

---

### 6️⃣ Configurer Variables Railway

**Dans Railway → Service Backend → Variables → Raw Editor:**

```env
# OBLIGATOIRE
NODE_ENV=production
API_PREFIX=api/v1
JWT_SECRET=COLLER_VOTRE_SECRET_GENERE
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=COLLER_VOTRE_REFRESH_SECRET_GENERE
JWT_REFRESH_EXPIRES_IN=30d

# CORS (Modifier après avoir domaine FlutterFlow)
FRONTEND_URL=https://yourapp.flutterflow.app
CORS_ORIGIN=${{RAILWAY_PUBLIC_DOMAIN}},https://yourapp.flutterflow.app

# SWAGGER (pour tester)
ENABLE_SWAGGER_PROD=true

# CLERK (si utilisé - obtenir de dashboard.clerk.com)
CLERK_SECRET_KEY=sk_live_VOTRE_CLE
CLERK_PUBLISHABLE_KEY=pk_live_VOTRE_CLE

# STRIPE (si utilisé - obtenir de dashboard.stripe.com)
STRIPE_SECRET_KEY=sk_live_VOTRE_CLE
STRIPE_WEBHOOK_SECRET=whsec_VOTRE_SECRET
STRIPE_PUBLISHABLE_KEY=pk_live_VOTRE_CLE

# OPTIONNEL
BCRYPT_ROUNDS=12
THROTTLE_TTL=60
THROTTLE_LIMIT=100
LOG_LEVEL=info
```

---

### 7️⃣ Configurer Build/Start Commands Railway

**Railway → Service Backend → Settings:**

**Build Command:**
```bash
npm install && npx prisma generate && npm run build
```

**Start Command:**
```bash
npx prisma migrate deploy && npm run start:prod
```

---

### 8️⃣ Déployer

**Option A: Via Railway UI**
- Railway → Deployments → "Deploy" (coin supérieur droit)

**Option B: Forcer via Git Push**
```bash
git commit --allow-empty -m "Trigger Railway deployment"
git push
```

---

### 9️⃣ Vérifier Déploiement

**Obtenir URL Railway:**
- Railway → Service → Settings → Domains → Copier URL

**Tester Health:**
```bash
# Remplacer VOTRE-DOMAINE
curl https://VOTRE-DOMAINE.up.railway.app/healthz
```

**Attendu:**
```json
{"status":"ok","timestamp":"..."}
```

**Tester API:**
```bash
curl https://VOTRE-DOMAINE.up.railway.app/api/v1/health
```

**Swagger:**
```
https://VOTRE-DOMAINE.up.railway.app/api/docs
```

---

### 🔟 Tester Auth

```bash
# Register (remplacer VOTRE-DOMAINE)
curl -X POST https://VOTRE-DOMAINE.up.railway.app/api/v1/auth/register \
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

**Attendu:** JSON avec `accessToken` + `user`

---

## ✅ Checklist Rapide

- [ ] `npm run build` → OK
- [ ] Git initialisé + commit
- [ ] Repo GitHub créé
- [ ] Code pushé sur GitHub
- [ ] Secrets JWT générés et sauvegardés
- [ ] Projet Railway créé
- [ ] PostgreSQL ajouté
- [ ] Variables Railway configurées
- [ ] Build/Start commands configurés
- [ ] Déploiement lancé
- [ ] `/healthz` → 200 OK
- [ ] `/api/docs` → Swagger accessible
- [ ] Auth test → Token reçu

---

## 🆘 Commandes de Debug

### Voir les Logs Railway

```bash
# Via Railway CLI (optionnel):
npm install -g @railway/cli
railway login
railway logs
```

**OU** dans Railway UI: Deployments → Dernier déploiement

### Accéder au Shell Railway

Railway → Service → "Shell" (en haut à droite)

```bash
# Exécuter migrations manuellement
npx prisma migrate deploy

# Voir variables d'env
env | grep DATABASE_URL
```

---

## 🔄 Déploiements Futurs

```bash
# 1. Modifier code localement
# 2. Tester
npm run build

# 3. Commit + Push
git add .
git commit -m "feat: nouvelle fonctionnalité"
git push origin main

# Railway redéploie automatiquement! 🎉
```

---

## 📱 Pour FlutterFlow

**Base URL à utiliser:**
```
https://VOTRE-DOMAINE.up.railway.app/api/v1
```

**Headers pour requêtes authentifiées:**
```
Content-Type: application/json
Authorization: Bearer [votre_token]
```

---

## 💡 Pro Tips

1. **Activer Railway CLI** pour logs en temps réel:
   ```bash
   npm i -g @railway/cli
   railway login
   railway logs --follow
   ```

2. **Custom Domain** (optionnel):
   - Railway → Settings → Domains → Custom Domain
   - Ajouter CNAME dans votre DNS: `api.votredomaine.com`

3. **Monitoring Externe**:
   - UptimeRobot (gratuit): https://uptimerobot.com
   - Ping: `https://VOTRE-DOMAINE.up.railway.app/healthz` chaque 5 min

4. **Sentry pour Error Tracking**:
   - Créer compte: https://sentry.io
   - Ajouter variable Railway: `SENTRY_DSN=https://xxx@yyy.ingest.sentry.io/zzz`

---

**🎉 C'est tout! Votre backend est maintenant en prod.**

Pour le guide détaillé: Voir `README_DEPLOY_RAILWAY.md`

