# PR#11 — Release Audit Checklist (Backend)

> **Date**: 2025-12-28  
> **Scope**: Backend WorkOn (NestJS + Prisma + Postgres + Railway)  
> **Objectif**: Valider que le backend est prêt pour production (release-ready)

---

## 1. Checklist CI / Local

### Commandes de validation

```bash
# Nettoyer et installer
npm ci

# Générer Prisma client (requis si schema modifié)
npx prisma generate

# Build TypeScript
npm run build

# Tests unitaires
npm test

# Lint (si configuré)
npm run lint
```

### Critères de succès

- [ ] `npm ci` : aucune erreur
- [ ] `npx prisma generate` : client généré
- [ ] `npm run build` : 0 erreur TypeScript
- [ ] `npm test` : tous les tests passent
- [ ] `npm run lint` : 0 erreur bloquante

---

## 2. Checklist Swagger

### URLs

| Environnement | URL Swagger |
|---------------|-------------|
| Local (dev)   | http://localhost:8080/api/docs |
| Production    | https://{RAILWAY_DOMAIN}/api/docs |

### Points à vérifier

- [ ] Swagger se charge sans erreur
- [ ] Tags cohérents (Health, Auth, Users, Missions, Payments, Webhooks, etc.)
- [ ] Endpoints visibles et groupés logiquement
- [ ] Pas de route dupliquée ou en conflit

---

## 3. Checklist Variables Railway (env vars requises)

### Variables CRITIQUES (bloquantes au démarrage si manquantes en prod)

| Variable | Description | Exemple |
|----------|-------------|---------|
| `DATABASE_URL` | URL de connexion Postgres Railway | `postgresql://...` |
| `NODE_ENV` | Environnement (`production`) | `production` |
| `JWT_SECRET` | Secret pour signer les JWT | (secret 32+ chars) |
| `JWT_REFRESH_SECRET` | Secret pour refresh tokens | (secret 32+ chars) |
| `CLERK_SECRET_KEY` | Clé secrète Clerk | `sk_live_...` |
| `STRIPE_SECRET_KEY` | Clé secrète Stripe | `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | Secret pour vérifier signatures webhook | `whsec_...` |

### Variables OPTIONNELLES (recommandées)

| Variable | Description | Défaut |
|----------|-------------|--------|
| `PORT` | Port d'écoute | `8080` |
| `CORS_ORIGIN` | Origines autorisées | `*` (à sécuriser) |
| `FRONTEND_URL` | URL du frontend | - |
| `SENTRY_DSN` | DSN Sentry pour monitoring | - |
| `ENABLE_SWAGGER_PROD` | Activer Swagger en prod | `false` |

---

## 4. Checklist Stripe Dashboard

### Configuration Webhook Stripe

1. **Aller dans** : Stripe Dashboard → Developers → Webhooks
2. **Ajouter endpoint** :
   - URL: `https://{RAILWAY_DOMAIN}/api/v1/webhooks/stripe`
   - Mode: `Live` (production) ou `Test` (staging)
3. **Events à activer** :
   - `payment_intent.amount_capturable_updated`
   - `payment_intent.succeeded`
   - `payment_intent.canceled`
   - `payment_intent.payment_failed`
4. **Copier** le `Webhook Signing Secret` → Variable `STRIPE_WEBHOOK_SECRET`

### Points à vérifier

- [ ] Endpoint webhook configuré avec URL Railway
- [ ] Events escrow activés (4 events minimum)
- [ ] `STRIPE_WEBHOOK_SECRET` copié dans Railway env
- [ ] Mode correct (Live vs Test)

---

## 5. Validation Post-Deploy

### Endpoints de santé

```bash
# Liveness probe (le container est up)
curl https://{RAILWAY_DOMAIN}/healthz
# Attendu: {"status":"ok","timestamp":"..."}

# Readiness probe (DB accessible)
curl https://{RAILWAY_DOMAIN}/readyz
# Attendu: {"status":"ready","timestamp":"...","checks":{"database":"ok"}}

# Swagger (si activé)
curl -I https://{RAILWAY_DOMAIN}/api/docs
# Attendu: HTTP 200
```

### Checklist post-deploy

- [ ] `/healthz` retourne `{"status":"ok"}`
- [ ] `/readyz` retourne `{"status":"ready"}` avec database OK
- [ ] `/api/docs` accessible (si `ENABLE_SWAGGER_PROD=true`)
- [ ] Logs Railway sans erreur de démarrage
- [ ] Aucun crash loop

---

## 6. Rollback

### Si problème après merge

```bash
# Identifier le commit PR#11
git log --oneline -5

# Revert le commit
git revert <SHA_COMMIT_PR11>

# Pusher sur main
git push origin main

# Railway redeploy automatiquement
```

### Alternative: rollback via Railway

1. Railway Dashboard → Deployments
2. Cliquer sur le deploy précédent stable
3. "Rollback to this deploy"

---

## 7. Notes Frontend (Sparkly)

### API Prefixes

Tous les endpoints sont sous `/api/v1/*`.

### Routes Payments

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/v1/payments/mission/:missionId/intent` | POST | Créer PaymentIntent (escrow) |
| `/api/v1/payments/mission/:missionId/capture` | POST | Capturer les fonds |
| `/api/v1/payments/mission/:missionId/cancel` | POST | Annuler le PaymentIntent |
| `/api/v1/payments/mission/:missionId/status` | GET | Statut du paiement |

### Routes Missions

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/v1/missions` | GET | Liste des missions |
| `/api/v1/missions/:id` | GET | Détail d'une mission |
| `/api/v1/missions-map` | GET | Missions pour carte (pins) |

---

## 8. Historique des changements PR#11

| Fichier | Changement |
|---------|------------|
| `src/config/env.validation.ts` | Durcissement: STRIPE_SECRET_KEY et STRIPE_WEBHOOK_SECRET bloquants en production |
| `docs/release/PR11-release-audit.md` | Ce fichier (checklist release) |
| `docs/integration/frontend-api-map.md` | Mapping API pour frontend |

---

## 9. Contacts / Escalation

- **Backend Lead**: @CTO
- **DevOps/Railway**: @CTO
- **Stripe Support**: [dashboard.stripe.com/support](https://dashboard.stripe.com/support)

---

*Généré automatiquement — PR#11 Release Audit*

