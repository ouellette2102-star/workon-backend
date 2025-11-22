# 🎯 Missions & Marketplace API - Usage Guide

## 📋 TABLE OF CONTENTS

1. [Overview](#overview)
2. [Missions API](#missions-api)
3. [Metrics API](#metrics-api)
4. [Payments API](#payments-api)
5. [Testing Examples](#testing-examples)

---

## 🎯 OVERVIEW

WorkOn MVP marketplace with:
- ✅ **Missions** - Create, search, accept, complete missions
- ✅ **Geolocation** - Find nearby missions using Haversine formula
- ✅ **Ratios** - Worker/employer distribution by region
- ✅ **Payments** - Stripe-ready (optional in dev)

---

## 🚀 MISSIONS API

### 1. Create Mission

**Endpoint:** `POST /api/v1/missions`

**Auth:** Required (employer or residential_client)

**Request:**
```bash
curl -X POST http://localhost:3001/api/v1/missions \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Déneigement entrée résidentielle",
    "description": "Besoin de déneiger une entrée de 20 mètres après la tempête",
    "category": "snow_removal",
    "price": 75.00,
    "latitude": 45.5017,
    "longitude": -73.5673,
    "city": "Montréal",
    "address": "123 rue Example"
  }'
```

**Response (201):**
```json
{
  "id": "cly_mission123",
  "title": "Déneigement entrée résidentielle",
  "description": "Besoin de déneiger une entrée de 20 mètres après la tempête",
  "category": "snow_removal",
  "status": "open",
  "price": 75.0,
  "latitude": 45.5017,
  "longitude": -73.5673,
  "city": "Montréal",
  "address": "123 rue Example",
  "createdByUserId": "cly_user123",
  "assignedToUserId": null,
  "createdAt": "2024-11-18T18:00:00.000Z",
  "updatedAt": "2024-11-18T18:00:00.000Z"
}
```

**Categories:**
- `cleaning`
- `snow_removal`
- `moving`
- `handyman`
- `gardening`
- `painting`
- `delivery`
- `other`

---

### 2. Find Nearby Missions

**Endpoint:** `GET /api/v1/missions/nearby`

**Auth:** Required (worker)

**Query Params:**
- `latitude` (required): Current latitude
- `longitude` (required): Current longitude
- `radiusKm` (optional, default 10): Search radius in km

**Request:**
```bash
curl -X GET "http://localhost:3001/api/v1/missions/nearby?latitude=45.5017&longitude=-73.5673&radiusKm=15" \
  -H "Authorization: Bearer {WORKER_TOKEN}"
```

**Response (200):**
```json
[
  {
    "id": "cly_mission123",
    "title": "Déneigement entrée résidentielle",
    "description": "...",
    "category": "snow_removal",
    "status": "open",
    "price": 75.0,
    "latitude": 45.5017,
    "longitude": -73.5673,
    "city": "Montréal",
    "address": "123 rue Example",
    "createdByUserId": "cly_employer456",
    "assignedToUserId": null,
    "distanceKm": 2.5,
    "createdAt": "2024-11-18T18:00:00.000Z",
    "updatedAt": "2024-11-18T18:00:00.000Z"
  }
]
```

**Algorithm:**
- Uses Haversine formula for accurate distance calculation
- Returns missions within radius, sorted by distance
- Only returns `open` missions
- Maximum 50 results

---

### 3. Accept Mission

**Endpoint:** `POST /api/v1/missions/:id/accept`

**Auth:** Required (worker)

**Request:**
```bash
curl -X POST http://localhost:3001/api/v1/missions/cly_mission123/accept \
  -H "Authorization: Bearer {WORKER_TOKEN}"
```

**Response (200):**
```json
{
  "id": "cly_mission123",
  "title": "Déneigement entrée résidentielle",
  "status": "assigned",
  "assignedToUserId": "cly_worker789",
  "..."
}
```

**Rules:**
- Mission must be `open`
- Worker cannot accept mission already assigned to someone else
- Status changes: `open` → `assigned`

---

### 4. Complete Mission

**Endpoint:** `POST /api/v1/missions/:id/complete`

**Auth:** Required (worker or mission creator)

**Request:**
```bash
curl -X POST http://localhost:3001/api/v1/missions/cly_mission123/complete \
  -H "Authorization: Bearer {TOKEN}"
```

**Response (200):**
```json
{
  "id": "cly_mission123",
  "status": "completed",
  "..."
}
```

**Rules:**
- Only assigned worker or mission creator can complete
- Cannot complete cancelled missions
- Status changes: `assigned` or `in_progress` → `completed`

---

### 5. Cancel Mission

**Endpoint:** `POST /api/v1/missions/:id/cancel`

**Auth:** Required (mission creator or admin)

**Request:**
```bash
curl -X POST http://localhost:3001/api/v1/missions/cly_mission123/cancel \
  -H "Authorization: Bearer {CREATOR_TOKEN}"
```

**Response (200):**
```json
{
  "id": "cly_mission123",
  "status": "cancelled",
  "assignedToUserId": null,
  "..."
}
```

**Rules:**
- Only mission creator or admin can cancel
- Cannot cancel completed missions
- Clears `assignedToUserId` when cancelled

---

### 6. Get Mission by ID

**Endpoint:** `GET /api/v1/missions/:id`

**Auth:** Required

**Request:**
```bash
curl -X GET http://localhost:3001/api/v1/missions/cly_mission123 \
  -H "Authorization: Bearer {TOKEN}"
```

---

### 7. Get My Created Missions

**Endpoint:** `GET /api/v1/missions/my-missions`

**Auth:** Required

**Request:**
```bash
curl -X GET http://localhost:3001/api/v1/missions/my-missions \
  -H "Authorization: Bearer {EMPLOYER_TOKEN}"
```

**Response:** List of missions created by current user

---

### 8. Get My Assigned Missions

**Endpoint:** `GET /api/v1/missions/my-assignments`

**Auth:** Required (worker)

**Request:**
```bash
curl -X GET http://localhost:3001/api/v1/missions/my-assignments \
  -H "Authorization: Bearer {WORKER_TOKEN}"
```

**Response:** List of missions assigned to current worker

---

## 📊 METRICS API

### 1. Get Worker/Employer Ratio

**Endpoint:** `GET /api/v1/metrics/ratio`

**Auth:** None (public endpoint)

**Query Params:**
- `region` (optional): City/region to filter by

**Request (Global):**
```bash
curl -X GET http://localhost:3001/api/v1/metrics/ratio
```

**Request (By Region):**
```bash
curl -X GET "http://localhost:3001/api/v1/metrics/ratio?region=Montréal"
```

**Response (200):**
```json
{
  "region": "Montréal",
  "workers": 150,
  "employers": 75,
  "residentialClients": 25,
  "workerToEmployerRatio": 2.0
}
```

**Use Cases:**
- Show demand/supply balance to users
- Help workers decide where to work
- Help employers understand competition
- Platform analytics

---

### 2. Get Available Regions

**Endpoint:** `GET /api/v1/metrics/regions`

**Auth:** None (public)

**Request:**
```bash
curl -X GET http://localhost:3001/api/v1/metrics/regions
```

**Response (200):**
```json
["Montréal", "Laval", "Québec", "Gatineau", "Longueuil"]
```

---

## 💳 PAYMENTS API

### 1. Create Payment Intent

**Endpoint:** `POST /api/v1/payments/intent`

**Auth:** Required (employer or residential_client)

**Prerequisites:**
- Mission must be `completed`
- User must be mission creator
- Stripe must be configured (`STRIPE_SECRET_KEY` in `.env`)

**Request:**
```bash
curl -X POST http://localhost:3001/api/v1/payments/intent \
  -H "Authorization: Bearer {EMPLOYER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "missionId": "cly_mission123"
  }'
```

**Response (201) - Stripe Configured:**
```json
{
  "paymentIntentId": "pi_1234567890",
  "clientSecret": "pi_1234567890_secret_abc123",
  "amount": 7500,
  "currency": "CAD",
  "missionId": "cly_mission123"
}
```

**Response (503) - Stripe NOT Configured:**
```json
{
  "statusCode": 503,
  "message": "Payment service not configured. Set STRIPE_SECRET_KEY in .env to enable payments."
}
```

**Development Mode:**
- If `STRIPE_SECRET_KEY` is not set, returns clear 503 error
- No crash, just informative error message
- Allows testing rest of app without Stripe

**Production Mode:**
- `STRIPE_SECRET_KEY` required
- Full Stripe PaymentIntent creation
- Frontend can confirm payment using `clientSecret`

---

### 2. Stripe Webhook

**Endpoint:** `POST /api/v1/payments/webhook`

**Auth:** None (verified via Stripe signature)

**Purpose:**
- Receives Stripe webhook events
- Handles `payment_intent.succeeded` and `payment_intent.failed`
- Updates mission payment status

**Setup:**
1. Configure webhook URL in Stripe Dashboard:
   ```
   https://your-domain.com/api/v1/payments/webhook
   ```

2. Set webhook secret in `.env`:
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
   ```

3. Stripe will POST events to this endpoint

**Implementation Status:**
- ✅ Webhook signature verification
- ✅ Event type handling
- 🚧 TODO: Update mission payment status in database
- 🚧 TODO: Send notification to user

---

## 🧪 TESTING EXAMPLES

### Complete Flow: Create → Accept → Complete → Pay

#### 1. Register Employer

```bash
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "employer@test.com",
    "password": "Test123456!",
    "firstName": "Marie",
    "lastName": "Employer",
    "role": "employer",
    "city": "Montréal"
  }'

# Save EMPLOYER_TOKEN
```

#### 2. Register Worker

```bash
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "worker@test.com",
    "password": "Test123456!",
    "firstName": "Jean",
    "lastName": "Worker",
    "role": "worker",
    "city": "Montréal"
  }'

# Save WORKER_TOKEN
```

#### 3. Employer Creates Mission

```bash
curl -X POST http://localhost:3001/api/v1/missions \
  -H "Authorization: Bearer {EMPLOYER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Déneigement urgent",
    "description": "Entrée de 20m à déneiger",
    "category": "snow_removal",
    "price": 75.00,
    "latitude": 45.5017,
    "longitude": -73.5673,
    "city": "Montréal"
  }'

# Save MISSION_ID
```

#### 4. Worker Searches Nearby

```bash
curl -X GET "http://localhost:3001/api/v1/missions/nearby?latitude=45.5017&longitude=-73.5673&radiusKm=10" \
  -H "Authorization: Bearer {WORKER_TOKEN}"
```

#### 5. Worker Accepts Mission

```bash
curl -X POST http://localhost:3001/api/v1/missions/{MISSION_ID}/accept \
  -H "Authorization: Bearer {WORKER_TOKEN}"
```

#### 6. Worker Completes Mission

```bash
curl -X POST http://localhost:3001/api/v1/missions/{MISSION_ID}/complete \
  -H "Authorization: Bearer {WORKER_TOKEN}"
```

#### 7. Employer Creates Payment

```bash
curl -X POST http://localhost:3001/api/v1/payments/intent \
  -H "Authorization: Bearer {EMPLOYER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "missionId": "{MISSION_ID}"
  }'
```

#### 8. Check Ratio

```bash
curl -X GET "http://localhost:3001/api/v1/metrics/ratio?region=Montréal"
```

---

## 🔒 SECURITY NOTES

### Authorization Rules

| Endpoint | Worker | Employer | Client | Admin |
|----------|--------|----------|--------|-------|
| Create mission | ❌ | ✅ | ✅ | ✅ |
| Search nearby | ✅ | ❌ | ❌ | ✅ |
| Accept mission | ✅ | ❌ | ❌ | ❌ |
| Complete mission | ✅* | ✅** | ✅** | ✅ |
| Cancel mission | ❌ | ✅** | ✅** | ✅ |
| Create payment | ❌ | ✅** | ✅** | ✅ |

\* Only assigned worker  
\*\* Only mission creator

### Data Protection

- ✅ All mission endpoints protected by `JwtAuthGuard`
- ✅ Role-based access control
- ✅ User IDs verified from JWT (not from request body)
- ✅ Geolocation queries use indexed columns
- ✅ No internal user IDs leaked in public endpoints

---

## 📈 SCALABILITY NOTES

### Database Indexes

```sql
-- Geospatial queries
CREATE INDEX idx_missions_location ON local_missions (latitude, longitude);

-- Status filtering
CREATE INDEX idx_missions_status ON local_missions (status);

-- User queries
CREATE INDEX idx_missions_creator ON local_missions (createdByUserId);
CREATE INDEX idx_missions_worker ON local_missions (assignedToUserId);

-- Regional queries
CREATE INDEX idx_missions_city ON local_missions (city);
CREATE INDEX idx_users_city ON local_users (city);
```

### Future Enhancements

**Categories (90 jobs):**
- Current: 8 generic categories
- Future: 90+ specialized jobs catalog
- Implementation: Change `category` from String to relation with `JobCategories` table

**Regions:**
- Current: City string field
- Future: Structured regions (province, city, postal_code)
- Implementation: Add `Regions` table with hierarchical structure

**Geospatial:**
- Current: Haversine formula (accurate, simple)
- Future: PostGIS extension for advanced queries (polygon search, routing)
- Implementation: Enable PostGIS, migrate to `geography` type

---

## 📚 SWAGGER DOCUMENTATION

All endpoints documented in Swagger UI:

**URL:** http://localhost:3001/api/docs

**Tags:**
- `missions` - Mission management
- `metrics` - Platform metrics
- `payments` - Payment processing

**Features:**
- Interactive testing
- Bearer token auth
- Example requests/responses
- Schema validation

---

## ✅ CHECKLIST

### Before Production

- [ ] Configure Stripe:
  - `STRIPE_SECRET_KEY` in `.env`
  - `STRIPE_WEBHOOK_SECRET` in `.env`
  - Webhook URL configured in Stripe Dashboard

- [ ] Database:
  - Run migrations: `npx prisma db push`
  - Create indexes for geospatial queries
  - Consider PostGIS for large scale

- [ ] Security:
  - Rate limiting configured (already done: 20 req/min)
  - CORS restricted to frontend domain
  - JWT expiration appropriate (currently 7d)

- [ ] Monitoring:
  - Set up error tracking (Sentry)
  - Monitor mission creation/completion rates
  - Track payment success/failure rates

---

**Questions?** Check Swagger docs or source code in `backend/src/missions-local/`, `backend/src/metrics/`, and `backend/src/payments-local/`.

