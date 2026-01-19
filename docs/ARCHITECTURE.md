# WorkOn Backend - Architecture Technique

Ce document décrit l'architecture technique du backend WorkOn.

---

## 📊 Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              WORKON BACKEND                                 │
│                           (NestJS + Prisma + PostgreSQL)                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐     │
│  │    Auth     │   │   Missions  │   │  Payments   │   │  Messages   │     │
│  │  (JWT/Local)│   │   (Local)   │   │  (Stripe)   │   │   (Chat)    │     │
│  └──────┬──────┘   └──────┬──────┘   └──────┬──────┘   └──────┬──────┘     │
│         │                 │                 │                 │             │
│  ┌──────┴─────────────────┴─────────────────┴─────────────────┴──────┐     │
│  │                         PRISMA ORM                                 │     │
│  └────────────────────────────────┬──────────────────────────────────┘     │
│                                   │                                         │
│  ┌────────────────────────────────┴──────────────────────────────────┐     │
│  │                        PostgreSQL Database                         │     │
│  └────────────────────────────────────────────────────────────────────┘     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🗂️ Structure des modules

```
src/
├── app.module.ts          # Module racine - importe tous les modules
│
├── auth/                  # 🔐 Authentification
│   ├── auth.module.ts
│   ├── auth.controller.ts    # /api/v1/auth/*
│   ├── local-auth.service.ts # JWT local (signup, login, refresh)
│   ├── guards/
│   │   ├── jwt-auth.guard.ts    # Guard principal (protège les routes)
│   │   └── consent.guard.ts     # Vérifie consentement légal
│   └── strategies/
│       └── jwt.strategy.ts      # Validation JWT
│
├── users/                 # 👤 Utilisateurs
│   ├── users.service.ts      # CRUD utilisateurs
│   ├── users.repository.ts   # Accès DB
│   └── dto/                  # DTOs validation
│
├── missions-local/        # 📋 Missions (module principal)
│   ├── missions-local.controller.ts  # /api/v1/missions-local/*
│   ├── missions-local.service.ts     # Logique métier
│   ├── missions-local.repository.ts  # Accès DB
│   └── dto/
│       ├── create-mission.dto.ts
│       ├── nearby-missions-query.dto.ts
│       └── mission-response.dto.ts
│
├── offers/                # 🤝 Offres/Candidatures
│   ├── offers.controller.ts      # /api/v1/offers/*
│   └── offers.service.ts
│
├── messages/              # 💬 Messagerie
│   ├── messages.controller.ts    # /api/v1/messages/*
│   └── messages.service.ts
│
├── earnings/              # 💰 Revenus workers
│   ├── earnings.controller.ts    # /api/v1/earnings/*
│   └── earnings.service.ts
│
├── payments/              # 💳 Paiements Stripe
│   ├── payments.controller.ts
│   ├── payments.service.ts
│   ├── webhooks.controller.ts    # /api/v1/webhooks/stripe
│   └── checkout.controller.ts
│
├── devices/               # 📱 Tokens push
│   ├── devices.controller.ts     # /api/v1/devices/*
│   └── devices.service.ts
│
├── notifications/         # 🔔 Notifications push
│   └── notifications.service.ts
│
├── reviews/               # ⭐ Avis
│   ├── reviews.controller.ts     # /api/v1/reviews/*
│   └── reviews.service.ts
│
├── compliance/            # 📜 Consentement légal
│   ├── compliance.controller.ts  # /api/v1/compliance/*
│   └── compliance.service.ts
│
├── contracts/             # 📝 Contrats de mission
│   ├── contracts.controller.ts   # /api/v1/contracts/*
│   └── contracts.service.ts
│
├── health/                # ❤️ Health checks
│   └── health.controller.ts      # /api/v1/health, /healthz, /readyz
│
├── stripe/                # Stripe SDK wrapper
│   └── stripe.service.ts
│
├── prisma/                # Prisma service
│   └── prisma.service.ts
│
└── common/                # Partagé
    ├── guards/               # Guards réutilisables
    ├── filters/              # Exception filters
    ├── dto/                  # DTOs communs
    └── middleware/           # Middlewares
```

---

## 🔄 Flow Request → Response

```
                                    REQUEST
                                       │
                                       ▼
┌──────────────────────────────────────────────────────────────────────┐
│                           MIDDLEWARE                                  │
│  • Helmet (security headers)                                         │
│  • CORS (origin validation)                                          │
│  • Request ID (correlation)                                          │
│  • Rate Limiting (throttle)                                          │
└──────────────────────────────────┬───────────────────────────────────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────────────┐
│                            GUARDS                                     │
│  • JwtAuthGuard → Vérifie le token Bearer                           │
│  • ConsentGuard → Vérifie acceptation TERMS/PRIVACY                 │
│  • RolesGuard → Vérifie le rôle (worker/employer/admin)             │
└──────────────────────────────────┬───────────────────────────────────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────────────┐
│                          CONTROLLER                                   │
│  • Reçoit la requête                                                 │
│  • Valide les DTOs (class-validator)                                 │
│  • Appelle le Service                                                │
│  • Retourne la Response                                              │
└──────────────────────────────────┬───────────────────────────────────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────────────┐
│                           SERVICE                                     │
│  • Logique métier                                                    │
│  • Validation business                                               │
│  • Appelle Repository/Prisma                                         │
│  • Peut appeler d'autres services                                    │
└──────────────────────────────────┬───────────────────────────────────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      PRISMA SERVICE                                   │
│  • Requêtes DB typées                                                │
│  • Transactions                                                      │
│  • Relations automatiques                                            │
└──────────────────────────────────┬───────────────────────────────────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────────────┐
│                        PostgreSQL                                     │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 🔐 Authentification & Autorisation

### Stratégie JWT Local

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           AUTH FLOW                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  SIGNUP                           LOGIN                                     │
│  ──────                           ─────                                     │
│  POST /auth/signup                POST /auth/login                          │
│       │                                │                                    │
│       ▼                                ▼                                    │
│  ┌─────────────┐                  ┌─────────────┐                          │
│  │  Validate   │                  │  Validate   │                          │
│  │   Email     │                  │ Credentials │                          │
│  └──────┬──────┘                  └──────┬──────┘                          │
│         │                                │                                  │
│         ▼                                ▼                                  │
│  ┌─────────────┐                  ┌─────────────┐                          │
│  │   Create    │                  │   Verify    │                          │
│  │   User      │                  │  Password   │                          │
│  └──────┬──────┘                  └──────┬──────┘                          │
│         │                                │                                  │
│         └────────────┬───────────────────┘                                  │
│                      ▼                                                      │
│               ┌─────────────┐                                               │
│               │  Generate   │                                               │
│               │    JWT      │                                               │
│               └──────┬──────┘                                               │
│                      │                                                      │
│                      ▼                                                      │
│               { accessToken, refreshToken, user }                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Guards utilisés

| Guard | Décorateur | Description |
|-------|------------|-------------|
| `JwtAuthGuard` | `@UseGuards(JwtAuthGuard)` | Vérifie token JWT valide |
| `ConsentGuard` | Automatique après JWT | Vérifie TERMS + PRIVACY acceptés |
| `RolesGuard` | `@Roles('worker')` | Vérifie le rôle utilisateur |
| `ThrottlerGuard` | Global | Rate limiting par IP |

### Payload JWT

```typescript
{
  sub: string;      // User ID
  email: string;    // Email
  role: string;     // 'worker' | 'employer' | 'admin'
  iat: number;      // Issued at
  exp: number;      // Expiration
}
```

---

## 📋 Concepts métier clés

### 1. Missions (missions-local)

**Lifecycle d'une mission:**

```
    open ────► assigned ────► in_progress ────► completed
      │                                              │
      │                                              ▼
      └─────────► cancelled                        paid
```

| Status | Description |
|--------|-------------|
| `open` | Mission créée, en attente d'un worker |
| `assigned` | Worker assigné, pas encore commencée |
| `in_progress` | Travail en cours |
| `completed` | Travail terminé |
| `cancelled` | Annulée par employer/admin |
| `paid` | Paiement worker effectué |

### 2. Offers (offres/candidatures)

Un worker peut postuler à une mission "open" via une offre.

```
Mission (open) ◄──── Offer ───► Worker
                       │
                       ▼
              [PENDING | ACCEPTED | REJECTED]
```

### 3. Messages (chat)

Chat lié à une mission entre employer et worker assigné.

```
Mission ◄──── Message ───► User (sender)
   │
   └── Seuls employer + worker assigné peuvent échanger
```

### 4. Earnings (revenus)

Calculés automatiquement après mission "completed".

```
grossAmount = mission.price
commissionAmount = grossAmount × 0.15 (15%)
netAmount = grossAmount - commissionAmount
```

### 5. Devices (push tokens)

Tokens FCM pour notifications push.

```
User ◄──── Device ───► pushToken (FCM)
             │
             └── Platform: ios | android | web
```

### 6. Reviews (avis)

Avis bidirectionnels après mission completed.

```
Mission ◄──── Review ───► Author (reviewer)
                │
                └── Rating (1-5), Comment
```

---

## 🔌 Intégrations externes

### Stripe (Paiements)

| Variable | Usage |
|----------|-------|
| `STRIPE_SECRET_KEY` | API calls |
| `STRIPE_WEBHOOK_SECRET` | Signature webhooks |
| `STRIPE_PUBLISHABLE_KEY` | Frontend |

**Endpoints:**
- `POST /api/v1/payments/checkout` → Crée une session Stripe
- `POST /api/v1/webhooks/stripe` → Reçoit events Stripe

**Flow paiement:**
```
1. Employer clique "Payer"
2. Backend crée Stripe Checkout Session
3. Redirect vers Stripe
4. Paiement validé → Webhook reçu
5. Backend met à jour mission status
```

### Firebase (Push Notifications)

| Fichier | Usage |
|---------|-------|
| `firebase-admin-key.json` | Service account (NE PAS COMMITTER) |

**Flow:**
```
1. App mobile enregistre device token via /api/v1/devices
2. Event (nouveau message, mission accepted, etc.)
3. NotificationsService envoie via Firebase Admin SDK
```

### Maps (Google Maps)

Utilisé côté frontend uniquement. Le backend stocke:
- `latitude`, `longitude` sur les missions
- Endpoint `/missions-local/nearby` pour recherche par rayon
- Endpoint `/missions-local/map` pour bounding box

---

## 🗄️ Modèle de données (Prisma)

### Entités principales

```
┌─────────────────┐       ┌─────────────────┐
│   LocalUser     │       │   LocalMission  │
├─────────────────┤       ├─────────────────┤
│ id              │──┐    │ id              │
│ email           │  │    │ title           │
│ hashedPassword  │  │    │ description     │
│ firstName       │  │    │ category        │
│ lastName        │  │    │ price           │
│ role            │  │    │ status          │
│ city            │  ├───►│ createdByUserId │
│ active          │  │    │ assignedToUserId│◄──┐
└─────────────────┘  │    │ latitude        │   │
                     │    │ longitude       │   │
                     │    │ city            │   │
                     │    └─────────────────┘   │
                     │                          │
                     └──────────────────────────┘
```

### Relations clés

```
LocalUser (1) ────► (N) LocalMission (créateur)
LocalUser (1) ────► (N) LocalMission (worker assigné)
LocalUser (1) ────► (N) Device
LocalMission (1) ────► (N) Message
LocalMission (1) ────► (N) Review
```

---

## 🔒 Sécurité

### Headers (Helmet)

- `X-Powered-By`: Masqué
- `X-Content-Type-Options`: nosniff
- `X-Frame-Options`: DENY
- `X-XSS-Protection`: Activé

### Rate Limiting

| Config | Défaut |
|--------|--------|
| `THROTTLE_TTL` | 60 secondes |
| `THROTTLE_LIMIT` | 100 requêtes |

Exception: `/healthz`, `/readyz` (non limités).

### CORS

- Dev: `localhost:3000`, `localhost:3001`, `localhost:8080`
- Prod: Configurer `CORS_ORIGIN` ou `FRONTEND_URL`

### Validation

- DTOs avec `class-validator`
- Pipes globaux avec `ValidationPipe`
- `whitelist: true` (rejette propriétés inconnues)

---

## 📊 Observabilité

### Health Endpoints

| Endpoint | Type | Description |
|----------|------|-------------|
| `/healthz` | Liveness | Process alive (toujours 200) |
| `/readyz` | Readiness | DB check (200 si prêt, 503 sinon) |
| `/api/v1/health` | Full | DB + Stripe + Storage + SignedUrls |

### Logging

- Winston logger avec niveaux configurables
- Request ID correlation
- Structured JSON en production

### Sentry (optionnel)

Configurer `SENTRY_DSN` pour error tracking en production.

---

## 📁 Fichiers de configuration

| Fichier | Description |
|---------|-------------|
| `nest-cli.json` | Config NestJS CLI |
| `tsconfig.json` | Config TypeScript |
| `.eslintrc.js` | Config ESLint |
| `prisma/schema.prisma` | Schéma base de données |
| `playwright.config.ts` | Config tests E2E |
| `nixpacks.toml` | Config build Railway |
| `railway.json` | Config deploy Railway |

---

_Dernière mise à jour: 2026-01-19_

