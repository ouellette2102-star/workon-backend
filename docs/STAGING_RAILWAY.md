# 🚂 WorkOn Backend - Staging Railway

Guide de configuration et déploiement du staging sur Railway.

## 📋 Vue d'ensemble

| Élément | Valeur |
|---------|--------|
| **URL Staging** | `https://workon-staging.up.railway.app` |
| **Swagger UI** | `https://workon-staging.up.railway.app/api/docs` |
| **Health Check** | `https://workon-staging.up.railway.app/healthz` |
| **Readiness Check** | `https://workon-staging.up.railway.app/readyz` |
| **Node.js** | 20.x |
| **Base de données** | PostgreSQL (Railway Postgres) |

---

## 🔧 Variables d'environnement requises

### Variables OBLIGATOIRES (staging)

| Variable | Description | Exemple |
|----------|-------------|---------|
| `DATABASE_URL` | URL PostgreSQL Railway | `postgresql://postgres:xxx@xxx.railway.internal:5432/railway` |
| `NODE_ENV` | Environnement | `staging` |
| `JWT_SECRET` | Secret JWT (min 32 chars) | `staging-jwt-secret-min-32-characters-long` |
| `JWT_REFRESH_SECRET` | Secret refresh token | `staging-refresh-secret-min-32-characters-long` |
| `PORT` | Port (auto Railway) | `8080` (géré par Railway) |

### Variables RECOMMANDÉES (staging)

| Variable | Description | Exemple |
|----------|-------------|---------|
| `CLERK_SECRET_KEY` | Clé Clerk **TEST** | `sk_test_xxxxxx` |
| `STRIPE_SECRET_KEY` | Clé Stripe **TEST** | `sk_test_xxxxxx` |
| `STRIPE_WEBHOOK_SECRET` | Webhook Stripe **TEST** | `whsec_test_xxxxx` |
| `STRIPE_PUBLISHABLE_KEY` | Clé publique Stripe **TEST** | `pk_test_xxxxxx` |
| `SIGNED_URL_SECRET` | Secret pour URLs signées | `staging-signed-url-secret-32-chars` |
| `CORS_ORIGIN` | Origines CORS autorisées | `https://workon-staging-app.vercel.app` |
| `ENABLE_SWAGGER_PROD` | Activer Swagger | `true` |

### Variables OPTIONNELLES

| Variable | Description | Défaut |
|----------|-------------|--------|
| `SENTRY_DSN` | DSN Sentry (monitoring) | _(vide = désactivé)_ |
| `SENTRY_ENVIRONMENT` | Environnement Sentry | `staging` |
| `RATE_LIMIT_ENABLED` | Rate limiting | `1` |
| `RATE_LIMIT_TTL` | Fenêtre rate limit (sec) | `60` |
| `RATE_LIMIT_LIMIT` | Max requêtes/fenêtre | `100` |
| `DEBUG_ENV` | Debug des variables env | `0` |
| `LOG_LEVEL` | Niveau de log | `info` |

---

## ⚠️ INTERDICTIONS STAGING

**NE JAMAIS** utiliser en staging :
- ❌ Clés Stripe PRODUCTION (`sk_live_*`, `pk_live_*`)
- ❌ Clés Clerk PRODUCTION 
- ❌ `DATABASE_URL` de production
- ❌ `NODE_ENV=production` (utiliser `staging`)

---

## 🚀 Déploiement Railway

### Étape 1: Créer le projet Railway

1. Aller sur [railway.app](https://railway.app)
2. Créer un nouveau projet "workon-staging"
3. Connecter au repo GitHub (branche `main` ou `staging`)

### Étape 2: Ajouter PostgreSQL

1. Dans le projet Railway, cliquer "New"
2. Sélectionner "Database" → "PostgreSQL"
3. Copier la variable `DATABASE_URL` générée

### Étape 3: Configurer les variables

Dans Railway → Variables, ajouter :

```bash
# Obligatoires
DATABASE_URL=${{Postgres.DATABASE_URL}}  # Reference auto Railway
NODE_ENV=staging
JWT_SECRET=votre-jwt-secret-staging-32-chars-minimum
JWT_REFRESH_SECRET=votre-refresh-secret-staging-32-chars

# Stripe TEST (obtenir sur https://dashboard.stripe.com/test/apikeys)
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx

# Clerk TEST
CLERK_SECRET_KEY=sk_test_xxxxx

# Sécurité
SIGNED_URL_SECRET=staging-signed-url-secret-32-chars
CORS_ORIGIN=https://votre-frontend-staging.vercel.app

# Features
ENABLE_SWAGGER_PROD=true
```

### Étape 4: Déployer

1. Push sur la branche connectée → déploiement automatique
2. Ou cliquer "Deploy" dans Railway

### Étape 5: Vérifier

```bash
# Health check
curl https://workon-staging.up.railway.app/healthz

# Readiness (vérifie DB)
curl https://workon-staging.up.railway.app/readyz

# Health API complet
curl https://workon-staging.up.railway.app/api/v1/health
```

---

## 🧪 Tests de validation

### Test 1: Health endpoints

```bash
# Liveness probe
curl -s https://workon-staging.up.railway.app/healthz | jq
# Attendu: {"status":"ok","timestamp":"...","uptime":123,"version":"1.0.0"}

# Readiness probe
curl -s https://workon-staging.up.railway.app/readyz | jq
# Attendu: {"status":"ready","checks":{"database":{"status":"ok"}}}
```

### Test 2: Swagger

Ouvrir dans le navigateur :
```
https://workon-staging.up.railway.app/api/docs
```

### Test 3: Auth (si configuré)

```bash
# Login
curl -X POST https://workon-staging.up.railway.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### Test 4: Missions (requiert auth)

```bash
# Avec token JWT obtenu du login
curl https://workon-staging.up.railway.app/api/v1/missions-local \
  -H "Authorization: Bearer <TOKEN>"
```

---

## 📊 Monitoring

### Logs Railway

1. Dashboard Railway → Projet → Service
2. Onglet "Logs" (temps réel)

### Health checks automatiques

Railway vérifie `/healthz` toutes les 30 secondes.
En cas d'échec 3x consécutifs → redémarrage automatique.

### Métriques

```bash
curl https://workon-staging.up.railway.app/metrics
```

---

## 🔄 Rollback

En cas de problème après déploiement :

1. Railway Dashboard → Deployments
2. Cliquer sur le déploiement précédent fonctionnel
3. Cliquer "Rollback"

---

## 🛠️ Troubleshooting

### Erreur: "SIGNED_URL_SECRET is required"

**Solution:** Ajouter `SIGNED_URL_SECRET` dans Railway Variables.
Valeur minimum: 32 caractères.

### Erreur: "Database connection failed"

**Vérifier:**
1. PostgreSQL est démarré dans Railway
2. `DATABASE_URL` pointe vers la bonne instance
3. Pas de firewall bloquant

### Erreur: "JWT_SECRET is required in production"

**Note:** Avec `NODE_ENV=staging`, le code peut traiter comme production.
**Solution:** Ajouter `JWT_SECRET` et `JWT_REFRESH_SECRET`.

### Logs tronqués / crash loop

Activer le debug :
```
DEBUG_ENV=1
```
Cela affichera un diagnostic des variables au démarrage.

---

## 📝 Checklist déploiement

- [ ] PostgreSQL créé et accessible
- [ ] `DATABASE_URL` configuré
- [ ] `NODE_ENV=staging`
- [ ] `JWT_SECRET` (min 32 chars)
- [ ] `JWT_REFRESH_SECRET` (min 32 chars)
- [ ] `SIGNED_URL_SECRET` (min 32 chars)
- [ ] `STRIPE_*` avec clés **TEST**
- [ ] `CORS_ORIGIN` configuré
- [ ] `ENABLE_SWAGGER_PROD=true`
- [ ] Health check `/healthz` retourne 200
- [ ] Readiness `/readyz` retourne 200
- [ ] Swagger accessible `/api/docs`
- [ ] Logs sans erreurs critiques

---

_Dernière mise à jour: 2026-01-19_

