# Notifications & Messages System - Setup Guide

## ✅ Status: MINIMAL MVP RE-ENABLED

Les modules **NotificationsModule** et **MessagesModule** ont été réactivés avec une implémentation minimale fonctionnelle.

---

## 📋 Modèles Prisma

### Notification
```prisma
model Notification {
  id          String    @id
  userId      String
  type        String
  payloadJSON Json      // Stocke missionId, messageId, statusBefore, statusAfter
  readAt      DateTime?
  createdAt   DateTime  @default(now())
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([readAt])
  @@index([userId])
  @@map("notifications")
}
```

### Message
```prisma
model Message {
  id         String            @id
  missionId  String
  senderId   String            // clerkId de l'utilisateur
  senderRole MessageSenderRole // WORKER ou EMPLOYER
  content    String
  createdAt  DateTime          @default(now())
  mission    Mission           @relation(fields: [missionId], references: [id], onDelete: Cascade)

  @@index([missionId])
  @@map("messages")
}

enum MessageSenderRole {
  WORKER
  EMPLOYER
}
```

---

## 🔔 Endpoints Notifications (`/api/v1/notifications`)

### 1. GET `/api/v1/notifications`
Récupérer les notifications de l'utilisateur connecté.

**Auth requise:** Oui (JWT)

**Query params:**
- `unreadOnly` (optional): `"true"` pour ne récupérer que les non lues

**Réponse:**
```json
[
  {
    "id": "notif_1234567890_abc123",
    "userId": "user_xxx",
    "type": "MISSION_STATUS_CHANGED",
    "payload": {
      "missionId": "mission_xxx",
      "statusBefore": "OPEN",
      "statusAfter": "MATCHED"
    },
    "isRead": false,
    "createdAt": "2025-11-19T04:00:00.000Z",
    "readAt": null
  }
]
```

**Test:**
```bash
curl http://localhost:3001/api/v1/notifications \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### 2. GET `/api/v1/notifications/unread-count`
Compter les notifications non lues.

**Auth requise:** Oui (JWT)

**Réponse:**
```json
{
  "count": 3
}
```

**Test:**
```bash
curl http://localhost:3001/api/v1/notifications/unread-count \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### 3. PATCH `/api/v1/notifications/:id/read`
Marquer une notification comme lue.

**Auth requise:** Oui (JWT)

**Réponse:**
```json
{
  "success": true
}
```

**Test:**
```bash
curl -X PATCH http://localhost:3001/api/v1/notifications/notif_123/read \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### 4. PATCH `/api/v1/notifications/read-all`
Marquer toutes les notifications comme lues.

**Auth requise:** Oui (JWT)

**Réponse:**
```json
{
  "success": true
}
```

**Test:**
```bash
curl -X PATCH http://localhost:3001/api/v1/notifications/read-all \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 💬 Endpoints Messages (`/api/v1/messages`)

### 1. GET `/api/v1/messages/mission/:missionId`
Récupérer tous les messages d'une mission.

**Auth requise:** Oui (JWT)

**Accès:** Seulement l'employeur (authorClient) ou le worker assigné (assigneeWorker)

**Réponse:**
```json
[
  {
    "id": "msg_1234567890_abc123",
    "missionId": "mission_xxx",
    "senderId": "clerk_user_xxx",
    "senderRole": "EMPLOYER",
    "content": "Bonjour, pouvez-vous commencer demain?",
    "createdAt": "2025-11-19T04:00:00.000Z"
  },
  {
    "id": "msg_1234567891_def456",
    "missionId": "mission_xxx",
    "senderId": "clerk_worker_yyy",
    "senderRole": "WORKER",
    "content": "Oui, pas de problème!",
    "createdAt": "2025-11-19T04:01:00.000Z"
  }
]
```

**Test:**
```bash
curl http://localhost:3001/api/v1/messages/mission/mission_test_123 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Erreurs possibles:**
- `403 Forbidden`: Vous n'avez pas accès à cette mission
- `404 Not Found`: Mission introuvable

---

### 2. POST `/api/v1/messages/mission/:missionId`
Envoyer un message dans une mission.

**Auth requise:** Oui (JWT)

**Accès:** Seulement l'employeur (authorClient) ou le worker assigné (assigneeWorker)

**Body:**
```json
{
  "content": "Votre message ici"
}
```

**Réponse:**
```json
{
  "id": "msg_1234567892_ghi789",
  "missionId": "mission_xxx",
  "senderId": "clerk_user_xxx",
  "senderRole": "EMPLOYER",
  "content": "Votre message ici",
  "createdAt": "2025-11-19T04:02:00.000Z"
}
```

**Notifications automatiques:**
- Une notification `NEW_MESSAGE` est créée pour le destinataire (l'autre partie de la conversation)

**Test:**
```bash
curl -X POST http://localhost:3001/api/v1/messages/mission/mission_test_123 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content":"Bonjour, message de test"}'
```

**Erreurs possibles:**
- `400 Bad Request`: Message vide ou mission sans worker assigné
- `403 Forbidden`: Vous n'avez pas le droit d'envoyer des messages pour cette mission
- `404 Not Found`: Mission introuvable

---

## 🔗 Intégration avec Missions

Les notifications sont **automatiquement créées** par `MissionsService` lors de:

### 1. Réservation d'une mission (`POST /api/v1/missions/:id/reserve`)
- **Notification créée pour:** L'employeur (authorClient)
- **Type:** `MISSION_STATUS_CHANGED`
- **Payload:**
  ```json
  {
    "missionId": "mission_xxx",
    "statusBefore": "OPEN",
    "statusAfter": "MATCHED"
  }
  ```

### 2. Changement de statut de mission (`PATCH /api/v1/missions/:id/status`)
- **Notification créée pour:** Le worker assigné (si présent)
- **Type:** `MISSION_STATUS_CHANGED`
- **Payload:**
  ```json
  {
    "missionId": "mission_xxx",
    "statusBefore": "MATCHED",
    "statusAfter": "IN_PROGRESS"
  }
  ```

### 3. Envoi d'un message (`POST /api/v1/messages/mission/:missionId`)
- **Notification créée pour:** L'autre partie de la conversation
- **Type:** `NEW_MESSAGE`
- **Payload:**
  ```json
  {
    "missionId": "mission_xxx",
    "messageId": "msg_xxx"
  }
  ```

---

## 🧪 Tests Manuels

### 1. Healthcheck (sans auth)
```bash
curl http://localhost:3001/api/v1/health
```
✅ **Expected:** HTTP 200 OK

---

### 2. Notifications sans auth
```bash
curl http://localhost:3001/api/v1/notifications
```
❌ **Expected:** HTTP 401 Unauthorized (auth requise)

---

### 3. Messages sans auth
```bash
curl http://localhost:3001/api/v1/messages/mission/test
```
❌ **Expected:** HTTP 401 Unauthorized (auth requise)

---

### 4. Scénario complet (avec JWT valides)

**Étape 1: Créer une mission (Employer)**
```bash
curl -X POST http://localhost:3001/api/v1/missions \
  -H "Authorization: Bearer EMPLOYER_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Mission",
    "description": "Description test",
    "category": "menage",
    "city": "Montreal",
    "hourlyRate": 25
  }'
# Retourne: { id: "mission_xxx", ... }
```

**Étape 2: Réserver la mission (Worker)**
```bash
curl -X POST http://localhost:3001/api/v1/missions/mission_xxx/reserve \
  -H "Authorization: Bearer WORKER_JWT"
# Crée une notification pour l'employer
```

**Étape 3: Vérifier les notifications (Employer)**
```bash
curl http://localhost:3001/api/v1/notifications \
  -H "Authorization: Bearer EMPLOYER_JWT"
# Retourne: [{ type: "MISSION_STATUS_CHANGED", ... }]
```

**Étape 4: Envoyer un message (Employer)**
```bash
curl -X POST http://localhost:3001/api/v1/messages/mission/mission_xxx \
  -H "Authorization: Bearer EMPLOYER_JWT" \
  -H "Content-Type: application/json" \
  -d '{"content":"Bonjour, confirmons les détails"}'
# Crée une notification pour le worker
```

**Étape 5: Lire les messages (Worker)**
```bash
curl http://localhost:3001/api/v1/messages/mission/mission_xxx \
  -H "Authorization: Bearer WORKER_JWT"
# Retourne: [{ senderRole: "EMPLOYER", content: "Bonjour...", ... }]
```

**Étape 6: Répondre (Worker)**
```bash
curl -X POST http://localhost:3001/api/v1/messages/mission/mission_xxx \
  -H "Authorization: Bearer WORKER_JWT" \
  -H "Content-Type: application/json" \
  -d '{"content":"Oui, pas de problème!"}'
# Crée une notification pour l'employer
```

---

## ✅ Confirmation Finale

### Compilation
```bash
cd backend
npm run build
```
✅ **0 erreurs TypeScript**

### Démarrage
```bash
npm run start:dev
```
✅ **Backend démarre sur http://localhost:3001**

### Health Check
```bash
curl http://localhost:3001/api/v1/health
```
✅ **HTTP 200 OK**

### Endpoints Confirmés
- ✅ `GET /api/v1/notifications` → 401 Unauthorized (auth requise ✓)
- ✅ `GET /api/v1/notifications/unread-count` → 401 Unauthorized (auth requise ✓)
- ✅ `PATCH /api/v1/notifications/:id/read` → 401 Unauthorized (auth requise ✓)
- ✅ `PATCH /api/v1/notifications/read-all` → 401 Unauthorized (auth requise ✓)
- ✅ `GET /api/v1/messages/mission/:missionId` → 401 Unauthorized (auth requise ✓)
- ✅ `POST /api/v1/messages/mission/:missionId` → 401 Unauthorized (auth requise ✓)

---

## 🚧 Limitations Actuelles (MVP)

### ✅ Implémenté
- Création/lecture de notifications
- Comptage notifications non lues
- Marquage notifications comme lues
- Envoi/lecture de messages par mission
- Notifications automatiques (réservation mission, changement statut, nouveau message)
- Protection auth sur tous les endpoints
- Vérification accès (seulement les parties de la mission peuvent voir/envoyer messages)

### ⚠️ TODO Futur
- **Notification création mission**: Actuellement pas de notification créée à la création d'une mission
  - TODO: Notifier les workers matchants dans la zone géographique
- **WebSockets / Real-time**: Messages sont poll-based (GET), pas de push temps réel
  - TODO: Implémenter Socket.IO ou Server-Sent Events
- **Pagination**: Les listes de notifications et messages retournent tout
  - TODO: Ajouter `limit`, `offset`, `cursor` pagination
- **Filtres avancés**: Pas de filtre par type de notification ou période
  - TODO: Query params `type`, `since`, `until`
- **Attachments**: Messages texte uniquement
  - TODO: Support images/fichiers via upload service
- **Read receipts**: Pas de "vu à" pour les messages
  - TODO: Ajouter `readAt` sur Message ou table séparée
- **Typing indicators**: Pas d'indicateur "en train d'écrire"
- **Message editing/deletion**: Messages immutables
  - TODO: Soft delete avec `deletedAt`, édition avec historique

---

## 📚 Structure du Code

```
backend/src/
├── notifications/
│   ├── notifications.module.ts        ✅ Réactivé
│   ├── notifications.service.ts       ✅ Utilise Notification model
│   └── notifications.controller.ts    ✅ Endpoints /api/v1/notifications
├── messages/
│   ├── messages.module.ts             ✅ Réactivé
│   ├── messages.service.ts            ✅ Utilise Message model
│   ├── messages.controller.ts         ✅ Endpoints /api/v1/messages
│   └── dto/
│       └── create-message.dto.ts
├── missions/
│   └── missions.service.ts            ✅ Crée notifications automatiquement
└── app.module.ts                      ✅ Import NotificationsModule + MessagesModule
```

---

## 🔑 Types de Notifications

| Type | Créé Par | Payload | Destinataire |
|------|----------|---------|--------------|
| `MISSION_STATUS_CHANGED` | `MissionsService.updateMissionStatus()` | `{ missionId, statusBefore, statusAfter }` | Worker assigné |
| `MISSION_STATUS_CHANGED` | `MissionsService.reserveMission()` | `{ missionId, statusBefore: "OPEN", statusAfter: "MATCHED" }` | Employer (authorClient) |
| `NEW_MESSAGE` | `MessagesService.createMessage()` | `{ missionId, messageId }` | Autre partie (employer ↔ worker) |
| `MISSION_TIME_EVENT` | *(stub)* | `{ missionId, eventType: "CHECK_IN" | "CHECK_OUT" }` | Employer ou Worker |

---

## 📞 Support

Pour toute question:
- Voir le code source pour détails d'implémentation
- Prisma Docs: https://www.prisma.io/docs
- NestJS Docs: https://docs.nestjs.com

