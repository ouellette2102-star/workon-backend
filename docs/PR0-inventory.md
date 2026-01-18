# PR-0: Inventaire Factuel WorkOn Backend

> **Date:** 2026-01-18  
> **Status:** ✅ Corrigé avec Design Decision  
> **Build status:** ✅ `npm run build` OK  
> **Tests status:** ✅ `npm test` OK (147 tests passed)

---

## Table des matières

1. [Design Decision](#1-design-decision)
2. [Modèles Prisma](#2-modèles-prisma)
3. [Endpoints par domaine](#3-endpoints-par-domaine)
4. [Guards & Auth Flow](#4-guards--auth-flow)
5. [Flutter API Mapping](#5-flutter-api-mapping)
6. [Web (Next.js) API Mapping](#6-web-nextjs-api-mapping)
7. [Gap Analysis](#7-gap-analysis)

---

## 1. Design Decision

> **Voir:** `docs/PR0-decisions.md` pour le détail complet.

### Règle d'identité

| Concept | Valeur |
|---------|--------|
| Auth | Clerk UNIQUEMENT |
| Identité unique | `clerkUserId` |
| ID interne | `User.id` (lié via `User.clerkId`) |
| `req.user.sub` | = `User.id` (après sync ClerkAuthService) |

### Pattern de liaison

```
Clerk JWT → ClerkAuthService.verifyAndSyncUser() → User (id + clerkId)
                                                      ↓
                                            FK vers toutes les tables
                                            (Message, Review, Compliance, etc.)
```

### Interdit

- ❌ Créer `LocalMessage`, `LocalReview`, `LocalComplianceDocument`
- ❌ Routing conditionnel `local_*`
- ❌ Auth email/password comme système principal

---

## 2. Modèles Prisma

**Fichier:** `prisma/schema.prisma`

### 2.1 Modèles liés à User (Clerk-based)

| Modèle | FK | Description |
|--------|-----|-------------|
| `User` | `clerkId` unique | Identity sync depuis Clerk |
| `UserProfile` | `userId → User.id` | Profile role/phone/city |
| `WorkerProfile` | `userId → User.id` | Worker details |
| `ComplianceDocument` | `userId → User.id` | Legal consent |
| `Notification` | `userId → User.id` | Push/in-app notifications |
| `Review` | `authorId → User.id`, `targetUserId → User.id` | User reviews |
| `Mission` | `authorClientId → User.id`, `assigneeWorkerId → User.id` | Missions |
| `Offer` | `workerId → WorkerProfile.id` | Offers (indirect User) |
| `Message` | `senderId → User.id` | Chat messages |
| `Contract` | `employerId → User.id`, `workerId → User.id` | Contracts |
| `Payment` | Via `missionId → Mission` | Payments |

### 2.2 Modèles LocalUser (legacy/marketplace)

> **Note:** Ces modèles sont pour un cas d'usage spécifique (marketplace profile).
> Ils ne sont PAS liés à l'auth principale.

| Modèle | FK | Description |
|--------|-----|-------------|
| `LocalUser` | - | Profil marketplace (email unique) |
| `LocalMission` | `→ LocalUser.id` | Missions locales |
| `LocalOffer` | `→ LocalUser.id` | Offres locales |

### 2.3 Modèles Indépendants

| Modèle | Description |
|--------|-------------|
| `Category`, `Skill`, `WorkerSkill` | Catalog |
| `MissionPhoto`, `MissionEvent` | Mission data |
| `Invoice`, `StripeEvent` | Payments |
| `EmailOtp` | Email verification |

---

## 3. Endpoints par domaine

### A) Messages / Chat

**Module:** `src/messages/`  
**Controller:** `src/messages/messages.controller.ts`  
**Service:** `src/messages/messages.service.ts`  
**Guard:** `JwtAuthGuard`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/messages/thread/:missionId` | Get messages for mission |
| `POST` | `/api/v1/messages` | Send message |
| `PATCH` | `/api/v1/messages/read/:missionId` | Mark as read |
| `GET` | `/api/v1/messages/unread-count` | Unread count |

**Analyse:**
- ✅ Module existe et fonctionne
- ✅ FK `senderId → User.id` compatible avec Clerk auth
- ⚠️ Flutter appelle `/conversations/*` (path différent)

**DTOs:** `src/messages/dto/create-message.dto.ts`

---

### B) Reviews / Ratings

**Status:** ❌ AUCUN ENDPOINT

**Model Prisma existe:** `Review` (FK → `User.id`)

**Fichiers ABSENTS:**
- `src/reviews/reviews.controller.ts`
- `src/reviews/reviews.service.ts`
- `src/reviews/reviews.module.ts`

**Flutter attend:**
- `GET /reviews/summary?userId=...`
- `GET /reviews?userId=...`
- `POST /reviews`

**Analyse:**
- Model `Review` prêt à l'emploi
- Manque uniquement controller + service
- Pas besoin de `LocalReview` (FK User.id OK avec Clerk)

---

### C) Compliance

**Module:** `src/compliance/`  
**Controller:** `src/compliance/compliance.controller.ts`  
**Service:** `src/compliance/compliance.service.ts`

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/compliance/accept` | Accept document |
| `GET` | `/api/v1/compliance/status` | Get consent status |
| `GET` | `/api/v1/compliance/versions` | Get active versions (public) |

**Analyse:**
- ✅ Module existe
- ✅ FK `userId → User.id` compatible avec Clerk auth
- ⚠️ **Bypass actif** pour `local_*` IDs (workaround temporaire à supprimer)

**DTOs:** `src/compliance/dto/accept-compliance.dto.ts`

---

### D) Devices / Push Token

**Status:** ❌ AUCUN ENDPOINT, AUCUN MODEL

**Fichiers ABSENTS:**
- `prisma/schema.prisma` → pas de `DeviceToken`
- `src/devices/devices.controller.ts`
- `src/devices/devices.service.ts`
- `src/devices/devices.module.ts`

**Flutter attend:**
- `POST /devices/register`
- `DELETE /devices/unregister`

**Analyse:**
- À créer entièrement
- Model `DeviceToken` avec FK `userId → User.id`

---

### E) Auth

**Module:** `src/auth/`

**Services:**
- `src/auth/clerk-auth.service.ts` ← **SOURCE OF TRUTH**
- `src/auth/local-auth.service.ts` (legacy)

| Method | Path | Description | System |
|--------|------|-------------|--------|
| `POST` | `/api/v1/auth/register` | Register | LocalAuth (legacy) |
| `POST` | `/api/v1/auth/login` | Login | LocalAuth (legacy) |
| `GET` | `/api/v1/auth/me` | Get current user | Both |
| `POST` | `/api/v1/auth/refresh` | Refresh token | LocalAuth (legacy) |
| `DELETE` | `/api/v1/auth/account` | GDPR delete | Both |

**ClerkAuthService (source of truth):**
```typescript
// Retourne User.id (pas clerkId) dans req.user.sub
return {
  sub: user.id,      // User.id interne
  clerkId,           // Pour référence
  email,
  role,
};
```

---

### F) Missions

**Clerk-based:** `src/missions/` → FK `Mission → User.id`
**LocalUser-based:** `src/missions-local/` → FK `LocalMission → LocalUser.id`

| Path prefix | Model | FK |
|-------------|-------|-----|
| `/api/v1/missions/*` | `Mission` | `User.id` |
| `/api/v1/missions-local/*` | `LocalMission` | `LocalUser.id` |

---

### G) Offers

**Module:** `src/offers/`

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/offers` | Create offer |
| `GET` | `/api/v1/offers/mission/:missionId` | Get offers for mission |
| `PATCH` | `/api/v1/offers/:id/accept` | Accept offer |
| `PATCH` | `/api/v1/offers/:id/reject` | Reject offer |
| `GET` | `/api/v1/offers/mine` | Get my offers |
| `GET` | `/api/v1/offers/:id` | Get offer by ID |

**Note:** Service utilise `LocalOffer` (FK → `LocalUser`).

---

### H) Autres Endpoints

| Domain | Endpoints | Status |
|--------|-----------|--------|
| Payments | `/payments/*`, `/payments-local/*` | ✅ |
| Profile | `/profile/me` | ✅ |
| Users | `/users/me`, `/users/:id` | ✅ |
| Notifications | `/notifications/*` | ✅ |
| Contracts | `/contracts/*` | ✅ |
| Health | `/health/*` | ✅ |

---

## 4. Guards & Auth Flow

### JwtAuthGuard

**Fichier:** `src/auth/guards/jwt-auth.guard.ts`

**Flow avec Clerk:**
```
1. Request avec Authorization: Bearer <clerk_jwt>
2. JwtAuthGuard extrait token
3. ClerkAuthService.verifyAndSyncUser(token)
4. Crée/sync User avec clerkId
5. req.user = { sub: User.id, clerkId, role, ... }
```

### Autres Guards

| Guard | Fichier | Description |
|-------|---------|-------------|
| `RolesGuard` | `src/auth/guards/roles.guard.ts` | Role-based access |
| `ConsentGuard` | `src/compliance/guards/consent.guard.ts` | Legal consent check |

---

## 5. Flutter API Mapping

**Source:** `lib/services/` (Flutter Sparkly)

| Flutter Service | Endpoint attendu | Backend existe | Status |
|-----------------|------------------|----------------|--------|
| `messages_api.dart` | `GET /conversations` | ❌ (différent path) | **ADAPT** |
| `messages_api.dart` | `GET /conversations/:id/messages` | ❌ (différent path) | **ADAPT** |
| `messages_api.dart` | `POST /conversations/:id/messages` | ❌ (différent path) | **ADAPT** |
| `ratings_api.dart` | `GET /reviews/summary?userId=` | ❌ | **CREATE** |
| `ratings_api.dart` | `GET /reviews?userId=` | ❌ | **CREATE** |
| `ratings_api.dart` | `POST /reviews` | ❌ | **CREATE** |
| `push_api.dart` | `POST /devices/register` | ❌ | **CREATE** |
| `push_api.dart` | `DELETE /devices/unregister` | ❌ | **CREATE** |
| `consent_api.dart` | `/compliance/*` | ✅ | **KEEP** |
| `missions_api.dart` | `/missions-local/*` | ✅ | **KEEP** |
| `offers_api.dart` | `/offers/*` | ✅ | **KEEP** |
| `payments_api.dart` | `/payments-local/*` | ✅ | **KEEP** |

**Backend existe mais Flutter utilise path différent:**
- Backend: `GET /messages/thread/:missionId`
- Flutter: `GET /conversations/:id/messages`

---

## 6. Web (Next.js) API Mapping

**Source:** `src/lib/` (Next.js)

| Web API | Endpoint | Backend existe |
|---------|----------|----------------|
| `missions-api.ts` | `/missions/*` | ✅ |
| `mission-chat-api.ts` | `/api/missions/:id/messages` (proxy) | ✅ |
| `compliance-api.ts` | `/compliance/*` | ✅ |
| `stripe-api.ts` | `/payments/*` | ✅ |
| `notifications-api.ts` | `/notifications/*` | ✅ |
| `workon-api.ts` | `/profile/me` | ✅ |

---

## 7. Gap Analysis

### Tableau récapitulatif

| Feature | Model existe | Endpoint existe | Flutter appelle | Décision |
|---------|--------------|-----------------|-----------------|----------|
| **Messages** | ✅ `Message` | ✅ `/messages/*` | `/conversations/*` | **ADAPT** (align paths) |
| **Reviews** | ✅ `Review` | ❌ | `/reviews/*` | **CREATE** |
| **Devices** | ❌ | ❌ | `/devices/*` | **CREATE** |
| **Compliance** | ✅ | ✅ | ✅ | **ADAPT** (supprimer bypass) |
| **Missions** | ✅ | ✅ | ✅ | **KEEP** |
| **Offers** | ✅ | ✅ | ✅ | **KEEP** |
| **Payments** | ✅ | ✅ | ✅ | **KEEP** |

### Points d'attention

1. **Messages path mismatch:**
   - Backend: `/messages/thread/:missionId`
   - Flutter: `/conversations/:id/messages`
   - Solution: Adapter Flutter OU ajouter alias backend

2. **Reviews endpoints manquants:**
   - Model `Review` prêt
   - Créer controller + service

3. **Devices non existant:**
   - Créer model + module complet

4. **Compliance bypass:**
   - Supprimer `isLocalUser()` check
   - Fonctionne nativement avec Clerk auth

---

## Commandes de vérification

```bash
cd C:\Users\ouell\workonapp\backend

# Build
npm run build

# Tests
npm test

# Start dev
npm run start:dev
```
