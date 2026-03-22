# WorkOn — Contrat API Frontend
**Version** : 1.1 — Mis à jour le 2026-03-03 (Backend Terminé)  
**Base URL prod** : `https://workon-backend-production-8908.up.railway.app`  
**Base URL local** : `http://localhost:3000`  
**Swagger live** : https://workon-backend-production-8908.up.railway.app/api/docs  
**Auth** : `Authorization: Bearer <accessToken>` sur tous les endpoints protégés  
**Format** : JSON, `Content-Type: application/json`

---

## Statut Backend au moment du gel

| Indicateur | Valeur |
|---|---|
| Health | ✅ OK (`/healthz` 200) |
| DB | ✅ Connected (latency ~7ms) |
| Version | 1.0.0 production |
| Uptime | > 13 jours au 2026-03-03 |

---

## 1. AUTH

### POST /api/v1/auth/register
Inscription. Retourne tokens immédiatement.

```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "Password123!",
  "firstName": "Jean",
  "lastName": "Tremblay",
  "role": "worker"  // "worker" | "employer" | "residential_client"
}
```

**Réponse 201 :**
```json
{
  "accessToken": "eyJhbGci...",
  "refreshToken": "eyJhbGci...",
  "user": {
    "id": "local_xxx",
    "email": "user@example.com",
    "firstName": "Jean",
    "lastName": "Tremblay",
    "role": "worker"
  }
}
```

**Erreurs :** `400 BAD_REQUEST` (validation), `409 CONFLICT` (email déjà utilisé)

---

### POST /api/v1/auth/login
```http
POST /api/v1/auth/login
{
  "email": "user@example.com",
  "password": "Password123!"
}
```
**Réponse 200 :** même structure que register  
**Erreurs :** `401 UNAUTHORIZED` (mauvais credentials)

---

### GET /api/v1/auth/me
**Auth required.** Retourne l'utilisateur courant.
```json
{
  "id": "local_xxx",
  "email": "user@example.com",
  "firstName": "Jean",
  "role": "worker",
  "active": true,
  "createdAt": "2026-01-15T00:00:00.000Z"
}
```

---

### POST /api/v1/auth/refresh
Rotation du token d'accès.
```http
POST /api/v1/auth/refresh
{ "refreshToken": "eyJhbGci..." }
```
**Réponse 200 :** `{ "accessToken": "...", "refreshToken": "..." }`  
**Erreurs :** `401` token expiré ou invalide → redirect login

---

### POST /api/v1/auth/forgot-password
```json
{ "email": "user@example.com" }
```
**Réponse 200 :** `{ "message": "Reset request processed" }`  
*(DEV: retourne le token en clair dans la réponse)*

---

### POST /api/v1/auth/reset-password
```json
{ "token": "abc123", "password": "NewPassword123!" }
```
**Réponse 200 :** `{ "message": "Password reset successfully" }`  
**Erreurs :** `400` token invalide/expiré

---

### DELETE /api/v1/auth/account
**Auth required.** Suppression GDPR irréversible.
```json
{ "confirm": "DELETE" }
```
**Réponse 200 :** `{ "deleted": true, "anonymized": true }`

---

## 2. COMPLIANCE (obligatoire avant F3/F4/F5)

> ⚠️ **REQUIS** : l'utilisateur DOIT accepter TERMS + PRIVACY avant d'accéder aux missions, paiements, contrats. Le ConsentGuard retourne `403` sinon.

### GET /api/v1/compliance/versions
*Public.* Retourne les versions actives des documents.
```json
{
  "versions": { "TERMS": "1.0", "PRIVACY": "1.0" },
  "updatedAt": "2026-01-15T00:00:00.000Z"
}
```

### POST /api/v1/compliance/accept
**Auth required.**
```json
{ "documentType": "TERMS", "version": "1.0" }
// puis :
{ "documentType": "PRIVACY", "version": "1.0" }
```
**Réponse 200 :** `{ "accepted": true, "documentType": "TERMS", "version": "1.0", "acceptedAt": "...", "alreadyAccepted": false }`

### GET /api/v1/compliance/status
**Auth required.** Vérifie si l'utilisateur a tout accepté.
```json
{
  "isComplete": true,
  "documents": {
    "TERMS": { "accepted": true, "version": "1.0", "acceptedAt": "..." },
    "PRIVACY": { "accepted": true, "version": "1.0", "acceptedAt": "..." }
  },
  "missing": []
}
```

---

## 3. CATALOGUE (public)

### GET /api/v1/catalog/categories
*Public.* Liste des catégories de missions.
```json
[
  {
    "id": "cat_xxx",
    "name": "Beauté",
    "nameEn": "Beauty",
    "icon": "💇",
    "legalNotes": "Certaines pratiques..."
  }
]
```

### GET /api/v1/catalog/skills
*Public.* Liste des compétences (avec pagination).
```json
{
  "data": [
    { "id": "skill_xxx", "name": "Accompagnement personnel", "nameEn": "...", "categoryId": "cat_xxx" }
  ],
  "total": 90,
  "page": 1,
  "limit": 50
}
```

---

## 4. MISSIONS LOCALES

> Utiliser `/api/v1/missions-local` (système actif). Le système `/api/v1/missions` est legacy (Clerk).

### GET /api/v1/missions-local/nearby
**Auth required.**  
Query params: `latitude`, `longitude`, `radius` (km, défaut 25).
```http
GET /api/v1/missions-local/nearby?latitude=45.5017&longitude=-73.5673&radius=25
```
**Réponse 200 :** tableau de missions avec distance

### GET /api/v1/missions-local/map
**Auth required.** Version carte avec bounding box.  
Query params: `minLat`, `maxLat`, `minLng`, `maxLng`

### GET /api/v1/missions-local/my-missions
**Auth required.** Missions créées par l'employer connecté.

### GET /api/v1/missions-local/my-assignments
**Auth required.** Missions assignées au worker connecté.

### GET /api/v1/missions-local/:id
**Auth required.** Détail d'une mission.

### POST /api/v1/missions-local
**Auth required** (employer ou residential_client).
```json
{
  "title": "Déneigement entrée",
  "description": "Besoin de déneiger une entrée de 20 mètres",
  "category": "snow_removal",
  "price": 75.00,
  "latitude": 45.5017,
  "longitude": -73.5673,
  "city": "Montreal",
  "address": "123 rue Example"  // optionnel
}
```
**Catégories valides :** `cleaning`, `snow_removal`, `moving`, `handyman`, `gardening`, `painting`, `delivery`, `other`  
**Réponse 201 :** objet mission avec `id`

### POST /api/v1/missions-local/:id/accept
**Auth required** (worker). Accepter une mission.

### POST /api/v1/missions-local/:id/start
**Auth required** (worker). Démarrer la mission.

### POST /api/v1/missions-local/:id/complete
**Auth required**. Compléter la mission.

### POST /api/v1/missions-local/:id/cancel
**Auth required**. Annuler la mission.

---

## 5. PAIEMENTS

### POST /api/v1/payments/checkout
**Auth required** + Consent.
```json
{ "missionId": "lm_xxx" }
```
**Réponse 201 :**
```json
{
  "checkoutUrl": "https://checkout.stripe.com/...",
  "sessionId": "cs_xxx"
}
```
Rediriger l'utilisateur vers `checkoutUrl`.

### POST /api/v1/payments/mission/:missionId/intent
**Auth required** + Consent. Paiement escrow (authorize-only).
```json
{ "amount": 7500 }  // centimes CAD
```
**Réponse 201 :** `{ "clientSecret": "pi_xxx_secret_xxx" }`

### POST /api/v1/payments/mission/:missionId/capture
**Auth required** + Consent. Capturer le paiement autorisé (après mission complétée).

### GET /api/v1/payments/mission/:missionId/status
**Auth required** + Consent. Statut du paiement.

### GET /api/v1/payments/invoice/:id
**Auth required**. Détail d'une facture.

### GET /api/v1/payments/preview
**Auth required**. Aperçu de facturation.

### POST /api/v1/webhooks/stripe
*Webhook Stripe — backend only, ne pas appeler depuis le front.*  
Header requis : `stripe-signature: whsec_xxx`

---

## 6. STRIPE CONNECT (Workers)

### GET /api/v1/payments/stripe/connect/status
**Auth required.**
```json
{
  "hasAccount": false,
  "accountId": null,
  "onboarded": false,
  "chargesEnabled": false,
  "payoutsEnabled": false,
  "detailsSubmitted": false,
  "requirementsNeeded": ["account_not_created"]
}
```

### GET /api/v1/payments/stripe/connect/onboarding
**Auth required.** Retourne un lien d'onboarding Stripe Connect.
```json
{ "url": "https://connect.stripe.com/setup/..." }
```

### GET /api/v1/payments/stripe/connect/refresh
**Auth required.** Rafraîchir le lien d'onboarding.

---

## 7. MESSAGERIE LOCALE

### GET /api/v1/messages-local/conversations
**Auth required.** Liste des conversations.

### GET /api/v1/messages-local/thread/:missionId
**Auth required.** Messages d'une mission.

### POST /api/v1/messages-local
**Auth required.**
```json
{ "missionId": "lm_xxx", "content": "Bonjour, je suis disponible." }
```

### PATCH /api/v1/messages-local/read/:missionId
**Auth required.** Marquer comme lu.

### GET /api/v1/messages-local/unread-count
**Auth required.** Retourne `{ "count": 3 }`.

---

## 8. REVIEWS

### GET /api/v1/reviews
**Auth required.** Reviews reçues par l'utilisateur.

### POST /api/v1/reviews
**Auth required** + Consent.
```json
{
  "missionId": "lm_xxx",
  "reviewedUserId": "local_xxx",
  "rating": 5,
  "comment": "Excellent travail!"
}
```

### GET /api/v1/reviews/summary/:userId
**Auth required.** Résumé des évaluations d'un utilisateur.

---

## 9. EARNINGS (Workers)

> ⚠️ **BUG CONNU** : `GET /api/v1/earnings/summary` retourne 500 en production.  
> **Cause probable** : colonne `paidAt` potentiellement absente en prod (migration `20260131094710`).  
> **Workaround** : masquer cette section jusqu'à correction.

### GET /api/v1/earnings/summary
**Auth required** (worker).

### GET /api/v1/earnings/history
**Auth required** (worker). Query: `cursor`, `limit`.

---

## 10. NOTIFICATIONS

### GET /api/v1/notifications
**Auth required.** Query: `unreadOnly`.

### GET /api/v1/notifications/unread-count
**Auth required.**

### PATCH /api/v1/notifications/:id/read
**Auth required.**

### PATCH /api/v1/notifications/read-all
**Auth required.**

---

## 11. PROFIL & UTILISATEURS

### GET /api/v1/users/me
**Auth required.**

### PATCH /api/v1/users/me
**Auth required.**
```json
{
  "firstName": "Jean",
  "lastName": "Tremblay",
  "phone": "+15141234567"
}
```

### POST /api/v1/users/me/picture
**Auth required.** Multipart/form-data, champ `file` (JPEG/PNG/WebP, max 5MB).

### DELETE /api/v1/users/me
**Auth required.** Suppression compte.

---

## 12. MÉTRIQUES (public)

### GET /api/v1/metrics/ratio
```json
{
  "region": null,
  "workers": 69,
  "employers": 44,
  "residentialClients": 0,
  "workerToEmployerRatio": 1.57
}
```

### GET /api/v1/metrics/regions
```json
["Montreal", "MTL", "Montréal"]
```

### GET /api/v1/metrics/prometheus
Format Prometheus text/plain — pour monitoring interne.

### GET /api/v1/metrics/home-stats
> ⚠️ **PAS ENCORE DÉPLOYÉ** (commit local `768f86b` en attente de push)
```json
{
  "completedContracts": 182,
  "activeWorkers": 2453,
  "openServiceCalls": 24
}
```

---

## 13. HEALTH

### GET /healthz
*Public.* Liveness probe.
```json
{ "status": "ok", "timestamp": "...", "uptime": 1162372, "version": "1.0.0" }
```

### GET /readyz
*Public.* Readiness probe (inclut check DB).
```json
{
  "status": "ready",
  "checks": {
    "database": { "status": "ok", "latencyMs": 7 }
  }
}
```

---

## Format d'erreur standardisé

Toutes les erreurs suivent ce format :
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authorization manquante",
    "status": 401,
    "requestId": "c3d698de-xxxx",
    "timestamp": "2026-03-03T20:58:09.000Z"
  }
}
```

**Codes HTTP à gérer côté front :**
| Code | Signification | Action UX |
|---|---|---|
| 400 | Validation échouée | Afficher les erreurs de champs |
| 401 | Token absent ou expiré | Redirect vers login |
| 403 | Consentement requis ou rôle insuffisant | Afficher écran consentement ou "non autorisé" |
| 404 | Ressource introuvable | Page 404 ou message d'erreur |
| 409 | Conflit (email déjà utilisé) | "Cet email est déjà enregistré" |
| 422 | Entité non processable | Vérifier les données envoyées |
| 429 | Rate limit atteint | "Trop de requêtes, réessayer dans X secondes" |
| 500 | Erreur serveur | Message générique + requestId pour support |

---

## Checklist d'intégration Frontend

### Par écran

| Écran | Endpoints | Consent requis | Notes |
|---|---|---|---|
| **Inscription** | POST /auth/register | Non | Stocker accessToken + refreshToken |
| **Consentement légal** | GET /compliance/versions, POST /compliance/accept (×2) | — | À montrer juste après register |
| **Connexion** | POST /auth/login | Non | — |
| **Home landing** | GET /metrics/ratio, /metrics/regions, /metrics/home-stats* | Non | *non déployé |
| **Feed worker** | GET /missions-local/nearby | Non | Lat/lng requis |
| **Carte** | GET /missions-local/map | Non | bbox params |
| **Détail mission** | GET /missions-local/:id | Non | — |
| **Créer mission (employer)** | POST /missions-local | Oui | `category` = enum string |
| **Accepter mission** | POST /missions-local/:id/accept | Oui | — |
| **Chat** | GET/POST messages-local/* | Non | — |
| **Paiement** | POST /payments/checkout | Oui | Redirect Stripe URL |
| **Reviews** | GET/POST /reviews | Oui | — |
| **Profil** | GET/PATCH /users/me | Non | — |
| **Gains (worker)** | GET /earnings/summary | Non | ⚠️ BUG 500 en prod |
| **Onboarding Stripe** | GET /payments/stripe/connect/onboarding | Non | — |

### États UX obligatoires

| État | Description |
|---|---|
| `loading` | Spinner pendant les appels API |
| `empty` | Message "Aucun résultat" pour les listes vides |
| `error` | Afficher `error.message` ou message générique + `requestId` |
| `consent_required` | Écran d'acceptation CGU/Politique si 403 avec code `CONSENT_REQUIRED` |
| `unauthorized` | Redirect login si 401 |
| `not_found` | Page 404 si 404 |

### Gestion des tokens

```typescript
// Stocker après login/register
localStorage.setItem('accessToken', data.accessToken);
localStorage.setItem('refreshToken', data.refreshToken);

// Intercepteur axios — refresh automatique sur 401
axios.interceptors.response.use(null, async (error) => {
  if (error.response?.status === 401) {
    const { data } = await axios.post('/api/v1/auth/refresh', {
      refreshToken: localStorage.getItem('refreshToken')
    });
    localStorage.setItem('accessToken', data.accessToken);
    error.config.headers['Authorization'] = `Bearer ${data.accessToken}`;
    return axios.request(error.config);
  }
  return Promise.reject(error);
});
```

---

---

## Definition of Done — Backend Terminé ✅

**Date de validation** : 2026-03-03  
**Score smoke tests** : 28/28 PASS  
**Environnement** : Railway prod `workon-backend-production-8908.up.railway.app`

### Flux E2E validés avec preuves

| Flux | Endpoints clés | Statut prod | HTTP attendu |
|---|---|---|---|
| **F1 Auth** | POST /auth/register, POST /auth/login, GET /auth/me, POST /auth/refresh | ✅ PASS | 201, 200, 401/200, 200 |
| **Consent** | GET /compliance/versions, POST /compliance/accept | ✅ PASS | 200, 200 |
| **F2 Browse** | GET /catalog/categories, GET /catalog/skills | ✅ PASS | 200, 200 |
| **F3 Missions** | POST /missions-local, POST /missions-local/:id/accept | ✅ PASS | 201, 201 |
| **F4 Stripe** | GET /payments/stripe/connect/status | ✅ PASS | 200 |
| **F5 Reviews** | GET /reviews | ✅ PASS | 200 |
| **F5 Earnings** | GET /earnings/summary | ✅ PASS | 200 (était 500) |
| **F6 Health** | GET /healthz, GET /readyz | ✅ PASS | 200, 200 |
| **Metrics** | GET /metrics/ratio, /metrics/regions, /metrics/prometheus | ✅ PASS | 200, 200, 200 |
| **Swagger** | GET /api/docs-json | ✅ PASS | 200 |

### Commande smoke tests
```bash
# Contre Railway prod (défaut)
node scripts/smoke-probe.mjs

# Contre localhost (Docker requis)
node scripts/smoke-probe.mjs localhost:3001
```

### PRs mergées
| PR | Titre | Merge |
|---|---|---|
| [#131](https://github.com/ouellette2102-star/workon-backend/pull/131) | fix(db): add paid value to LocalMissionStatus enum | 2026-03-03 |
| [#132](https://github.com/ouellette2102-star/workon-backend/pull/132) | feat(metrics): add GET /home-stats endpoint with DTO and tests | 2026-03-03 |

### Risques résiduels (3 max)

| # | Risque | Sévérité | Action |
|---|---|---|---|
| R-1 | Railway `modest-abundance/production` échoue à déployer le nouveau code — même sha deploy OK sur staging. Cause probable : env vars manquantes sur cet environnement. | MOYEN | Vérifier les variables d'environnement Railway du service prod. Re-trigger le déploiement depuis le dashboard Railway. |
| R-2 | `GET /api/v1/missions-map` → 404 — `MissionsMapModule` non importé dans `app.module.ts`. Le `/missions-local/map` fonctionne comme alternative. | FAIBLE | Créer PR : ajouter `MissionsMapModule` dans `app.module.ts` |
| R-3 | `GET /api/v1/metrics/home-stats` → 404 — code mergé mais bloqué par R-1 | FAIBLE | Se résout automatiquement quand R-1 est fixé |

---

## Issues résolues

| # | Endpoint | Avant | Après | Fix |
|---|---|---|---|---|
| ~~I-1~~ | GET /api/v1/earnings/summary | HTTP 500 | **HTTP 200** | PR #131 — migration `ALTER TYPE "LocalMissionStatus" ADD VALUE IF NOT EXISTS 'paid'` |
| ~~I-3~~ | GET /api/v1/metrics/home-stats | 404 (local only) | Mergé (PR #132) | Bloqué par déploiement Railway (R-1) |

---

*Contrat gelé le 2026-03-03 — WorkOn Lead Engineering — Backend Terminé v1.1*
