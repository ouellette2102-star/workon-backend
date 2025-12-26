# WorkOn Backend — Audit Store-Ready

**Date:** 2024-12-24  
**Repo:** workon-backend  
**Stack:** Node.js + NestJS + TypeScript + Prisma + PostgreSQL

---

## 📊 RÉSUMÉ EXÉCUTIF

| Catégorie | Statut | Détails |
|-----------|--------|---------|
| **Architecture** | ✅ OK | Modules NestJS bien structurés |
| **Auth** | ✅ OK | JWT + Clerk dual system |
| **Rate Limiting** | ✅ OK | 20 req/min global |
| **Validation** | ✅ OK | class-validator + ValidationPipe |
| **CORS** | ✅ OK | Configurable via env |
| **Logging** | ✅ OK | Winston structuré |
| **Payments** | ⚠️ PARTIAL | Stripe Connect non implémenté |
| **Offers** | ❌ MISSING | Modèle existe, pas de logique |
| **Ratings** | ❌ MISSING | Modèle existe, pas de logique |
| **Disputes** | ❌ MISSING | Modèle existe, pas de logique |
| **Audit Trail** | ❌ MISSING | Modèle existe, jamais utilisé |

---

## 🔐 SÉCURITÉ

### ✅ OK

| Élément | Implémentation |
|---------|----------------|
| Helmet | `main.ts` - Security headers |
| CORS | Configurable, strict en prod |
| Rate Limiting | ThrottlerGuard 20 req/60s |
| Input Validation | ValidationPipe whitelist + forbidNonWhitelisted |
| Password Hashing | bcrypt 12 rounds |
| JWT Auth | JwtAuthGuard sur routes protégées |
| Role-Based Access | RolesGuard + @Roles decorator |

### ⚠️ À SURVEILLER

| Risque | Sévérité | Action |
|--------|----------|--------|
| Pas de rate limit par endpoint | Low | Future PR |
| Dual auth (Clerk + Local) | Low | Simplifier si possible |
| Logs sans correlation ID | Low | Améliorer traçabilité |

---

## 📡 ROUTES REST (56 endpoints)

### Publiques (4)
- `GET /` - Root
- `GET /healthz` - Health check
- `GET /health` - Health détaillé
- `GET /metrics/*` - Métriques

### Authentifiées (52)
- **Auth:** 3 endpoints
- **Users:** 3 endpoints
- **Profile:** 2 endpoints
- **Missions:** 8 endpoints
- **Missions-Local:** 8 endpoints
- **Messages:** 4 endpoints
- **Notifications:** 4 endpoints
- **Contracts:** 4 endpoints
- **Payments:** 2 endpoints + 1 webhook
- **Stripe:** 4 endpoints + 1 webhook
- **Admin:** 1 endpoint
- **Mission-Photos:** 3 endpoints (module désactivé)
- **Mission-Time-Logs:** 3 endpoints (module désactivé)

---

## 📦 MODULES

| Module | Status | Notes |
|--------|--------|-------|
| `auth` | ✅ OK | Dual system Clerk + Local |
| `users` | ✅ OK | CRUD complet |
| `profile` | ✅ OK | Gestion profil/rôle |
| `missions` | ✅ OK | Flux mission complet |
| `missions-local` | ✅ OK | Système parallèle (à fusionner?) |
| `messages` | ✅ OK | Chat mission |
| `notifications` | ✅ OK | In-app only |
| `contracts` | ✅ OK | Workflow contrat |
| `payments` | ⚠️ PARTIAL | Pas de Connect/payout |
| `stripe` | ⚠️ PARTIAL | Onboarding stub |
| `admin` | ⚠️ MINIMAL | Réconciliation only |
| `ratings` | ❌ NONE | Model only |
| `disputes` | ❌ NONE | Model only |
| `offers` | ❌ NONE | Model only |

---

## 🗄️ PRISMA

### Modèles Actifs (20)
User, UserProfile, WorkerProfile, WorkerSkill, Mission, Offer, Payment, Contract, Review, Dispute, Message, Notification, Category, Skill, ClientOrg, ComplianceDocument, Subscription, AuditEvent, LocalUser, LocalMission

### Migrations
1. `20251124193015_init` - Schema initial
2. `20251202201222_add_messages_contracts` - Messages + Contracts

### Tables Orphelines (à supprimer)
- `posts`
- `post_likes`
- `matches`
- `schedule_slots`

---

## 🔧 VARIABLES D'ENVIRONNEMENT

### Requises (tous env)
- `DATABASE_URL` - Connection PostgreSQL
- `NODE_ENV` - development | production | test

### Requises (production)
- `JWT_SECRET` - Secret JWT
- `JWT_REFRESH_SECRET` - Secret refresh token
- `CLERK_SECRET_KEY` - Clerk auth
- `STRIPE_SECRET_KEY` - Payments

### Optionnelles
- `PORT` (default: 8080)
- `CORS_ORIGIN` / `FRONTEND_URL`
- `STRIPE_WEBHOOK_SECRET`
- `SENTRY_DSN`
- `THROTTLE_TTL` / `THROTTLE_LIMIT`
- `LOG_LEVEL` (default: info)
- `API_PREFIX` (default: api/v1)
- `ENABLE_SWAGGER_PROD`

---

## 📄 SWAGGER/OPENAPI

### Documentés
- auth, users, health, messages, contracts, missions-local, metrics, payments-local

### Manquants (@ApiTags)
- profile, missions, payments, stripe, admin, notifications, mission-photos, mission-time-logs

---

## 🚨 RISQUES CRITIQUES

| # | Risque | Sévérité | Fix |
|---|--------|----------|-----|
| 1 | **Stripe Connect non implémenté** - workers sans paiement | 🔴 HIGH | PR-B3 |
| 2 | **Pipeline destructif** - `db push --accept-data-loss` dans nixpacks | 🔴 HIGH | PR2 |
| 3 | **Pas d'escrow** - paiement direct sans hold | 🔴 HIGH | PR-B3 |
| 4 | **Offers non implémenté** - pas de sélection employer | 🟠 MED | PR-B6 |
| 5 | **Ratings non implémenté** | 🟠 MED | PR-B7 |
| 6 | **Disputes non implémenté** | 🟠 MED | PR-B8 |
| 7 | **AuditEvent inutilisé** - pas de trace d'audit | 🟠 MED | PR-B5 |

---

## ✅ CE QUI EST STORE-READY

1. Auth/Login/Register fonctionnel
2. CRUD Missions avec rôles
3. Messages entre parties
4. Contrats avec workflow
5. Notifications in-app
6. Paiement initial (PaymentIntent)
7. Rate limiting
8. Validation inputs
9. Security headers
10. Structured logging

---

## ❌ BLOQUANTS AVANT PRODUCTION

1. **Stripe Connect** - Workers doivent pouvoir être payés
2. **Pipeline sécurisé** - Retirer fallback destructif
3. **Ratings** - Nécessaire pour confiance marketplace

---

*Généré automatiquement - Voir `audit_backend.json` pour détails machine-readable*

