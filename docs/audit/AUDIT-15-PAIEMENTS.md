# Audit 15 — Paiements & Flux Financiers

> **Date**: 2026-01-19 | **Statut**: ✅ Conforme
>
> Audit de l'intégration Stripe et des flux financiers.

---

## 📋 Périmètre de l'audit

L'audit Paiements vérifie :

1. **Intégration Stripe** sécurisée
2. **Flux escrow** (capture manuelle)
3. **Webhooks** (signature vérifiée)
4. **Idempotence** des opérations
5. **Gestion des erreurs** robuste
6. **Clés de test** vs production

---

## ✅ Points conformes

### 1. Configuration Stripe sécurisée

| Critère | Statut | Implémentation |
|---------|--------|----------------|
| Clé secrète | ✅ | Via `STRIPE_SECRET_KEY` env var |
| Webhook secret | ✅ | Via `STRIPE_WEBHOOK_SECRET` env var |
| Pas de hardcoding | ✅ | ConfigService uniquement |
| Validation prod | ✅ | Erreur si manquant en production |

```typescript
// src/config/env.validation.ts
if (!isPresent(validatedConfig.STRIPE_WEBHOOK_SECRET)) {
  throw new Error('STRIPE_WEBHOOK_SECRET is required in production');
}
```

### 2. Flux Escrow (Capture manuelle)

| Étape | Implémentation | Sécurité |
|-------|----------------|----------|
| 1. Création intent | `capture_method: 'manual'` | ✅ Fonds réservés, pas capturés |
| 2. Autorisation | PaymentSheet frontend | ✅ Client valide carte |
| 3. Capture | `POST /payments/capture` | ✅ Employer uniquement |
| 4. Cancel | `POST /payments/cancel` | ✅ Annulation possible |

```typescript
// src/payments/payments.service.ts
const paymentIntent = await this.stripe.paymentIntents.create({
  amount: amountInCents,
  currency: 'cad',
  capture_method: 'manual', // Escrow - capture différée
  idempotencyKey: this.generateIdempotencyKey(missionId, 'create'),
});
```

### 3. Webhooks sécurisés

| Critère | Statut | Détail |
|---------|--------|--------|
| Signature vérifiée | ✅ | `constructEvent(rawBody, signature, secret)` |
| Raw body préservé | ✅ | `rawBody: true` dans NestFactory |
| Events supportés | ✅ | succeeded, canceled, failed, captured |
| Idempotence | ✅ | `lastStripeEventId` en DB |

```typescript
// src/payments/webhooks.controller.ts
event = this.stripe.webhooks.constructEvent(
  rawBody,
  signature,
  webhookSecret
);
```

### 4. Idempotence des opérations

| Opération | Clé idempotence | Mécanisme |
|-----------|-----------------|-----------|
| Create intent | `sha256(missionId:create)` | Stripe idempotencyKey |
| Capture | `sha256(missionId:capture)` | Stripe idempotencyKey |
| Webhook | `eventId` en DB | `lastStripeEventId` |

```typescript
// src/payments/payments.service.ts
private generateIdempotencyKey(missionId: string, operation: string): string {
  const hash = crypto.createHash('sha256')
    .update(`${missionId}:${operation}`)
    .digest('hex');
  return hash.substring(0, 32);
}
```

### 5. Gestion des erreurs

| Erreur | Code HTTP | Message |
|--------|-----------|---------|
| Stripe non configuré | 400 | "Stripe n'est pas configuré" |
| Mission non trouvée | 404 | "Mission non trouvée" |
| Pas propriétaire | 403 | "Vous ne pouvez pas créer un paiement" |
| Déjà capturé | 409 | "Paiement déjà capturé" |
| Montant invalide | 400 | "Montant doit être > 0" |

### 6. Protection des endpoints

| Endpoint | Guards | Rate limit |
|----------|--------|------------|
| `POST /intent` | JWT + Roles + Consent | 20/min |
| `POST /capture` | JWT + Roles + Consent | 20/min |
| `POST /cancel` | JWT + Roles + Consent | 20/min |
| `POST /webhooks/stripe` | Signature Stripe | - |

---

## 📊 Flux de paiement complet

```
┌─────────────────────────────────────────────────────────────────┐
│                    FLUX ESCROW WORKON                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. CRÉATION MISSION (Employer)                                 │
│     └── Mission créée avec prix                                 │
│                                                                 │
│  2. ACCEPTATION OFFRE (Employer)                                │
│     └── Worker assigné                                          │
│                                                                 │
│  3. CRÉATION PAYMENTINTENT (Employer)                           │
│     ├── POST /payments/mission/:id/intent                       │
│     ├── capture_method: 'manual' (escrow)                       │
│     └── clientSecret retourné au frontend                       │
│                                                                 │
│  4. PAIEMENT VIA PAYMENTSHEET (Employer)                        │
│     ├── Stripe.presentPaymentSheet(clientSecret)                │
│     ├── Webhook: payment_intent.amount_capturable_updated       │
│     └── Status DB: AUTHORIZED                                   │
│                                                                 │
│  5. EXÉCUTION MISSION (Worker)                                  │
│     └── Mission in_progress → completed                         │
│                                                                 │
│  6. CAPTURE FONDS (Employer)                                    │
│     ├── POST /payments/mission/:id/capture                      │
│     ├── stripe.paymentIntents.capture()                         │
│     ├── Webhook: payment_intent.succeeded                       │
│     └── Status DB: CAPTURED                                     │
│                                                                 │
│  7. EARNINGS WORKER                                             │
│     ├── Calcul: grossAmount - commission (15%)                  │
│     └── Disponible pour payout                                  │
│                                                                 │
│  ANNULATION (si mission annulée avant capture)                  │
│     ├── POST /payments/mission/:id/cancel                       │
│     ├── stripe.paymentIntents.cancel()                          │
│     └── Fonds libérés automatiquement                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔍 Vérifications effectuées

### Sécurité Stripe

| Check | Résultat |
|-------|----------|
| Clés en env vars | ✅ |
| Webhook signature | ✅ |
| Idempotency keys | ✅ |
| Raw body préservé | ✅ |
| Error logging | ✅ (sans secrets) |

### Tests E2E paiements

```bash
# e2e/payments.spec.ts
- PaymentIntent creation (mock Stripe)
- Status verification
```

### Validation production

```typescript
// Erreur si STRIPE_WEBHOOK_SECRET manquant en prod
throw new Error('STRIPE_WEBHOOK_SECRET is required in production');
```

---

## ⚠️ Recommandations (non bloquantes)

### 1. Stripe Connect (futur)

Pour payer directement les workers, implémenter Stripe Connect:

```typescript
// Future PR: Payouts automatiques
const transfer = await stripe.transfers.create({
  amount: workerPayout,
  currency: 'cad',
  destination: workerStripeAccountId,
});
```

### 2. Retry webhook (futur)

Implémenter queue pour retry si le traitement webhook échoue:

```typescript
// Future PR: Webhook retry queue
await this.webhookQueue.add('process', { eventId, payload });
```

---

## 📋 Résumé

| Critère | Statut | Détail |
|---------|--------|--------|
| Clés Stripe sécurisées | ✅ | Env vars, pas hardcoding |
| Escrow (capture manuelle) | ✅ | Fonds réservés jusqu'à completion |
| Webhook signature | ✅ | constructEvent vérifié |
| Idempotence | ✅ | Clés uniques par opération |
| Gestion erreurs | ✅ | Codes HTTP appropriés |
| Rate limiting | ✅ | 20 req/min sur payments |
| Guards protection | ✅ | JWT + Roles + Consent |

---

## 🎯 Risques éliminés

| Risque | Protection |
|--------|------------|
| Webhook spoofing | Signature vérifiée |
| Double capture | Idempotency key + status check |
| Fuite clés Stripe | Env vars uniquement |
| Paiement non autorisé | Guards + ownership check |
| Race conditions | Idempotency Stripe |

---

## ✅ Checklist de validation

- [x] STRIPE_SECRET_KEY via env var
- [x] STRIPE_WEBHOOK_SECRET via env var
- [x] Webhook signature vérifiée
- [x] Escrow (capture_method: manual)
- [x] Idempotency keys générées
- [x] Gestion erreurs robuste
- [x] Guards sur tous les endpoints paiement
- [x] Rate limiting configuré
- [x] Build OK
- [x] Tests OK
- [x] Pas de régression

---

## 🚀 Impact business

| Aspect | Impact |
|--------|--------|
| Production | ✅ Flux escrow fonctionnel |
| Sécurité | ✅ Aucun risque de fuite |
| Compliance | ✅ PCI DSS via Stripe |
| Scalabilité | ⚠️ Stripe Connect recommandé pour scale |

---

_Audit réalisé le 2026-01-19_

