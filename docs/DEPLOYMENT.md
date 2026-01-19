# WorkOn Backend - Guide de Déploiement

Guide complet pour déployer le backend WorkOn sur Railway (staging et production).

---

## 📊 Vue d'ensemble

| Environnement | URL | DB | Clés Stripe |
|---------------|-----|----|----|
| **Staging** | `workon-staging.up.railway.app` | PostgreSQL Railway (isolée) | TEST (`sk_test_*`) |
| **Production** | `workon-api.up.railway.app` | PostgreSQL Railway (prod) | LIVE (`sk_live_*`) |

---

## 🚂 Déploiement Railway

### Prérequis

- Compte [Railway](https://railway.app)
- Repo GitHub connecté
- Variables d'environnement prêtes

### Architecture Railway

```
┌─────────────────────────────────────────────────────┐
│                  RAILWAY PROJECT                     │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌─────────────────┐    ┌─────────────────┐        │
│  │   Backend       │    │   PostgreSQL    │        │
│  │   (NestJS)      │───▶│   Database      │        │
│  │                 │    │                 │        │
│  │  - Build: npm   │    │  - Auto-backup  │        │
│  │  - Start: node  │    │  - Replicas     │        │
│  │  - Health: /hz  │    │                 │        │
│  └─────────────────┘    └─────────────────┘        │
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

## 🔧 Configuration Railway

### Étape 1: Créer le projet

1. Connectez-vous à [railway.app](https://railway.app)
2. "New Project" → "Deploy from GitHub repo"
3. Sélectionner `workon-backend`
4. Choisir la branche (`main` pour prod, `staging` pour staging)

### Étape 2: Ajouter PostgreSQL

1. Dans le projet, cliquer "New"
2. "Database" → "PostgreSQL"
3. Railway crée automatiquement `DATABASE_URL`

### Étape 3: Configurer les variables

Dans Railway → Service → Variables :

#### Variables OBLIGATOIRES

```bash
# Database (auto-référencée)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Environnement
NODE_ENV=production  # ou "staging"

# JWT (min 32 caractères chacun)
JWT_SECRET=votre-secret-production-32-caracteres-minimum
JWT_REFRESH_SECRET=votre-refresh-secret-production-32-chars

# Stripe (LIVE pour prod, TEST pour staging)
STRIPE_SECRET_KEY=sk_live_xxx  # ou sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxx  # ou pk_test_xxx

# Sécurité
SIGNED_URL_SECRET=secret-urls-signees-32-caracteres-min

# CORS
CORS_ORIGIN=https://workon.app  # URL frontend
```

#### Variables RECOMMANDÉES

```bash
# Monitoring
SENTRY_DSN=https://xxx@sentry.io/xxx
SENTRY_ENVIRONMENT=production

# Rate Limiting
RATE_LIMIT_ENABLED=1
RATE_LIMIT_TTL=60
RATE_LIMIT_LIMIT=100

# Features
ENABLE_SWAGGER_PROD=false  # true uniquement en staging
LOG_LEVEL=info
```

### Étape 4: Déployer

Le déploiement est **automatique** quand vous pushez sur la branche connectée.

**Manuel:**
1. Railway Dashboard → Service
2. "Deploy" → "Deploy Now"

---

## 📁 Fichiers de configuration Railway

### `railway.json`

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm install && npx prisma generate && npm run build"
  },
  "deploy": {
    "numReplicas": 1,
    "startCommand": "npx prisma migrate deploy && node dist/main.js",
    "healthcheckPath": "/healthz",
    "healthcheckTimeout": 30,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

### `nixpacks.toml`

```toml
[phases.setup]
nixPkgs = ["nodejs_20", "python3"]

[phases.install]
cmds = ["npm install"]

[phases.build]
cmds = ["npx prisma generate", "npm run build"]

[start]
cmd = "npx prisma migrate deploy && node dist/main.js"
```

---

## ✅ Checklist Pre-Deploy

### Avant chaque déploiement

- [ ] Tests passent localement (`npm run test`)
- [ ] Build OK (`npm run build`)
- [ ] Lint OK (`npm run lint`)
- [ ] Migrations prêtes (pas de migration pending)
- [ ] Variables d'env configurées dans Railway
- [ ] Aucune clé LIVE dans staging (ou TEST en prod)

### Validation post-deploy

```bash
# 1. Health check
curl https://workon-api.up.railway.app/healthz
# {"status":"ok"}

# 2. Readiness
curl https://workon-api.up.railway.app/readyz
# {"status":"ready","checks":{"database":{"status":"ok"}}}

# 3. API health complet
curl https://workon-api.up.railway.app/api/v1/health
```

---

## 🔄 Stratégie Staging vs Production

### Environnement Staging

| Aspect | Configuration |
|--------|---------------|
| Branche | `staging` ou `main` |
| `NODE_ENV` | `staging` |
| Stripe | `sk_test_*`, `pk_test_*` |
| Swagger | `ENABLE_SWAGGER_PROD=true` |
| DB | PostgreSQL Railway séparée |
| URL | `workon-staging.up.railway.app` |

### Environnement Production

| Aspect | Configuration |
|--------|---------------|
| Branche | `main` |
| `NODE_ENV` | `production` |
| Stripe | `sk_live_*`, `pk_live_*` |
| Swagger | `ENABLE_SWAGGER_PROD=false` |
| DB | PostgreSQL Railway prod |
| URL | `workon-api.up.railway.app` |

### ⚠️ Règles strictes

1. **JAMAIS** de clés Stripe LIVE en staging
2. **JAMAIS** de `DATABASE_URL` prod en staging
3. **TOUJOURS** tester en staging avant prod
4. **TOUJOURS** vérifier les migrations avant merge

---

## 🗄️ Migrations en Production

### Processus recommandé

```bash
# 1. Créer la migration en local
npm run migrate

# 2. Tester la migration localement
npm run migrate:deploy

# 3. Pousser sur staging
git push origin staging

# 4. Vérifier en staging (auto-deployed)
curl https://workon-staging.up.railway.app/readyz

# 5. Si OK, merger vers main (prod)
git checkout main
git merge staging
git push origin main
```

### Migration manuelle (urgence)

```bash
# Via Railway CLI
railway run npx prisma migrate deploy

# Ou via Dashboard → Service → Shell
npx prisma migrate deploy
```

---

## 🔙 Rollback

### Rollback rapide (< 5 min)

1. Railway Dashboard → Deployments
2. Cliquer sur le déploiement précédent fonctionnel
3. "Rollback to this deployment"

### Rollback via Git

```bash
# Revert le commit problématique
git revert HEAD
git push origin main

# Railway redéploie automatiquement
```

### Rollback migration (DANGER)

```bash
# ⚠️ UNIQUEMENT si la migration est réversible
# ⚠️ PEUT CAUSER PERTE DE DONNÉES

# Via Railway Shell
npx prisma migrate resolve --rolled-back MIGRATION_NAME
```

---

## 📊 Monitoring

### Logs Railway

1. Dashboard → Service → Logs
2. Logs en temps réel
3. Filtrer par niveau (error, warn, info)

### Health Endpoints

| Endpoint | Usage | Fréquence check |
|----------|-------|-----------------|
| `/healthz` | Liveness probe | 30s |
| `/readyz` | Readiness probe | 30s |
| `/api/v1/health` | Full diagnostic | Manuel |

### Alertes recommandées

- Uptime < 99%
- Latency `/readyz` > 2s
- Error rate > 1%
- DB connections > 80%

---

## 🔐 Sécurité en Production

### Variables sensibles

| Variable | Stockage |
|----------|----------|
| `JWT_SECRET` | Railway Variables (encrypted) |
| `STRIPE_SECRET_KEY` | Railway Variables |
| `DATABASE_URL` | Railway auto-generated |
| Firebase key | Railway Variables ou Secret file |

### Best practices

1. **Rotation des secrets** tous les 90 jours
2. **Audit logs** activés
3. **Backups DB** automatiques (Railway inclus)
4. **HTTPS only** (Railway gère SSL)

---

## 🚨 Troubleshooting Production

### "Application failed to start"

```bash
# Vérifier les logs
railway logs --service backend

# Causes communes:
# - Variable manquante
# - Migration échouée
# - Port non configuré
```

### "Database connection failed"

```bash
# Vérifier DATABASE_URL
railway variables

# Vérifier que PostgreSQL est UP
railway status
```

### "SIGNED_URL_SECRET is required"

Ajouter dans Railway Variables :
```
SIGNED_URL_SECRET=votre-secret-32-caracteres-minimum
```

### "Rate limit exceeded"

- Normal si traffic élevé
- Augmenter `RATE_LIMIT_LIMIT` si nécessaire
- Vérifier pas d'attaque DDoS

---

## 📋 Résumé des commandes

### Local → Staging

```bash
# Préparer
npm run lint
npm run test
npm run build

# Pousser
git push origin staging

# Vérifier
curl https://workon-staging.up.railway.app/healthz
```

### Staging → Production

```bash
# Merger
git checkout main
git merge staging
git push origin main

# Vérifier
curl https://workon-api.up.railway.app/healthz
curl https://workon-api.up.railway.app/readyz
```

### Rollback

```bash
# Via Railway Dashboard: Deployments → Rollback

# Ou via Git
git revert HEAD
git push origin main
```

---

## 📚 Références

- [STAGING_RAILWAY.md](STAGING_RAILWAY.md) - Guide détaillé staging
- [Railway Documentation](https://docs.railway.app/)
- [Prisma Migrations](https://www.prisma.io/docs/concepts/components/prisma-migrate)

---

_Dernière mise à jour: 2026-01-19_

