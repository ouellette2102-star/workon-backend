# Payments & Stripe Integration - Setup Guide

## ✅ Status: MINIMAL MVP RE-ENABLED

Les modules **PaymentsModule** et **StripeModule** ont été réactivés avec une implémentation MVP minimale qui compile et fonctionne localement.

---

## 🔑 Variables d'Environnement Requises

Ajoutez ces variables dans votre fichier `backend/.env` ou `backend/.env.local`:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...              # Clé secrète Stripe (test ou prod)
STRIPE_WEBHOOK_SECRET=whsec_...            # Secret pour vérifier les webhooks Stripe

# Optional - Frontend URL for Stripe Connect redirects
FRONTEND_URL=http://localhost:3000
```

### Notes Importantes:

- **STRIPE_SECRET_KEY**: Obligatoire en production. En développement, si absent, les endpoints retourneront une erreur explicite mais n'empêcheront pas le démarrage du backend.
- **STRIPE_WEBHOOK_SECRET**: Requis uniquement si vous testez les webhooks localement (avec Stripe CLI par exemple).
- **FRONTEND_URL**: Utilisé pour les redirections après onboarding Stripe Connect (pas encore implémenté dans cette version MVP).

---

## 📋 Endpoints Disponibles

### 1. PaymentsModule (`/api/v1/payments`)

#### POST `/api/v1/payments/create-intent`
Créer un PaymentIntent Stripe pour une mission.

**Auth requise:** Oui (JWT + role EMPLOYER ou RESIDENTIAL)

**Body:**
```json
{
  "missionId": "mission_xxx",
  "amount": 150.00
}
```

**Réponse:**
```json
{
  "clientSecret": "pi_xxx_secret_yyy",
  "paymentIntentId": "pi_xxx",
  "paymentId": "pay_1234567890_abc123def"
}
```

**Utilisation:**
```bash
curl -X POST http://localhost:3001/api/v1/payments/create-intent \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"missionId":"mission_test_123","amount":150.00}'
```

---

#### POST `/api/v1/webhooks/stripe`
Webhook Stripe pour traiter les événements de paiement.

**Auth requise:** Non (vérifié via signature Stripe)

**Headers:**
- `stripe-signature`: Signature du webhook (fournie par Stripe)

**Events traités:**
- `payment_intent.succeeded` → Met à jour le Payment en DB avec status SUCCEEDED
- `payment_intent.payment_failed` → Met à jour le Payment en DB avec status DISPUTED

**Test local (avec Stripe CLI):**
```bash
stripe listen --forward-to http://localhost:3001/api/v1/webhooks/stripe
```

---

### 2. StripeModule (`/api/v1/payments`)

#### POST `/api/v1/payments/create-intent`
Même endpoint que PaymentsModule (redondant, à unifier dans une future version).

---

#### GET `/api/v1/payments/connect/onboarding`
Créer un lien d'onboarding Stripe Connect pour un Worker.

**Auth requise:** Oui (JWT + role WORKER)

**Réponse:**
```json
{
  "url": "https://connect.stripe.com/setup/..."
}
```

**Status:** ⚠️ **STUB - Pas encore implémenté**

Retourne une erreur explicite:
```json
{
  "statusCode": 400,
  "message": "Stripe Connect onboarding pas encore implémenté. TODO: Ajouter champs stripeAccountId, stripeOnboarded sur User model."
}
```

---

#### GET `/api/v1/payments/connect/status`
Vérifier le statut d'onboarding Stripe Connect d'un Worker.

**Auth requise:** Oui (JWT + role WORKER)

**Réponse:**
```json
{
  "onboarded": false,
  "chargesEnabled": false,
  "payoutsEnabled": false,
  "requirementsNeeded": ["stripe_connect_not_implemented"]
}
```

**Status:** ⚠️ **STUB - Pas encore implémenté**

---

#### GET `/api/v1/payments/worker/history`
Récupérer l'historique des paiements d'un Worker.

**Auth requise:** Oui (JWT + role WORKER)

**Réponse:**
```json
[
  {
    "id": "pay_1234567890_abc123def",
    "missionId": "mission_xxx",
    "missionTitle": "Ménage maison 3 chambres",
    "missionCategory": "cat_menage",
    "amount": 150.00,
    "platformFeePct": 12,
    "netAmount": 132.00,
    "currency": "CAD",
    "status": "SUCCEEDED",
    "createdAt": "2025-11-19T03:45:12.345Z"
  }
]
```

---

## 🧪 Tests Manuels Recommandés

### 1. Healthcheck (sans Stripe configuré)
```bash
curl http://localhost:3001/api/v1/health
```
✅ Devrait retourner `200 OK` même si `STRIPE_SECRET_KEY` n'est pas défini.

---

### 2. Create Payment Intent (sans authentification)
```bash
curl -X POST http://localhost:3001/api/v1/payments/create-intent \
  -H "Content-Type: application/json" \
  -d '{"missionId":"test","amount":100}'
```
❌ Devrait retourner `401 Unauthorized` (auth requise)

---

### 3. Create Payment Intent (avec JWT invalide ou sans Stripe configuré)
```bash
curl -X POST http://localhost:3001/api/v1/payments/create-intent \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer fake_token" \
  -d '{"missionId":"test","amount":100}'
```
❌ Devrait retourner `401 Unauthorized` ou `400 Bad Request` (Stripe non configuré)

---

### 4. Worker Payment History (role check)
```bash
curl http://localhost:3001/api/v1/payments/worker/history \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```
✅ Si le token est valide et role = WORKER → retourne un tableau (vide si aucun paiement)
❌ Si role != WORKER → `403 Forbidden`

---

## 🚧 Limitations Actuelles (MVP)

### Implémenté ✅
- ✅ Création de PaymentIntent Stripe simple (sans Stripe Connect)
- ✅ Enregistrement Payment en DB avec lien vers Mission
- ✅ Traitement des webhooks Stripe (`payment_intent.succeeded`, `payment_intent.payment_failed`)
- ✅ Historique des paiements pour Workers
- ✅ Validation des rôles (EMPLOYER/RESIDENTIAL pour créer paiement, WORKER pour consulter historique)
- ✅ Compilation et démarrage sans erreur TypeScript
- ✅ Backend démarre même si `STRIPE_SECRET_KEY` n'est pas défini (en dev)

### TODO - Futures Versions 🔮

- ⚠️ **Stripe Connect**: Implémenter l'onboarding des Workers et les transferts directs
  - Ajouter champs `stripeAccountId`, `stripeOnboarded` sur `User` model
  - Implémenter `createConnectOnboardingLink()`
  - Implémenter `checkOnboardingStatus()`
  - Utiliser `transfer_data` dans `PaymentIntent.create()` pour payer directement le worker
  
- ⚠️ **Idempotence des Webhooks**: Créer une table `WebhookEvent` pour éviter le traitement en double
  - Model Prisma: `WebhookEvent { id, stripeEventId @unique, eventType, processed, processedAt }`
  - Vérifier `stripeEventId` avant traitement dans `handleWebhook()`

- ⚠️ **Champs Mission**: Ajouter `priceCents`, `currency` sur `Mission` model si nécessaire
  - Actuellement, le montant est passé dans le DTO `CreatePaymentIntentDto.amount`
  - Alternative: stocker le prix sur la mission elle-même

- ⚠️ **Reconciliation avancée**: Améliorer la réconciliation admin
  - Filtres par période, statut, mission
  - Logs détaillés des écarts
  - Retry automatique pour payments bloqués

- ⚠️ **Refunds**: Implémenter les remboursements via Stripe
  - Endpoint `POST /payments/:id/refund`
  - Mise à jour Payment.status → REFUNDED
  - Notification aux parties concernées

---

## 📝 Structure du Code

```
backend/src/
├── payments/
│   ├── payments.module.ts        ✅ Réactivé
│   ├── payments.service.ts       ✅ Aligné avec Prisma
│   ├── payments.controller.ts    ✅ Route /payments/create-intent
│   ├── webhooks.controller.ts    ✅ Route /webhooks/stripe
│   └── dto/
│       └── create-payment-intent.dto.ts
├── stripe/
│   ├── stripe.module.ts          ✅ Réactivé
│   ├── stripe.service.ts         ✅ Réécriture MVP sans Stripe Connect
│   ├── stripe.controller.ts      ✅ Routes /payments/* (redondance avec PaymentsModule)
│   └── dto/
│       └── create-payment-intent.dto.ts
├── admin/
│   ├── admin.service.ts          ✅ reconcilePayments() réactivé
│   └── admin.module.ts           ✅ Importe PaymentsModule
└── app.module.ts                 ✅ PaymentsModule + StripeModule activés
```

---

## 🎯 Résumé des Modifications

| Fichier | Changement |
|---------|-----------|
| `payments.service.ts` | ✅ Aligné avec Prisma: `authorClient`, `assigneeWorker`, `amount` (Float), `id`/`updatedAt` requis |
| `stripe.service.ts` | ✅ Réécriture complète sans Stripe Connect, stubs pour onboarding |
| `stripe.controller.ts` | ✅ Ajout role `RESIDENTIAL`, user ID mapping |
| `payments.controller.ts` | ✅ Ajout role `RESIDENTIAL` |
| `admin.service.ts` | ✅ Réactivation `reconcilePayments()` |
| `admin.module.ts` | ✅ Import `PaymentsModule` |
| `app.module.ts` | ✅ Import `PaymentsModule` + `StripeModule` |
| `tsconfig.json` | ✅ Retrait exclusions `src/payments/**` et `src/stripe/**` |
| `create-payment-intent.dto.ts` | ✅ Ajout champ `amount: number` |

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

---

## 📧 Support

Pour toute question ou amélioration future, référez-vous à:
- Documentation Stripe: https://stripe.com/docs/api
- Stripe Connect Guide: https://stripe.com/docs/connect
- Prisma Docs: https://www.prisma.io/docs

