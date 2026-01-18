# PR-0: Gap Analysis → PR Plan (STRICT)

> **Date:** 2026-01-18  
> **Status:** ✅ Corrigé - Design Decision figée  
> **Basé sur:** `docs/PR0-inventory.md`, `docs/PR0-decisions.md`

---

## Design Decision Rappel

| Règle | Valeur |
|-------|--------|
| Auth | Clerk UNIQUEMENT |
| `req.user.sub` | = `User.id` (interne) |
| FK des tables | → `User.id` |
| LocalMessage/LocalReview | **INTERDIT** |

---

## Légende

| Symbol | Signification |
|--------|---------------|
| ✅ KEEP | Existe et fonctionne, aucune action |
| 🔄 ADAPT | Existe mais nécessite modification mineure |
| 🆕 CREATE | N'existe pas, doit être créé |
| ❓ UNKNOWN | Information manquante, demander confirmation |

---

## Mapping Gaps → Décisions

### Messages

| Élément | Backend | Flutter | Décision |
|---------|---------|---------|----------|
| Model | ✅ `Message` (FK `senderId → User.id`) | - | KEEP |
| Endpoints | ✅ `/messages/thread/:missionId`, `POST /messages` | Attend `/conversations/:id/messages` | 🔄 ADAPT |
| Module | ✅ `src/messages/` | `messages_api.dart` | KEEP |

**Preuve backend existe:**
```
src/messages/messages.controller.ts
  - GET /api/v1/messages/thread/:missionId
  - POST /api/v1/messages
  - PATCH /api/v1/messages/read/:missionId
  - GET /api/v1/messages/unread-count
```

**Flutter attend:**
```dart
// messages_api.dart
GET /conversations
GET /conversations/:id/messages
POST /conversations/:id/messages
```

**Décision:** 🔄 ADAPT Flutter  
- Modifier `messages_api.dart` pour appeler `/messages/thread/:missionId`
- **OU** Ajouter alias `/conversations/:missionId/messages` → `/messages/thread/:missionId` (backend)
- **Pas de création de LocalMessage**

---

### Reviews

| Élément | Backend | Flutter | Décision |
|---------|---------|---------|----------|
| Model | ✅ `Review` (FK `authorId, targetUserId → User.id`) | - | KEEP |
| Endpoints | ❌ Aucun | Attend `/reviews/*` | 🆕 CREATE |
| Module | ❌ `src/reviews/` n'existe pas | `ratings_api.dart` | CREATE |

**Preuve model existe (schema.prisma:278-296):**
```prisma
model Review {
  id           String @id
  authorId     String
  targetUserId String
  missionId    String?
  rating       Int
  comment      String?
  author       User   @relation("reviews_authorIdTousers", ...)
  targetUser   User   @relation("reviews_targetUserIdTousers", ...)
  mission      Mission? @relation(...)
}
```

**Flutter attend:**
```dart
// ratings_api.dart
GET /reviews/summary?userId=...
GET /reviews?userId=...
POST /reviews
GET /me/reviews/summary
GET /me/reviews
```

**Décision:** 🆕 CREATE Backend  
- Créer `src/reviews/reviews.module.ts`
- Créer `src/reviews/reviews.controller.ts`
- Créer `src/reviews/reviews.service.ts`
- Utiliser model `Review` existant (FK → User.id)
- **Pas de création de LocalReview**

---

### Compliance

| Élément | Backend | Flutter | Décision |
|---------|---------|---------|----------|
| Model | ✅ `ComplianceDocument` (FK `userId → User.id`) | - | KEEP |
| Endpoints | ✅ `/compliance/accept`, `/compliance/status`, `/compliance/versions` | ✅ Match | KEEP |
| Module | ✅ `src/compliance/` | `consent_api.dart` | 🔄 ADAPT |

**Preuve endpoints existent:**
```
src/compliance/compliance.controller.ts
  - POST /api/v1/compliance/accept
  - GET /api/v1/compliance/status
  - GET /api/v1/compliance/versions
```

**Issue actuelle:**
```typescript
// compliance.service.ts - BYPASS à supprimer
if (this.isLocalUser(userId)) {
  // Skip DB write, return fake success
}
```

**Décision:** 🔄 ADAPT Backend  
- Supprimer le bypass `isLocalUser()`
- Module fonctionne nativement avec Clerk auth (FK → User.id)

---

### Devices / Push

| Élément | Backend | Flutter | Décision |
|---------|---------|---------|----------|
| Model | ❌ Aucun | - | 🆕 CREATE |
| Endpoints | ❌ Aucun | Attend `/devices/register`, `/devices/unregister` | 🆕 CREATE |
| Module | ❌ `src/devices/` n'existe pas | `push_api.dart` | CREATE |

**Flutter attend:**
```dart
// push_api.dart
POST /devices/register   { token, platform }
DELETE /devices/unregister { token }
```

**Décision:** 🆕 CREATE Backend  
- Créer model `DeviceToken` avec FK `userId → User.id`
- Créer `src/devices/devices.module.ts`
- Créer endpoints `/devices/register` et `/devices/unregister`

---

### Autres domaines

| Feature | Status | Décision |
|---------|--------|----------|
| Missions | ✅ Backend + Flutter OK | KEEP |
| Offers | ✅ Backend + Flutter OK | KEEP |
| Payments | ✅ Backend + Flutter OK | KEEP |
| Profile | ✅ Backend + Flutter OK | KEEP |
| Notifications | ✅ Backend OK | KEEP |
| Contracts | ✅ Backend OK | ❓ UNKNOWN (Flutter utilise?) |

---

## PR Plan (STRICT)

### Séquence

```
PR-1 (Backend Reviews) ────┐
                           │
PR-2 (Backend Devices) ────┼──> PR-4 (Flutter wiring)
                           │
PR-3 (Backend Compliance) ─┘
                                    │
                                    v
                           PR-5 (E2E Validation)
```

---

### PR-1: Backend - Créer module Reviews

**Scope:** Nouveau module NestJS  
**Priorité:** P1  
**Risque:** 🟢 Faible (model existe déjà)

**Fichiers à créer:**
- `src/reviews/reviews.module.ts`
- `src/reviews/reviews.controller.ts`
- `src/reviews/reviews.service.ts`
- `src/reviews/dto/create-review.dto.ts`
- `src/reviews/dto/review-response.dto.ts`

**Fichiers à modifier:**
- `src/app.module.ts` → ajouter `ReviewsModule`

**Endpoints à créer:**

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/reviews` | Liste reviews (query: `userId`, `missionId`) |
| `GET` | `/api/v1/reviews/summary` | Summary (query: `userId`) |
| `POST` | `/api/v1/reviews` | Créer review |
| `GET` | `/api/v1/me/reviews` | Mes reviews reçues |
| `GET` | `/api/v1/me/reviews/summary` | Mon summary |

**Pré-requis:** Aucun  
**Migration Prisma:** Non (model existe)

---

### PR-2: Backend - Créer module Devices

**Scope:** Nouveau model + module NestJS  
**Priorité:** P2  
**Risque:** 🟡 Moyen (migration Prisma)

**Fichiers à créer:**
- `src/devices/devices.module.ts`
- `src/devices/devices.controller.ts`
- `src/devices/devices.service.ts`
- `src/devices/dto/register-device.dto.ts`

**Fichiers à modifier:**
- `prisma/schema.prisma` → ajouter model `DeviceToken`
- `src/app.module.ts` → ajouter `DevicesModule`

**Model à créer:**
```prisma
model DeviceToken {
  id        String   @id @default(cuid())
  userId    String
  token     String   @unique
  platform  String   // "ios" | "android" | "web"
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("device_tokens")
}
```

**Endpoints à créer:**

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/devices/register` | Register device token |
| `DELETE` | `/api/v1/devices/unregister` | Unregister device token |

**Pré-requis:** Aucun  
**Migration Prisma:** OUI

---

### PR-3: Backend - Supprimer bypass Compliance

**Scope:** Modification service existant  
**Priorité:** P2  
**Risque:** 🟢 Faible

**Fichiers à modifier:**
- `src/compliance/compliance.service.ts`

**Changements:**
```typescript
// SUPPRIMER ce bloc
private isLocalUser(userId: string): boolean {
  return userId.startsWith('local_');
}

// SUPPRIMER les checks dans acceptDocument() et getConsentStatus()
if (this.isLocalUser(userId)) {
  // ... bypass code ...
}
```

**Pré-requis:** Clerk auth configuré  
**Migration Prisma:** Non

---

### PR-4: Flutter - Aligner API calls

**Scope:** Modification services Flutter  
**Priorité:** P3  
**Risque:** 🟡 Moyen

**Option A (recommandée): Adapter Flutter**

| Fichier | Changement |
|---------|------------|
| `messages_api.dart` | `/conversations/:id/messages` → `/messages/thread/:missionId` |
| - | Adapter structure requête/réponse |

**Option B: Ajouter alias backend**

| Fichier | Changement |
|---------|------------|
| `src/messages/messages.controller.ts` | Ajouter route alias `/conversations/:missionId/messages` |

**Pré-requis:** PR-1, PR-2, PR-3 mergées  
**Migration Prisma:** Non

---

### PR-5: E2E Validation

**Scope:** Test manuel  
**Priorité:** P4  
**Risque:** 🟢 Faible

**Checklist:**
1. ☐ Register via Clerk
2. ☐ Login → JWT valide
3. ☐ Browse missions
4. ☐ Create mission
5. ☐ Apply (create offer)
6. ☐ Accept offer
7. ☐ Chat (messages)
8. ☐ Complete mission
9. ☐ Pay
10. ☐ Leave review

**Pré-requis:** PR-1 à PR-4 mergées

---

## Tableau récapitulatif

| Feature | Backend PR | Flutter PR | Décision |
|---------|------------|------------|----------|
| Reviews | PR-1 | PR-4 | 🆕 CREATE backend |
| Devices | PR-2 | PR-4 | 🆕 CREATE backend |
| Compliance | PR-3 | - | 🔄 ADAPT (supprimer bypass) |
| Messages | - | PR-4 | 🔄 ADAPT Flutter (ou alias backend) |

---

## UNKNOWN (à confirmer)

| Item | Question | Impact |
|------|----------|--------|
| Contracts Flutter | Flutter utilise-t-il `/contracts/*`? | Si oui, vérifier compat |
| Messages alias | Préférence: adapter Flutter ou ajouter alias backend? | PR-4 scope |

---

## Validation Build/Tests

```bash
# Après chaque PR
cd C:\Users\ouell\workonapp\backend
npm run build
npm test
```

**Status actuel:**
- ✅ Build OK
- ✅ Tests OK (147 passed)
