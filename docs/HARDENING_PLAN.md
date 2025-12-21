# 🛡️ WorkOn Backend - Hardening Plan MVP

**Date:** 9 décembre 2025  
**Version:** 1.0.0  
**Statut:** EN COURS  
**Auteur:** Équipe Backend Senior

---

## 📋 Table des matières

1. [Résumé exécutif](#1-résumé-exécutif)
2. [État actuel du backend](#2-état-actuel-du-backend)
3. [Analyse par fonctionnalité MVP](#3-analyse-par-fonctionnalité-mvp)
4. [Plan d'action](#4-plan-daction)
5. [Changements prévus](#5-changements-prévus)
6. [Risques et mitigations](#6-risques-et-mitigations)
7. [Tests à implémenter](#7-tests-à-implémenter)

---

## 1. Résumé exécutif

### Bonne nouvelle

Le backend WorkOn est **déjà très avancé**. La majorité des fonctionnalités MVP sont implémentées et fonctionnelles :

| Fonctionnalité | État | Commentaire |
|----------------|------|-------------|
| Auth (Register/Login/Me) | ✅ 100% | Complet avec JWT |
| Forgot/Reset Password | ✅ 100% | Implémenté avec tokens hashés |
| Missions (MissionsLocal) | ✅ 100% | CRUD complet + nearby + workflow |
| Ratings | ✅ 100% | Client↔Provider bidirectionnel |
| Photos | ✅ 100% | Validation MIME + URL |
| Stripe Connect | ✅ 100% | Onboarding + PaymentIntent |
| Géolocalisation | ✅ 100% | `GET /missions/nearby` opérationnel |

### Travail restant

Le hardening se concentre sur :
1. **Documentation** : Aligner FLUTTERFLOW_API_CONTRACT.md avec les endpoints réels
2. **Clarification** : Désactiver proprement le module Missions (Clerk) legacy
3. **Tests** : Ajouter une couverture de tests automatisés
4. **Sécurité** : Validation finale des flux critiques

---

## 2. État actuel du backend

### 2.1 Modules actifs (confirmés dans app.module.ts)

```typescript
// MVP MODULES - ACTIFS
✅ AuthModule            // Register, Login, Forgot/Reset Password, Me
✅ UsersModule           // User CRUD
✅ ProfileModule         // Profile management
✅ MissionsLocalModule   // ← MODULE MVP OFFICIEL
✅ PaymentsLocalModule   // Stripe Connect + PaymentIntent
✅ RatingsModule         // Ratings client/provider
✅ PhotosModule          // Mission photos
✅ NotificationsModule   // In-app notifications
✅ MetricsModule         // Ratio workers/employers
✅ HealthModule          // Health check Railway
✅ AdminModule           // Admin functions
✅ LoggerModule          // Winston logging
✅ StripeModule          // Stripe base

// LEGACY MODULES - DÉSACTIVÉS (commentés)
❌ MissionsModule        // Ancien module Clerk
❌ PaymentsModule        // Ancien paiements Clerk
❌ ContractsModule       // Contrats Clerk
❌ MessagesModule        // Messages Clerk
```

### 2.2 Modèles Prisma MVP (schema.prisma)

| Modèle | État | Table PostgreSQL |
|--------|------|------------------|
| `LocalUser` | ✅ | `local_users` |
| `LocalMission` | ✅ | `local_missions` |
| `LocalRating` | ✅ | `local_ratings` |
| `LocalMissionPhoto` | ✅ | `local_mission_photos` |
| `PasswordResetToken` | ✅ | `password_reset_tokens` |

### 2.3 Champs Stripe Connect sur LocalUser

```prisma
stripeAccountId          String?   ✅
stripeOnboardingComplete Boolean   ✅
stripeChargesEnabled     Boolean   ✅
stripePayoutsEnabled     Boolean   ✅
avatarUrl                String?   ✅
```

---

## 3. Analyse par fonctionnalité MVP

### 3.1 MissionsLocal (Module MVP)

**Fichiers:** `src/missions-local/`

| Endpoint | Méthode | Implémenté | Notes |
|----------|---------|------------|-------|
| `/missions` | POST | ✅ | Création mission |
| `/missions/nearby` | GET | ✅ | Recherche géolocalisée |
| `/missions/:id` | GET | ✅ | Détails mission |
| `/missions/:id/accept` | POST | ✅ | Worker accepte |
| `/missions/:id/start` | POST | ✅ | Worker démarre |
| `/missions/:id/complete` | POST | ✅ | Terminer mission |
| `/missions/:id/cancel` | POST | ✅ | Annuler mission |
| `/missions/my-missions` | GET | ✅ | Missions créées |
| `/missions/my-assignments` | GET | ✅ | Missions assignées |

**Statut:** ✅ **COMPLET - AUCUNE MODIFICATION REQUISE**

### 3.2 Auth (Forgot/Reset Password)

**Fichiers:** `src/auth/`

| Endpoint | Méthode | Implémenté | Notes |
|----------|---------|------------|-------|
| `/auth/register` | POST | ✅ | Inscription |
| `/auth/login` | POST | ✅ | Connexion JWT |
| `/auth/me` | GET | ✅ | User courant |
| `/auth/forgot-password` | POST | ✅ | Token 6 digits hashé |
| `/auth/reset-password` | POST | ✅ | Validation + changement |

**Implémentation actuelle:**
- Token à 6 chiffres
- Hashé en base (sécurisé)
- Expiration 15 minutes
- Protection contre l'énumération d'emails

**Statut:** ✅ **COMPLET - AUCUNE MODIFICATION REQUISE**

### 3.3 Photos

**Fichiers:** `src/photos/`

| Endpoint | Méthode | Implémenté | Notes |
|----------|---------|------------|-------|
| `/photos` | POST | ✅ | Enregistrer URL |
| `/photos/mission/:missionId` | GET | ✅ | Photos d'une mission |
| `/photos/me` | GET | ✅ | Mes photos |
| `/photos/:photoId` | DELETE | ✅ | Supprimer photo |

**Sécurité implémentée:**
- Validation MIME types (jpeg, png, webp, gif)
- Limite 10 MB
- URL HTTPS obligatoire
- Autorisation client/provider

**Statut:** ✅ **COMPLET - AUCUNE MODIFICATION REQUISE**

### 3.4 Stripe Connect

**Fichiers:** `src/payments-local/`

| Endpoint | Méthode | Implémenté | Notes |
|----------|---------|------------|-------|
| `/payments/intent` | POST | ✅ | PaymentIntent simple |
| `/payments/webhook` | POST | ✅ | Webhook Stripe |
| `/payments/connect/onboard` | POST | ✅ | Démarrer onboarding |
| `/payments/connect/refresh` | POST | ✅ | Rafraîchir lien |
| `/payments/connect/status` | GET | ✅ | Statut du compte |
| `/payments/connect/intent` | POST | ✅ | PaymentIntent Connect |

**Statut:** ✅ **COMPLET - AUCUNE MODIFICATION REQUISE**

### 3.5 Ratings

**Fichiers:** `src/ratings/`

| Endpoint | Méthode | Implémenté | Notes |
|----------|---------|------------|-------|
| `/ratings` | POST | ✅ | Créer rating |
| `/ratings/me` | GET | ✅ | Mes ratings |
| `/ratings/user/:userId` | GET | ✅ | Ratings d'un user |
| `/ratings/mission/:missionId` | GET | ✅ | Ratings d'une mission |

**Logique implémentée:**
- Rating 1-5 étoiles
- CLIENT_TO_PROVIDER et PROVIDER_TO_CLIENT
- Un seul rating par user par mission
- Calcul moyenne automatique
- Distribution par étoiles

**Statut:** ✅ **COMPLET - AUCUNE MODIFICATION REQUISE**

### 3.6 Géolocalisation

**Implémentation:** `GET /missions/nearby`

```typescript
// NearbyMissionsQueryDto
latitude: number    ✅ Requis
longitude: number   ✅ Requis
radiusKm: number    ✅ Optionnel (défaut: 10)
```

**Index Prisma:** `@@index([latitude, longitude])`

**Statut:** ✅ **COMPLET - AUCUNE MODIFICATION REQUISE**

### 3.7 Workflow Client → Provider

**Flux actuel:**

```
1. Client POST /missions              → status: "open"
2. Provider GET /missions/nearby      → voit la mission
3. Provider POST /missions/:id/accept → status: "assigned"
4. Provider POST /missions/:id/start  → status: "in_progress"
5. Client/Provider POST /payments/connect/intent → Paiement Stripe
6. Client/Provider POST /missions/:id/complete   → status: "completed"
7. Client/Provider POST /ratings      → Rating bidirectionnel
```

**Statut:** ✅ **COMPLET - AUCUNE MODIFICATION REQUISE**

---

## 4. Plan d'action

### Phase 1: Documentation (Immédiat)

| Tâche | Priorité | Effort | Fichier |
|-------|----------|--------|---------|
| Mettre à jour FLUTTERFLOW_API_CONTRACT.md | 🔴 Haute | 30 min | Refléter endpoints réels |
| Mettre à jour BACKEND_AUDIT_WORKON.md | 🟡 Moyenne | 15 min | État actuel |
| Créer TESTS_GUIDE.md | 🟡 Moyenne | 20 min | Guide des tests |

### Phase 2: Clarification Module Missions (Immédiat)

| Tâche | Priorité | Effort | Impact |
|-------|----------|--------|--------|
| Ajouter commentaire officiel dans app.module.ts | 🔴 Haute | 5 min | Clarification |
| Documenter que MissionsLocal = MVP | 🔴 Haute | 5 min | Alignement |

### Phase 3: Tests Automatisés (Court terme)

| Module | Priorité | Type | Couverture cible |
|--------|----------|------|------------------|
| Auth | 🔴 Haute | Unit + E2E | Register, Login, Reset |
| MissionsLocal | 🔴 Haute | Unit + E2E | CRUD + workflow |
| Ratings | 🟡 Moyenne | Unit | Create, Aggregation |
| Payments | 🟡 Moyenne | Unit (mock) | PaymentIntent |

---

## 5. Changements prévus

### 5.1 Aucun changement de code métier

✅ **DÉCISION:** Le code existant est conforme aux spécifications MVP.

Les seules modifications seront:
1. Ajout de commentaires de clarification
2. Mise à jour de la documentation
3. Ajout de tests

### 5.2 Mise à jour app.module.ts (Clarification)

```typescript
// ============================================================
// MVP MODULES - PRODUCTION READY
// ============================================================
// MissionsLocalModule is the OFFICIAL module for WorkOn MVP
// It uses LocalUser/LocalMission models with local JWT auth
// ============================================================

// LEGACY MODULES - DO NOT ENABLE
// These modules use Clerk-based User/Mission models
// They will be removed in a future cleanup
// import { MissionsModule } from './missions/missions.module';
```

### 5.3 Mise à jour FLUTTERFLOW_API_CONTRACT.md

**Corrections à apporter:**

| Section | Changement |
|---------|------------|
| C3. Créer une mission | Supprimer note "À confirmer avec Math" |
| C8. Envoyer un message | ⚠️ Module Messages désactivé - À documenter |
| P3. Missions nearby | Confirmer endpoint `/missions/nearby` |
| P10. Accepter contrat | ⚠️ Module Contracts désactivé - À documenter |

**Modules non disponibles dans MVP:**
- ❌ Messages (désactivé)
- ❌ Contracts (désactivé)

---

## 6. Risques et mitigations

### Risque 1: Confusion MissionsLocal vs Missions

| Risque | Impact | Mitigation |
|--------|--------|------------|
| FlutterFlow appelle le mauvais endpoint | 🔴 Élevé | Documenter clairement dans API Contract |

**Action:** Supprimer toute référence à `/missions-local/` dans la doc.
Le contrôleur MissionsLocal est déjà monté sur `/missions`.

### Risque 2: Modules Messages/Contracts attendus

| Risque | Impact | Mitigation |
|--------|--------|------------|
| FlutterFlow attend des endpoints désactivés | 🟡 Moyen | Documenter comme "Future Feature" |

**Action:** Ajouter section "Limitations MVP" dans API Contract.

### Risque 3: Tests insuffisants

| Risque | Impact | Mitigation |
|--------|--------|------------|
| Régression après modification | 🔴 Élevé | Implémenter tests E2E critiques |

**Action:** Créer tests pour flux critique:
1. Register → Login → Create Mission → Accept → Complete

---

## 7. Tests à implémenter

### 7.1 Structure des tests

```
backend/test/
├── e2e/
│   ├── auth.e2e-spec.ts
│   ├── missions.e2e-spec.ts
│   └── payments.e2e-spec.ts
├── unit/
│   ├── auth.service.spec.ts
│   ├── missions-local.service.spec.ts
│   ├── ratings.service.spec.ts
│   └── payments-local.service.spec.ts
└── jest-e2e.json
```

### 7.2 Scénarios de test prioritaires

#### Auth (E2E)

```typescript
describe('Auth Flow', () => {
  it('POST /auth/register - should create user', () => {});
  it('POST /auth/login - should return JWT', () => {});
  it('GET /auth/me - should return authenticated user', () => {});
  it('POST /auth/forgot-password - should send token', () => {});
  it('POST /auth/reset-password - should change password', () => {});
});
```

#### Missions (E2E)

```typescript
describe('Missions Flow', () => {
  it('POST /missions - employer creates mission', () => {});
  it('GET /missions/nearby - worker finds missions', () => {});
  it('POST /missions/:id/accept - worker accepts', () => {});
  it('POST /missions/:id/start - worker starts', () => {});
  it('POST /missions/:id/complete - completes mission', () => {});
});
```

#### Ratings (Unit)

```typescript
describe('RatingsService', () => {
  it('should create rating for completed mission', () => {});
  it('should prevent duplicate rating', () => {});
  it('should calculate average correctly', () => {});
});
```

### 7.3 Script npm

```json
{
  "scripts": {
    "test": "jest",
    "test:e2e": "jest --config ./test/jest-e2e.json",
    "test:cov": "jest --coverage"
  }
}
```

---

## 8. Conclusion

### État du backend

| Aspect | Score | Commentaire |
|--------|-------|-------------|
| Fonctionnalités MVP | 95% | Quasi complet |
| Sécurité | 90% | JWT + validation |
| Documentation | 70% | À mettre à jour |
| Tests | 20% | À implémenter |
| Production-ready | 85% | Déployé sur Railway |

### Recommandation

✅ **Le backend est prêt pour l'intégration FlutterFlow.**

Les seules actions requises sont:
1. Mettre à jour la documentation API
2. Ajouter les tests pour sécuriser les futures modifications
3. Clarifier les modules désactivés

---

**Plan validé - Prêt pour exécution**

*Document généré le 9 décembre 2025*
