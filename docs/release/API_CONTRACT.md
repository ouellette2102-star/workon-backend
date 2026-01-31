# API CONTRACT — WorkOn v1.0

> **Date**: 2026-01-31  
> **Backend**: NestJS + Prisma  
> **Frontend**: Flutter  
> **Base URL**: `https://workon-backend-production-8908.up.railway.app`

---

## 📋 CONTRACT RULES

### Request Format
- **Content-Type**: `application/json`
- **Authorization**: `Bearer <JWT_TOKEN>` (for protected endpoints)
- **Accept**: `application/json`

### Response Format
```json
{
  "data": { ... },        // Success payload
  "error": {              // Error payload (if applicable)
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "status": 400,
    "requestId": "uuid"
  }
}
```

### HTTP Status Codes
| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | Successful GET, PATCH |
| 201 | Created | Successful POST |
| 400 | Bad Request | Validation error |
| 401 | Unauthorized | Missing/invalid token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 500 | Internal Server Error | Server error |

---

## 🔐 AUTHENTICATION

### Register
```
POST /api/v1/auth/register
```

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response (201):**
```json
{
  "user": {
    "id": "local_xxx",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "worker"
  },
  "accessToken": "eyJhbG...",
  "refreshToken": "eyJhbG...",
  "expiresIn": 604800
}
```

### Login
```
POST /api/v1/auth/login
```

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response (200):**
```json
{
  "user": {
    "id": "local_xxx",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "worker"
  },
  "accessToken": "eyJhbG...",
  "refreshToken": "eyJhbG...",
  "expiresIn": 604800
}
```

### Refresh Token
```
POST /api/v1/auth/refresh
```

**Request:**
```json
{
  "refreshToken": "eyJhbG..."
}
```

**Response (200):**
```json
{
  "accessToken": "eyJhbG...",
  "refreshToken": "eyJhbG...",
  "expiresIn": 604800
}
```

### Logout
```
POST /api/v1/auth/logout
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "message": "Logged out successfully"
}
```

---

## 📍 MISSIONS

### Create Mission
```
POST /api/v1/missions-local
Authorization: Bearer <token>
```

**Request:**
```json
{
  "title": "Nettoyage appartement",
  "description": "Nettoyage complet d'un 4 1/2",
  "category": "cleaning",
  "price": 75.00,
  "latitude": 45.5017,
  "longitude": -73.5673,
  "city": "Montréal",
  "address": "123 Rue Principale"
}
```

**Response (201):**
```json
{
  "id": "lm_xxx",
  "title": "Nettoyage appartement",
  "description": "Nettoyage complet d'un 4 1/2",
  "category": "cleaning",
  "status": "open",
  "price": 75.00,
  "latitude": 45.5017,
  "longitude": -73.5673,
  "city": "Montréal",
  "address": "123 Rue Principale",
  "createdByUserId": "local_xxx",
  "createdAt": "2026-01-31T00:00:00.000Z"
}
```

### Get Nearby Missions
```
GET /api/v1/missions-local/nearby?latitude=45.5&longitude=-73.5&radiusKm=10
Authorization: Bearer <token>
```

**Query Parameters:**
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| latitude | float | ✅ | - | User's latitude |
| longitude | float | ✅ | - | User's longitude |
| radiusKm | float | ❌ | 10 | Search radius in km |
| sort | string | ❌ | proximity | `proximity`, `date`, `price` |
| category | string | ❌ | - | Filter by category |
| query | string | ❌ | - | Text search |

**Response (200):**
```json
[
  {
    "id": "lm_xxx",
    "title": "Nettoyage appartement",
    "category": "cleaning",
    "status": "open",
    "price": 75.00,
    "latitude": 45.5017,
    "longitude": -73.5673,
    "city": "Montréal",
    "distanceKm": 2.5,
    "createdAt": "2026-01-31T00:00:00.000Z"
  }
]
```

### Get Mission by ID
```
GET /api/v1/missions-local/:id
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "id": "lm_xxx",
  "title": "Nettoyage appartement",
  "description": "...",
  "category": "cleaning",
  "status": "open",
  "price": 75.00,
  "latitude": 45.5017,
  "longitude": -73.5673,
  "city": "Montréal",
  "address": "123 Rue Principale",
  "createdByUserId": "local_xxx",
  "assignedToUserId": null,
  "createdAt": "2026-01-31T00:00:00.000Z"
}
```

### Get Employer's Missions
```
GET /api/v1/missions-local/employer/me
Authorization: Bearer <token>
```

### Get Worker's Missions
```
GET /api/v1/missions-local/worker/me
Authorization: Bearer <token>
```

### Start Mission (Worker)
```
POST /api/v1/missions-local/:id/start
Authorization: Bearer <token>
```

### Complete Mission (Worker)
```
POST /api/v1/missions-local/:id/complete
Authorization: Bearer <token>
```

### Confirm Completion (Employer)
```
POST /api/v1/missions-local/:id/confirm
Authorization: Bearer <token>
```

---

## 💼 OFFERS

### Create Offer (Worker)
```
POST /api/v1/offers
Authorization: Bearer <token>
```

**Request:**
```json
{
  "missionId": "lm_xxx",
  "price": 70.00,
  "message": "Je suis disponible demain matin"
}
```

**Response (201):**
```json
{
  "id": "lo_xxx",
  "missionId": "lm_xxx",
  "workerId": "local_xxx",
  "price": 70.00,
  "message": "Je suis disponible demain matin",
  "status": "PENDING",
  "createdAt": "2026-01-31T00:00:00.000Z"
}
```

### Get Offers for Mission (Employer)
```
GET /api/v1/offers/mission/:missionId
Authorization: Bearer <token>
```

### Get Worker's Offers
```
GET /api/v1/offers/worker/me
Authorization: Bearer <token>
```

### Accept Offer (Employer)
```
PATCH /api/v1/offers/:id/accept
Authorization: Bearer <token>
```

### Decline Offer (Employer)
```
PATCH /api/v1/offers/:id/decline
Authorization: Bearer <token>
```

---

## 💬 MESSAGES

### Get Conversations
```
GET /api/v1/messages-local/conversations
Authorization: Bearer <token>
```

**Response (200):**
```json
[
  {
    "id": "lm_xxx",
    "missionId": "lm_xxx",
    "missionTitle": "Nettoyage appartement",
    "participantName": "John Doe",
    "participantAvatar": null,
    "lastMessage": "Bonjour!",
    "lastMessageAt": "2026-01-31T00:00:00.000Z",
    "unreadCount": 2,
    "myRole": "EMPLOYER"
  }
]
```

### Get Messages for Mission
```
GET /api/v1/messages-local/thread/:missionId
Authorization: Bearer <token>
```

**Response (200):**
```json
[
  {
    "id": "lmsg_xxx",
    "missionId": "lm_xxx",
    "senderId": "local_xxx",
    "senderRole": "WORKER",
    "content": "Bonjour!",
    "status": "SENT",
    "createdAt": "2026-01-31T00:00:00.000Z"
  }
]
```

### Send Message
```
POST /api/v1/messages-local
Authorization: Bearer <token>
```

**Request:**
```json
{
  "missionId": "lm_xxx",
  "content": "Bonjour!"
}
```

### Mark Messages as Read
```
PATCH /api/v1/messages-local/read/:missionId
Authorization: Bearer <token>
```

### Get Unread Count
```
GET /api/v1/messages-local/unread-count
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "count": 5
}
```

---

## 💳 PAYMENTS

### Create Checkout Session
```
POST /api/v1/payments-local/checkout
Authorization: Bearer <token>
```

**Request:**
```json
{
  "missionId": "lm_xxx"
}
```

**Response (201):**
```json
{
  "checkoutUrl": "https://checkout.stripe.com/...",
  "sessionId": "cs_xxx"
}
```

### Stripe Webhook (Server-to-Server)
```
POST /api/v1/payments-local/webhook
Stripe-Signature: <signature>
```

---

## ⭐ REVIEWS

### Create Review
```
POST /api/v1/reviews
Authorization: Bearer <token>
```

**Request:**
```json
{
  "missionId": "lm_xxx",
  "rating": 5,
  "comment": "Excellent travail!"
}
```

### Get Reviews for Mission
```
GET /api/v1/reviews/mission/:missionId
Authorization: Bearer <token>
```

### Get Reviews for User
```
GET /api/v1/reviews/user/:userId
Authorization: Bearer <token>
```

---

## 📚 CATALOG

### Get Categories
```
GET /api/v1/catalog/categories
Authorization: Bearer <token>
```

**Response (200):**
```json
[
  {
    "id": "cat_xxx",
    "name": "Entretien",
    "nameEn": "Cleaning",
    "icon": "🧹",
    "residentialAllowed": true,
    "legalNotes": null
  }
]
```

### Get Skills
```
GET /api/v1/catalog/skills
Authorization: Bearer <token>
```

### Get Skills by Category
```
GET /api/v1/catalog/skills?categoryId=cat_xxx
Authorization: Bearer <token>
```

---

## ⚖️ COMPLIANCE

### Accept Document
```
POST /api/v1/compliance/accept
Authorization: Bearer <token>
```

**Request:**
```json
{
  "documentType": "TERMS",
  "version": "1.0"
}
```

### Get Consent Status
```
GET /api/v1/compliance/status
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "isComplete": true,
  "documents": {
    "TERMS": {
      "accepted": true,
      "version": "1.0",
      "acceptedAt": "2026-01-31T00:00:00.000Z",
      "activeVersion": "1.0"
    },
    "PRIVACY": {
      "accepted": true,
      "version": "1.0",
      "acceptedAt": "2026-01-31T00:00:00.000Z",
      "activeVersion": "1.0"
    }
  },
  "missing": []
}
```

---

## 🏥 HEALTH

### Health Check
```
GET /healthz
```

**Response (200):**
```json
{
  "status": "ok"
}
```

### Readiness Check
```
GET /readyz
```

**Response (200):**
```json
{
  "status": "ok",
  "database": "connected"
}
```

---

## 🔗 FLUTTER SDK MAPPING

| API Endpoint | Flutter Service | Method |
|--------------|-----------------|--------|
| `POST /auth/register` | `AuthService` | `register()` |
| `POST /auth/login` | `AuthService` | `login()` |
| `POST /auth/refresh` | `AuthService` | `refreshToken()` |
| `GET /missions-local/nearby` | `MissionsApi` | `fetchNearby()` |
| `POST /missions-local` | `MissionsApi` | `create()` |
| `POST /offers` | `OffersApi` | `create()` |
| `GET /messages-local/conversations` | `MessagesApi` | `getConversations()` |
| `POST /messages-local` | `MessagesApi` | `sendMessage()` |
| `GET /catalog/categories` | `CatalogApi` | `fetchCategories()` |
| `POST /compliance/accept` | `ComplianceApi` | `accept()` |
| `POST /reviews` | `RatingsApi` | `create()` |

---

## 📝 CHANGELOG

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-31 | Initial contract |

---

*Contract generated: 2026-01-31*
