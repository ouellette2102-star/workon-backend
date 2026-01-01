# Definition of Done (DoD) — WorkOn Store-Ready Checklist

> **Version**: 1.0.0  
> **Date**: 2026-01-01  
> **Purpose**: Gate obligatoire avant toute release production / app store

---

## 🎯 Objectif

Ce document définit les critères **OBLIGATOIRES** pour déclarer une release "prête".  
Aucune release ne peut être publiée si cette checklist n'est pas 100% verte.

---

## ✅ CHECKLIST PRINCIPALE

### 1. Build & Compilation

| Critère | Backend | Frontend | Check |
|---------|---------|----------|-------|
| Build clean (0 errors) | `npm run build` | `flutter build` | ⬜ |
| Lint clean (0 blocking errors) | `npm run lint` | `flutter analyze` | ⬜ |
| Tests passent | `npm test` | `flutter test` | ⬜ |
| Aucun warning critique | Warnings non-bloquants OK | Warnings non-bloquants OK | ⬜ |

### 2. Endpoints API Requis (Contract Check)

| Endpoint | Méthode | Auth | Statut | Notes |
|----------|---------|------|--------|-------|
| `/healthz` | GET | ❌ | ⬜ | Liveness probe |
| `/readyz` | GET | ❌ | ⬜ | Readiness probe |
| `/api/v1/auth/register` | POST | ❌ | ⬜ | Registration |
| `/api/v1/auth/login` | POST | ❌ | ⬜ | Login |
| `/api/v1/auth/refresh` | POST | ❌ | ⬜ | Token refresh |
| `/api/v1/auth/me` | GET | ✅ | ⬜ | Current user |
| `/api/v1/auth/account` | DELETE | ✅ | ⬜ | GDPR delete |
| `/api/v1/auth/change-email` | POST | ✅ | ⏳ | **PR-B2** (optional) |
| `/api/v1/auth/verify-email-otp` | POST | ✅ | ⏳ | **PR-B2** (optional) |
| `/api/v1/profile` | GET | ✅ | ⬜ | Profile |
| `/api/v1/missions` | GET | ✅ | ⬜ | Missions list |
| `/api/v1/payments/checkout` | POST | ✅ | ⬜ | Stripe Checkout |
| `/api/v1/payments/invoice/:id` | GET | ✅ | ⬜ | Invoice details |
| `/api/v1/payments-local/intent` | POST | ✅ | ⬜ | PaymentIntent |

**Note**: ⏳ = Pending future PR (optional for current release)

**Vérification automatique**: `npm run smoke:contracts`

### 3. Flows E2E Critiques

#### 3.1 Auth Flow
- ⬜ Signup → reçoit tokens + user
- ⬜ Login → reçoit tokens + user  
- ⬜ Refresh token → nouveau access token
- ⬜ Logout → token invalidé

#### 3.2 Change Email Flow (OTP) — ⏳ PR-B2 (Optional)
> **Note**: Ces endpoints sont planifiés pour PR-B2. Ils ne bloquent pas la release actuelle.

- ⏳ POST /auth/change-email → 200 + OTP envoyé
- ⏳ POST /auth/verify-email-otp (code correct) → 200 + email mis à jour
- ⏳ POST /auth/verify-email-otp (code incorrect) → 400 OTP_INVALID
- ⏳ POST /auth/verify-email-otp (expiré) → 400 OTP_EXPIRED
- ⏳ POST /auth/verify-email-otp (5 erreurs) → 400 OTP_LOCKED

#### 3.3 Delete Account Flow
- ⬜ DELETE /auth/account (sans confirm) → 400 CONFIRM_REQUIRED
- ⬜ DELETE /auth/account (confirm:DELETE) → 200 + user anonymisé
- ⬜ Login après delete → 401 (user n'existe plus)

#### 3.4 Stripe Payment Flow (si activé)
- ⬜ Créer PaymentIntent → clientSecret reçu
- ⬜ Confirmer paiement (carte test 4242) → succeeded
- ⬜ Webhook payment_intent.succeeded → mission status = PAID
- ⬜ Mission refresh → affiche "Payé"

### 4. Configuration & Secrets

| Variable | Environnement | Check |
|----------|---------------|-------|
| `DATABASE_URL` | Railway | ⬜ |
| `JWT_SECRET` | Railway (32+ chars) | ⬜ |
| `JWT_REFRESH_SECRET` | Railway (32+ chars) | ⬜ |
| `NODE_ENV=production` | Railway | ⬜ |
| `STRIPE_SECRET_KEY` | Railway | ⬜ |
| `STRIPE_WEBHOOK_SECRET` | Railway | ⬜ |
| `RESEND_API_KEY` | Railway (si emails) | ⬜ |
| `OTP_SECRET` | Railway (32+ chars) | ⬜ |

**Vérification**: `npm run check:env`

### 5. Logs & Audit

- ⬜ Logs Railway sans erreurs critiques au démarrage
- ⬜ X-Request-ID présent dans les réponses HTTP
- ⬜ Aucun secret/token visible dans les logs
- ⬜ Rate limiting actif (headers X-RateLimit-*)

### 6. Rollback Plan

| Étape | Commande |
|-------|----------|
| Identifier commit | `git log --oneline -5` |
| Revert | `git revert <SHA>` |
| Push | `git push origin main` |
| Vérifier Railway | Deployment automatique |
| Alternative | Railway Dashboard → Rollback to previous deploy |

---

## 🚀 COMMANDES SMOKE TESTS

### Local (Windows PowerShell)

```powershell
# Backend
cd backend
npm run smoke:local

# Smoke complet (avec API running)
npm run smoke:all
```

### CI (GitHub Actions)

```bash
npm run smoke:ci
```

### Contract Check

```bash
# Vérifie que tous les endpoints requis existent
npm run smoke:contracts
```

---

## 📊 INTERPRÉTATION DES RÉSULTATS

### ✅ PASS

```
✅ All contract checks passed (12/12)
✅ Health checks OK
✅ Auth flow validated
✅ Ready for release
```

### ❌ FAIL

```
❌ Contract check failed:
   - Missing endpoint: POST /auth/verify-email-otp
   - Missing endpoint: DELETE /auth/account
   
ACTION: Fix missing endpoints before release
```

---

## 🔄 PROCESSUS DE RELEASE

```
1. Developer: Complete feature/fix
2. PR: Create pull request
3. CI: Automatic checks (lint, build, test, contracts)
4. Review: Code review required
5. Merge: Squash & merge to main
6. Deploy: Railway auto-deploy
7. Verify: Run smoke tests on prod
8. Done: Mark release as complete
```

---

## 📝 NOTES

- Cette checklist est **OBLIGATOIRE** - aucune exception
- Si un critère ne peut pas être vérifié, il doit être documenté et approuvé par le CTO
- Les smoke tests peuvent être exécutés manuellement si CI n'est pas disponible
- Le rollback doit être testé au moins une fois par release majeure

---

*Dernière mise à jour: 2026-01-01*

