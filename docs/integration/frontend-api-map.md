# Frontend API Map (Sparkly Integration)

> **Version**: 1.0  
> **Date**: 2025-12-28  
> **Backend**: WorkOn NestJS API  
> **Frontend**: Sparkly (FlutterFlow / Web)

---

## Convention de base

- **Base URL Production**: `https://{RAILWAY_DOMAIN}`
- **API Prefix**: `/api/v1`
- **Format**: JSON
- **Auth**: Bearer Token (JWT) sauf endpoints publics

---

## 1. Health & Status (Public)

| Endpoint | Méthode | Auth | Description |
|----------|---------|------|-------------|
| `/healthz` | GET | ❌ | Liveness probe |
| `/readyz` | GET | ❌ | Readiness probe (vérifie DB) |
| `/api/docs` | GET | ❌ | Swagger UI (si activé) |

---

## 2. Auth (Public → JWT)

| Endpoint | Méthode | Auth | Description |
|----------|---------|------|-------------|
| `/api/v1/auth/register` | POST | ❌ | Inscription utilisateur |
| `/api/v1/auth/login` | POST | ❌ | Connexion (retourne JWT) |
| `/api/v1/auth/refresh` | POST | 🔄 | Refresh token |
| `/api/v1/auth/me` | GET | ✅ JWT | Profil utilisateur connecté |

---

## 3. Users & Profiles

| Endpoint | Méthode | Auth | Description |
|----------|---------|------|-------------|
| `/api/v1/users` | GET | ✅ Admin | Liste utilisateurs |
| `/api/v1/users/:id` | GET | ✅ JWT | Détail utilisateur |
| `/api/v1/profile` | GET | ✅ JWT | Mon profil |
| `/api/v1/profile` | PATCH | ✅ JWT | Modifier mon profil |

---

## 4. Catalog (Public - Read-only)

| Endpoint | Méthode | Auth | Description |
|----------|---------|------|-------------|
| `/api/v1/catalog/categories` | GET | ❌ | Liste des 10 catégories |
| `/api/v1/catalog/skills` | GET | ❌ | Liste des 90 skills (métiers) |

### Query params `/api/v1/catalog/skills`

| Param | Type | Description |
|-------|------|-------------|
| `categoryId` | string | Filtrer par catégorie |
| `page` | number | Pagination (défaut: 1) |
| `limit` | number | Items par page (défaut: 50, max: 100) |

---

## 5. Missions

### 5.1 Missions principales (CRUD)

| Endpoint | Méthode | Auth | Description |
|----------|---------|------|-------------|
| `/api/v1/missions` | GET | ✅ JWT | Liste des missions (filtrée) |
| `/api/v1/missions` | POST | ✅ JWT (Employer) | Créer une mission |
| `/api/v1/missions/:id` | GET | ✅ JWT | Détail d'une mission |
| `/api/v1/missions/:id` | PATCH | ✅ JWT (Owner) | Modifier une mission |
| `/api/v1/missions/:id` | DELETE | ✅ JWT (Owner) | Supprimer une mission |

### 5.2 Missions Map (Carte - pins)

| Endpoint | Méthode | Auth | Description |
|----------|---------|------|-------------|
| `/api/v1/missions-map` | GET | ❌ | Missions pour carte (public) |
| `/api/v1/missions-map/:id` | GET | ❌ | Détail mission (public) |
| `/api/v1/missions-map/health` | GET | ❌ | Health check module |

### Query params `/api/v1/missions-map`

| Param | Type | Description |
|-------|------|-------------|
| `lat` | number | Latitude centre (requis) |
| `lng` | number | Longitude centre (requis) |
| `radius` | number | Rayon en km (défaut: 10, max: 50) |
| `categoryId` | string | Filtrer par catégorie |
| `skillId` | string | Filtrer par skill |

### 5.3 Missions Local (Test/Dev)

| Endpoint | Méthode | Auth | Description |
|----------|---------|------|-------------|
| `/api/v1/missions-local` | GET | ❌ | Liste missions mock |
| `/api/v1/missions-local/:id` | GET | ❌ | Détail mission mock |

---

## 6. Payments (Stripe Escrow)

### 6.1 Payment Intents

| Endpoint | Méthode | Auth | Description |
|----------|---------|------|-------------|
| `/api/v1/payments/mission/:missionId/intent` | POST | ✅ JWT | Créer PaymentIntent (escrow) |
| `/api/v1/payments/mission/:missionId/capture` | POST | ✅ JWT | Capturer les fonds |
| `/api/v1/payments/mission/:missionId/cancel` | POST | ✅ JWT | Annuler le PaymentIntent |
| `/api/v1/payments/mission/:missionId/status` | GET | ✅ JWT | Statut du paiement |

### Réponse `/api/v1/payments/mission/:missionId/intent`

```json
{
  "paymentIntentId": "pi_xxx",
  "clientSecret": "pi_xxx_secret_xxx",
  "status": "CREATED",
  "amount": 5000,
  "currency": "cad"
}
```

### États Payment (`PaymentStatus`)

| Status | Description |
|--------|-------------|
| `CREATED` | Intent créé, en attente de confirmation client |
| `REQUIRES_ACTION` | Action client requise (3D Secure) |
| `AUTHORIZED` | Fonds autorisés, prêts à capturer |
| `CAPTURED` | Fonds capturés avec succès |
| `CANCELED` | Intent annulé |
| `FAILED` | Échec du paiement |

### 6.2 Stripe Connect (Comptes travailleurs)

| Endpoint | Méthode | Auth | Description |
|----------|---------|------|-------------|
| `/api/v1/payments/stripe/connect/account` | POST | ✅ JWT | Créer compte Connect |
| `/api/v1/payments/stripe/connect/onboarding` | GET | ✅ JWT | URL onboarding Stripe |
| `/api/v1/payments/stripe/connect/status` | GET | ✅ JWT | Statut du compte Connect |

### 6.3 Webhooks (Stripe → Backend)

| Endpoint | Méthode | Auth | Description |
|----------|---------|------|-------------|
| `/api/v1/webhooks/stripe` | POST | Signature Stripe | Webhook Stripe |

> ⚠️ **Note**: Le webhook utilise la signature Stripe, pas JWT.

---

## 7. Messages

| Endpoint | Méthode | Auth | Description |
|----------|---------|------|-------------|
| `/api/v1/messages` | GET | ✅ JWT | Liste conversations |
| `/api/v1/messages/:conversationId` | GET | ✅ JWT | Messages d'une conversation |
| `/api/v1/messages` | POST | ✅ JWT | Envoyer un message |

---

## 8. Notifications

| Endpoint | Méthode | Auth | Description |
|----------|---------|------|-------------|
| `/api/v1/notifications` | GET | ✅ JWT | Mes notifications |
| `/api/v1/notifications/:id/read` | PATCH | ✅ JWT | Marquer comme lue |
| `/api/v1/notifications/read-all` | PATCH | ✅ JWT | Tout marquer comme lu |

---

## 9. Contracts

| Endpoint | Méthode | Auth | Description |
|----------|---------|------|-------------|
| `/api/v1/contracts` | GET | ✅ JWT | Mes contrats |
| `/api/v1/contracts/:id` | GET | ✅ JWT | Détail contrat |
| `/api/v1/contracts/:id/status` | PATCH | ✅ JWT | Changer statut |

---

## 10. Admin (Restricted)

| Endpoint | Méthode | Auth | Description |
|----------|---------|------|-------------|
| `/api/v1/admin/users` | GET | ✅ Admin | Liste tous utilisateurs |
| `/api/v1/admin/missions` | GET | ✅ Admin | Liste toutes missions |
| `/api/v1/admin/metrics` | GET | ✅ Admin | Métriques plateforme |

---

## Codes d'erreur standards

| Code | Signification |
|------|---------------|
| `400` | Bad Request (validation échouée) |
| `401` | Unauthorized (JWT manquant/invalide) |
| `403` | Forbidden (pas les permissions) |
| `404` | Not Found |
| `409` | Conflict (ex: doublon) |
| `500` | Internal Server Error |

### Format erreur

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "path": "/api/v1/missions",
  "timestamp": "2025-12-28T10:00:00.000Z",
  "requestId": "uuid-xxx"
}
```

---

## Headers requis

| Header | Valeur | Requis |
|--------|--------|--------|
| `Content-Type` | `application/json` | ✅ |
| `Authorization` | `Bearer {JWT_TOKEN}` | Pour endpoints protégés |
| `X-Request-ID` | UUID (optionnel) | Pour traçabilité |

---

*Document généré — PR#11 Release Audit*

