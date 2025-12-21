# 🔍 WorkOn Backend Audit Report

**Date:** 2 décembre 2025  
**Auditeur:** CTO Technique WorkOn  
**Version Backend:** 1.0.0  
**Environnement:** Production (Railway)

---

## 📋 Table des matières

1. [Vue d'ensemble de l'architecture](#1-vue-densemble-de-larchitecture)
2. [Inventaire des endpoints](#2-inventaire-des-endpoints)
3. [Analyse de stabilité par module](#3-analyse-de-stabilité-par-module)
4. [Risques identifiés](#4-risques-identifiés)
5. [Points à améliorer](#5-points-à-améliorer)
6. [TODO pour le futur](#6-todo-pour-le-futur)
7. [Questions à poser à Math](#7-questions-à-poser-à-math)

---

## 1. Vue d'ensemble de l'architecture

### Stack technique

| Composant | Technologie | Version |
|-----------|-------------|---------|
| Framework | NestJS | 10.2.7 |
| ORM | Prisma | 6.19.0 |
| Base de données | PostgreSQL | Railway |
| Auth | JWT (local) + Clerk (optionnel) | - |
| Paiements | Stripe | 17.7.0 |
| Logging | Winston | 3.11.0 |
| Monitoring | Sentry (optionnel) | 7.91.0 |
| Déploiement | Railway (Nixpacks) | - |

### Schéma d'architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT (FlutterFlow)                         │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    RAILWAY (Production)                              │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                   NestJS Backend                              │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │   │
│  │  │   Auth   │  │ Missions │  │ Messages │  │ Payments │     │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘     │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │   │
│  │  │Contracts │  │  Notifs  │  │ Profile  │  │ Metrics  │     │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘     │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                   │                                  │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                     PostgreSQL                                │   │
│  │   24 modèles Prisma | 16 enums                               │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
                         ┌─────────────────┐
                         │     Stripe      │
                         │   (Paiements)   │
                         └─────────────────┘
```

### Modules actifs

| Module | État | Fichiers | Description |
|--------|------|----------|-------------|
| `AuthModule` | ✅ Actif | 12 fichiers | Register, Login, JWT |
| `UsersModule` | ✅ Actif | 5 fichiers | Gestion utilisateurs |
| `ProfileModule` | ✅ Actif | 4 fichiers | Profil utilisateur |
| `MissionsModule` | ✅ Actif | 6 fichiers | Missions (schéma User/Clerk) |
| `MissionsLocalModule` | ✅ Actif | 6 fichiers | Missions (schéma LocalUser) |
| `MessagesModule` | ✅ Actif | 5 fichiers | Chat mission |
| `ContractsModule` | ✅ Actif | 5 fichiers | Contrats de travail |
| `NotificationsModule` | ✅ Actif | 4 fichiers | Notifications in-app |
| `PaymentsModule` | ✅ Actif | 5 fichiers | Paiements Stripe |
| `PaymentsLocalModule` | ✅ Actif | 5 fichiers | Paiements (alt) |
| `StripeModule` | ✅ Actif | 4 fichiers | Stripe Connect |
| `MetricsModule` | ✅ Actif | 4 fichiers | Métriques ratio |
| `AdminModule` | ✅ Actif | 3 fichiers | Admin (réconciliation) |
| `HealthModule` | ✅ Actif | 2 fichiers | Health check |

### Modules désactivés (exclus de la compilation)

| Module | Raison | Risque |
|--------|--------|--------|
| `MissionPhotosModule` | Modèle MissionPhoto absent | ⚠️ Fonctionnalité manquante |
| `MissionTimeLogsModule` | Modèle TimeLog absent | ⚠️ Fonctionnalité manquante |

---

## 2. Inventaire des endpoints

### Légende

- 🟢 **Stable** : Testé et fonctionnel
- 🟡 **À valider** : Fonctionne mais non testé en profondeur
- 🔴 **Risqué** : Peut échouer dans certains cas
- ⚪ **Désactivé** : Module non chargé

---

### 2.1 Endpoints Racine (sans préfixe /api/v1)

| Méthode | URL | Auth | État | Description |
|---------|-----|------|------|-------------|
| GET | `/` | ❌ | 🟢 | Message de bienvenue API |
| GET | `/healthz` | ❌ | 🟢 | Health check Railway |
| GET | `/metrics` | ❌ | 🟡 | Placeholder Prometheus |

---

### 2.2 Auth (`/api/v1/auth`)

| Méthode | URL | Auth | État | Body | Réponse |
|---------|-----|------|------|------|---------|
| POST | `/auth/register` | ❌ | 🟢 | `{ email, password, firstName, lastName, phone?, city?, role }` | `{ accessToken, user }` |
| POST | `/auth/login` | ❌ | 🟢 | `{ email, password }` | `{ accessToken, user }` |
| GET | `/auth/me` | ✅ | 🟢 | - | `UserResponseDto` |

**Notes:**
- Utilise `LocalAuthService` (email/password + JWT)
- Clerk désactivé par défaut (optionnel en prod)
- Rate limiting actif (20 req/min)

---

### 2.3 Users (`/api/v1/users`)

| Méthode | URL | Auth | État | Body | Réponse |
|---------|-----|------|------|------|---------|
| GET | `/users/me` | ✅ | 🟢 | - | `UserResponseDto` |
| PATCH | `/users/me` | ✅ | 🟢 | `{ firstName?, lastName?, phone?, city? }` | `UserResponseDto` |
| GET | `/users/:id` | ✅ | 🟡 | - | `UserResponseDto` |

**Notes:**
- `/users/:id` accessible à tous les utilisateurs authentifiés (pas de vérification d'accès)

---

### 2.4 Profile (`/api/v1/profile`)

| Méthode | URL | Auth | État | Body | Réponse |
|---------|-----|------|------|------|---------|
| GET | `/profile/me` | ✅ | 🟢 | - | `ProfileResponseDto` |
| PATCH | `/profile/me` | ✅ | 🟢 | `{ name?, phone?, city?, role? }` | `ProfileResponseDto` |

**Notes:**
- Gère `UserProfile` (différent de `User`)
- Changement de rôle possible via PATCH

---

### 2.5 Missions (`/api/v1/missions`)

#### 2.5.1 Endpoints MissionsLocalModule ⭐ MVP OFFICIEL

> ✅ **Ce module est le seul actif pour le MVP.** Il utilise `LocalUser` et `LocalMission`.

| Méthode | URL | Auth | Rôle | État | Body/Query | Réponse |
|---------|-----|------|------|------|------------|---------|
| POST | `/missions` | ✅ | EMPLOYER | 🟢 | `CreateMissionDto` | MissionResponseDto |
| GET | `/missions/nearby` | ✅ | WORKER | 🟢 | `?latitude,longitude,radiusKm` | MissionResponseDto[] |
| GET | `/missions/:id` | ✅ | Any | 🟢 | - | MissionResponseDto |
| POST | `/missions/:id/accept` | ✅ | WORKER | 🟢 | - | MissionResponseDto |
| POST | `/missions/:id/start` | ✅ | WORKER | 🟢 | - | MissionResponseDto |
| POST | `/missions/:id/complete` | ✅ | WORKER/EMPLOYER | 🟢 | - | MissionResponseDto |
| POST | `/missions/:id/cancel` | ✅ | EMPLOYER | 🟢 | - | MissionResponseDto |
| GET | `/missions/my-missions` | ✅ | EMPLOYER | 🟢 | - | MissionResponseDto[] |
| GET | `/missions/my-assignments` | ✅ | WORKER | 🟢 | - | MissionResponseDto[] |

**Notes:**
- Géolocalisation via `latitude`, `longitude` sur le modèle `LocalMission`
- Workflow: `open` → `assigned` → `in_progress` → `completed`

#### 2.5.2 Endpoints MissionsModule (modèle User/Clerk) - ❌ DÉSACTIVÉ

> ⚠️ **Ce module est commenté dans `app.module.ts`.** Il utilisait Clerk pour l'authentification.
> Ne pas activer pour le MVP - conflits de routes avec MissionsLocalModule.

| Méthode | URL | Auth | Rôle | État | Body/Query | Réponse |
|---------|-----|------|------|------|------------|---------|
| POST | `/missions` | ✅ | EMPLOYER | ⚪ Désactivé | `CreateMissionDto` | Mission |
| GET | `/missions/mine` | ✅ | EMPLOYER | ⚪ Désactivé | - | Mission[] |
| GET | `/missions/worker/mine` | ✅ | WORKER | ⚪ Désactivé | - | Mission[] |
| GET | `/missions/available` | ✅ | WORKER | ⚪ Désactivé | `?lat,lng,radius,category` | Mission[] |
| GET | `/missions/feed` | ✅ | WORKER | ⚪ Désactivé | `MissionFeedFiltersDto` | Mission[] |
| GET | `/missions/:id` | ✅ | Any | ⚪ Désactivé | - | Mission |
| POST | `/missions/:id/reserve` | ✅ | WORKER | ⚪ Désactivé | - | Mission |
| PATCH | `/missions/:id/status` | ✅ | EMPLOYER | ⚪ Désactivé | `{ status }` | Mission |

**✅ CONFLIT RÉSOLU:**
- `MissionsModule` est **désactivé** (commenté dans `app.module.ts`)
- Seul `MissionsLocalModule` est actif - pas de collision

---

### 2.6 Messages (`/api/v1/messages`) - ❌ DÉSACTIVÉ MVP

> ⚠️ **Ce module est commenté dans `app.module.ts`** pour le MVP.
> Utilise le modèle `Message` qui dépend de `User` (Clerk).
> Alternative MVP: utiliser les notifications.

| Méthode | URL | Auth | État | Body | Réponse |
|---------|-----|------|------|------|---------|
| POST | `/messages` | ✅ | ⚪ Désactivé | `{ missionId, content }` | Message |
| GET | `/messages/thread/:missionId` | ✅ | ⚪ Désactivé | - | Message[] |
| PATCH | `/messages/read/:missionId` | ✅ | ⚪ Désactivé | - | `{ count }` |
| GET | `/messages/unread-count` | ✅ | ⚪ Désactivé | - | `{ count }` |

---

### 2.7 Contracts (`/api/v1/contracts`) - ❌ DÉSACTIVÉ MVP

> ⚠️ **Ce module est commenté dans `app.module.ts`** pour le MVP.
> Utilise le modèle `Contract` qui dépend de `User` (Clerk).
> Alternative MVP: la mission fait office d'accord implicite.

| Méthode | URL | Auth | État | Body | Réponse |
|---------|-----|------|------|------|---------|
| POST | `/contracts` | ✅ | ⚪ Désactivé | `{ missionId, amount, hourlyRate?, startAt?, endAt? }` | Contract |
| GET | `/contracts/:id` | ✅ | ⚪ Désactivé | - | Contract |
| GET | `/contracts/user/me` | ✅ | ⚪ Désactivé | - | Contract[] |
| PATCH | `/contracts/:id/status` | ✅ | ⚪ Désactivé | `{ status }` | Contract |

---

### 2.8 Notifications (`/api/v1/notifications`)

| Méthode | URL | Auth | État | Body/Query | Réponse |
|---------|-----|------|------|------------|---------|
| GET | `/notifications` | ✅ | 🟢 | `?unreadOnly=true` | Notification[] |
| GET | `/notifications/unread-count` | ✅ | 🟢 | - | `{ count }` |
| PATCH | `/notifications/:id/read` | ✅ | 🟢 | - | `{ success }` |
| PATCH | `/notifications/read-all` | ✅ | 🟢 | - | `{ success }` |

---

### 2.9 Payments (`/api/v1/payments`)

#### 2.9.1 PaymentsLocalModule ⭐ MVP OFFICIEL

> ✅ **Ce module est le seul actif pour le MVP.** Il utilise `LocalMission` et Stripe Connect.

| Méthode | URL | Auth | Rôle | État | Body | Réponse |
|---------|-----|------|------|------|------|---------|
| POST | `/payments/intent` | ✅ | EMPLOYER | 🟢 | `{ missionId }` | PaymentIntentResponseDto |
| POST | `/payments/webhook` | ❌ | - | 🟢 | Raw Stripe Event | `{ received }` |
| POST | `/payments/connect/onboard` | ✅ | WORKER | 🟢 | - | `{ url, accountId }` |
| POST | `/payments/connect/refresh` | ✅ | WORKER | 🟢 | - | `{ url }` |
| GET | `/payments/connect/status` | ✅ | WORKER | 🟢 | - | Status object |
| POST | `/payments/connect/intent` | ✅ | EMPLOYER | 🟢 | `{ missionId }` | ConnectPaymentIntentDto |

**Notes:**
- Stripe Connect Standard pour les workers
- Webhook signe et valide les événements Stripe
- `connect/intent` transfère automatiquement au compte du worker

#### 2.9.2 PaymentsModule (Clerk) - ❌ DÉSACTIVÉ

> ⚠️ **Commenté dans `app.module.ts`.**

| Méthode | URL | Auth | Rôle | État | Body | Réponse |
|---------|-----|------|------|------|------|---------|
| POST | `/payments/create-intent` | ✅ | EMPLOYER | ⚪ Désactivé | `{ missionId, amount }` | PaymentIntent |

#### 2.9.3 StripeModule (Support)

> Module utilitaire pour Stripe. Les endpoints sont définis dans PaymentsLocalModule.

**✅ CONFLIT RÉSOLU:**
- Seul `PaymentsLocalModule` définit les routes `/payments/*`
- `PaymentsModule` (Clerk) est désactivé
- Pas de collision de routes

---

### 2.10 Ratings (`/api/v1/ratings`) ⭐ MVP

> ✅ **Implémenté et actif.** Ratings bidirectionnels après mission complétée.

| Méthode | URL | Auth | Rôle | État | Body | Réponse |
|---------|-----|------|------|------|------|---------|
| POST | `/ratings` | ✅ | Any | 🟢 | `{ missionId, rating, comment? }` | Rating |
| GET | `/ratings/me` | ✅ | Any | 🟢 | - | `{ summary, given[], received[] }` |
| GET | `/ratings/user/:userId` | ✅ | Any | 🟢 | - | `{ user, summary, ratings[] }` |
| GET | `/ratings/mission/:missionId` | ✅ | Any | 🟢 | - | `{ clientRating, providerRating }` |

**Notes:**
- Type automatique: `CLIENT_TO_PROVIDER` ou `PROVIDER_TO_CLIENT`
- Un seul rating par utilisateur par mission
- Calcul automatique de la moyenne et distribution

---

### 2.11 Photos (`/api/v1/photos`) ⭐ MVP

> ✅ **Implémenté et actif.** Enregistrement d'URLs de photos (upload via Supabase/Firebase).

| Méthode | URL | Auth | Rôle | État | Body | Réponse |
|---------|-----|------|------|------|------|---------|
| POST | `/photos` | ✅ | Any | 🟢 | `{ missionId, url, mimeType, sizeBytes, thumbnailUrl?, description? }` | Photo |
| GET | `/photos/mission/:missionId` | ✅ | Any | 🟢 | - | `{ mission, photos[], totalCount }` |
| GET | `/photos/me` | ✅ | Any | 🟢 | - | `{ photos[], totalCount }` |
| DELETE | `/photos/:photoId` | ✅ | Any | 🟢 | - | `{ success, deletedId }` |

**Notes:**
- Validation: MIME types (jpeg, png, webp, gif), max 10 MB, URL HTTPS
- Upload géré par FlutterFlow → Supabase, puis enregistrement URL via backend
- Seul le client/provider de la mission peut ajouter des photos

---

### 2.12 Metrics (`/api/v1/metrics`)

| Méthode | URL | Auth | État | Query | Réponse |
|---------|-----|------|------|-------|---------|
| GET | `/metrics/ratio` | ❌ | 🟢 | `?region=Montréal` | `{ workers, employers, ratio, region }` |
| GET | `/metrics/regions` | ❌ | 🟢 | - | `string[]` |

**Notes:**
- Endpoints publics (pas d'auth)
- Utilisé pour afficher les métriques sur le landing/dashboard

---

### 2.11 Admin (`/api/v1/admin`)

| Méthode | URL | Auth | Rôle | État | Body | Réponse |
|---------|-----|------|------|------|------|---------|
| POST | `/admin/reconcile-payments` | ✅ | ADMIN | 🔴 | - | Result |

**Notes:**
- Endpoint sensible, réservé aux admins
- Non testé en production

---

### 2.12 Health (`/api/v1/health`)

| Méthode | URL | Auth | État | Réponse |
|---------|-----|------|------|---------|
| GET | `/health` | ❌ | 🟢 | `{ status, timestamp, env, uptime }` |

---

### 2.13 Modules DÉSACTIVÉS (non compilés)

#### Mission Photos (exclu)

| Méthode | URL | Auth | État | Description |
|---------|-----|------|------|-------------|
| GET | `/missions/:missionId/photos` | ✅ | ⚪ | Liste photos |
| POST | `/missions/:missionId/photos` | ✅ | ⚪ | Upload photo |
| DELETE | `/missions/:missionId/photos/:photoId` | ✅ | ⚪ | Supprimer photo |

#### Mission Time Logs (exclu)

| Méthode | URL | Auth | État | Description |
|---------|-----|------|------|-------------|
| GET | `/missions/:missionId/time-logs` | ✅ | ⚪ | Liste logs temps |
| POST | `/missions/:missionId/time-logs/check-in` | ✅ | ⚪ | Check-in |
| POST | `/missions/:missionId/time-logs/check-out` | ✅ | ⚪ | Check-out |

---

## 3. Analyse de stabilité par module (Mise à jour 9 décembre 2025)

### 3.1 Modules stables (MVP-ready) ✅

| Module | Confiance | Raison |
|--------|-----------|--------|
| `Auth` | 🟢 95% | Testé sur Railway, register/login/forgot-password fonctionnels |
| `MissionsLocal` | 🟢 90% | Module principal MVP, workflow complet |
| `PaymentsLocal` | 🟢 85% | Stripe Connect Standard implémenté |
| `Ratings` | 🟢 90% | Bidirectionnel, calcul moyenne |
| `Photos` | 🟢 90% | Validation MIME, intégration Supabase |
| `Health` | 🟢 100% | Endpoint simple, utilisé par Railway |
| `Notifications` | 🟢 80% | Fonctionne avec LocalUser |
| `Metrics` | 🟢 85% | Simple, endpoints publics |

### 3.2 Modules support

| Module | Confiance | Notes |
|--------|-----------|-------|
| `Profile` | 🟡 70% | Dépend de UserProfile, peut être simplifié |
| `Users` | 🟡 75% | Fonctionne, mais `/users/:id` sans contrôle d'accès |
| `Admin` | 🟡 50% | Réconciliation non testée en prod |

### 3.3 Modules désactivés pour MVP ❌

| Module | Raison | Alternative |
|--------|--------|-------------|
| `Missions` (Clerk) | Conflits avec MissionsLocal | Utiliser MissionsLocal |
| `Messages` | Dépend de User (Clerk) | Utiliser notifications |
| `Contracts` | Dépend de User (Clerk) | Mission = accord implicite |
| `Payments` (Clerk) | Doublon avec PaymentsLocal | Utiliser PaymentsLocal |
| `MissionPhotos` | Ancien module | Utiliser PhotosModule |
| `MissionTimeLogs` | Modèle absent | Feature future |

---

## 4. Risques identifiés

### 🔴 CRITIQUE

#### R1: Conflit de routes `/missions`

**Problème:** Deux modules (`MissionsModule` et `MissionsLocalModule`) définissent des routes sur `/missions`.

**Impact:** Comportement imprévisible, une route peut masquer l'autre.

**Fichiers concernés:**
- `src/missions/missions.controller.ts`
- `src/missions-local/missions-local.controller.ts`

**Recommandation:** 
- DÉCIDER quel module utiliser pour le MVP
- Désactiver l'autre ou le renommer (`/missions-v2` ou `/local-missions`)

---

#### R2: Triple définition des endpoints Payments

**Problème:** 3 modules définissent des routes sur `/payments`:
- `PaymentsModule` → `/payments/create-intent`
- `PaymentsLocalModule` → `/payments/intent`, `/payments/webhook`
- `StripeModule` → `/payments/connect/*`, `/payments/create-intent`, `/payments/webhook`

**Impact:** Conflits de routes, comportement imprévisible.

**Recommandation:**
- Fusionner en un seul module `PaymentsModule`
- Ou préfixer: `/payments`, `/payments-local`, `/stripe`

---

### 🟡 IMPORTANT

#### R3: Pas de vérification d'accès sur `/users/:id`

**Problème:** N'importe quel utilisateur authentifié peut voir le profil d'un autre.

**Impact:** Fuite de données personnelles.

**Fichier:** `src/users/users.controller.ts`

**Recommandation:** Ajouter une vérification: admin OU self uniquement.

---

#### R4: UserProfile non créé automatiquement

**Problème:** Le modèle `UserProfile` n'est pas créé lors du register.

**Impact:** `/profile/me` peut retourner 404.

**Fichier:** `src/auth/local-auth.service.ts`

**Recommandation:** Créer automatiquement un `UserProfile` minimal lors du register.

---

#### R5: Stripe Connect non testé

**Problème:** Les endpoints `/payments/connect/onboarding` et `/payments/connect/status` n'ont pas été testés.

**Impact:** Onboarding des workers sur Stripe peut échouer.

**Recommandation:** Tester manuellement ou marquer comme "beta".

---

### ⚠️ MINEUR

#### R6: Rate limiting potentiellement trop strict

**Problème:** 20 requêtes par minute peut bloquer les utilisateurs légitimes.

**Impact:** UX dégradée sur l'app mobile.

**Fichier:** `src/app.module.ts` (ThrottlerModule)

**Recommandation:** Augmenter à 60-100 req/min ou exclure certaines routes.

---

#### R7: Swagger désactivé par défaut en production

**Problème:** Nécessite `ENABLE_SWAGGER_PROD=true` pour accéder à `/api/docs`.

**Impact:** Difficile de tester en production.

**Fichier:** `src/main.ts`

**Recommandation:** Activer pour le moment (FlutterFlow a besoin de tester).

---

## 5. Points à améliorer

### 5.1 Court terme (avant lancement)

| Priorité | Amélioration | Effort |
|----------|--------------|--------|
| 🔴 P0 | Résoudre conflit routes `/missions` | 2h |
| 🔴 P0 | Unifier modules Payments | 4h |
| 🟡 P1 | Ajouter contrôle d'accès `/users/:id` | 1h |
| 🟡 P1 | Créer UserProfile au register | 2h |
| 🟡 P1 | Documenter les endpoints dans Swagger | 3h |

### 5.2 Moyen terme

| Priorité | Amélioration | Effort |
|----------|--------------|--------|
| 🟡 P2 | Tests unitaires services critiques | 8h |
| 🟡 P2 | Ajouter pagination aux listes | 4h |
| 🟡 P2 | Ajouter filtres aux recherches missions | 3h |
| ⚪ P3 | Activer MissionPhotos | 6h |
| ⚪ P3 | Activer MissionTimeLogs | 6h |

### 5.3 Long terme

| Priorité | Amélioration | Effort |
|----------|--------------|--------|
| ⚪ P3 | Système de reviews/ratings | 12h |
| ⚪ P3 | Système de matching intelligent | 20h |
| ⚪ P3 | Notifications push (Firebase) | 8h |
| ⚪ P3 | Websockets pour chat temps réel | 12h |

---

## 6. TODO pour le futur

### 6.1 Fonctionnalités à implémenter

- [ ] **Reviews:** Permettre aux employeurs et workers de s'évaluer
- [ ] **Favoris:** Workers peuvent sauvegarder des employeurs favoris
- [ ] **Disponibilités:** Workers peuvent définir leurs créneaux
- [ ] **Catégories:** Filtrer missions par catégorie de travail
- [ ] **Géolocalisation:** Améliorer le calcul de distance
- [ ] **Notifications push:** Intégration Firebase Cloud Messaging

### 6.2 Sécurité à renforcer

- [ ] **Audit logging:** Logger toutes les actions sensibles
- [ ] **2FA:** Authentification à deux facteurs (optionnel)
- [ ] **Refresh tokens:** Implémenter le renouvellement de token
- [ ] **Password reset:** Endpoint de réinitialisation de mot de passe
- [ ] **Email verification:** Vérifier les emails à l'inscription

### 6.3 Performance à optimiser

- [ ] **Cache Redis:** Pour les requêtes fréquentes
- [ ] **Indexes Prisma:** Optimiser les requêtes lentes
- [ ] **Compression:** Activer gzip sur les réponses
- [ ] **CDN:** Pour les assets statiques (photos)

---

## 7. Questions à poser à Math

### Architecture

1. **MissionsModule vs MissionsLocalModule:** Lequel utiliser pour le MVP FlutterFlow?
   - `MissionsModule` utilise le modèle `User` (Clerk)
   - `MissionsLocalModule` utilise le modèle `LocalUser` (email/password)
   - **Recommandation:** Garder uniquement `MissionsLocalModule` pour cohérence avec `LocalAuthService`

2. **PaymentsModule vs StripeModule:** Quel module garder?
   - Les deux définissent des routes similaires
   - **Recommandation:** Unifier dans `StripeModule` uniquement

### Business

3. **Stripe Connect:** Est-ce une priorité MVP?
   - L'onboarding workers nécessite un compte Stripe Connect
   - Si non, on peut simplifier en utilisant uniquement les PaymentIntents

4. **Contrats:** Faut-il un workflow complet (signatures, PDF)?
   - Actuellement: statuts simples (DRAFT → ACCEPTED)
   - Si oui: prévoir génération PDF + e-signature

5. **Photos de mission:** Priorité?
   - Module désactivé, modèle Prisma absent
   - Si prioritaire: prévoir stockage (S3, Cloudinary)

### FlutterFlow

6. **Auth Clerk vs Local:** FlutterFlow utilise quelle méthode?
   - Si Clerk: réactiver ClerkAuthService
   - Si email/password: continuer avec LocalAuthService (actuel)

7. **Endpoints prioritaires:** Quels écrans FlutterFlow sont prêts?
   - Pour prioriser les tests API

---

## Annexe A: Modèles Prisma

### Modèles principaux (24)

| Modèle | Table | Relations | Utilisé par |
|--------|-------|-----------|-------------|
| `User` | users | UserProfile, WorkerProfile, Missions | Auth, Users |
| `LocalUser` | local_users | LocalMission | MissionsLocal |
| `UserProfile` | user_profiles | User | Profile |
| `WorkerProfile` | worker_profiles | User, Skills, Missions | Missions |
| `Mission` | missions | User, Payments, Messages, Contract | Missions |
| `LocalMission` | local_missions | LocalUser | MissionsLocal |
| `Message` | messages | Mission, User | Messages |
| `Contract` | contracts | Mission, User | Contracts |
| `Notification` | notifications | User | Notifications |
| `Payment` | payments | Mission | Payments |
| `Offer` | offers | Mission, WorkerProfile | Missions |
| `Review` | reviews | User, Mission | (future) |
| `Category` | categories | Skills, Missions | (future) |
| `Skill` | skills | Category, WorkerSkill | (future) |
| `WorkerSkill` | worker_skills | Skill, WorkerProfile | (future) |
| `Match` | matches | Mission, WorkerProfile | (future) |
| `Dispute` | disputes | Mission, User | (future) |
| `Subscription` | subscriptions | User | (future) |
| `ScheduleSlot` | schedule_slots | WorkerProfile | (future) |
| `Post` | posts | WorkerProfile | (future) |
| `PostLike` | post_likes | Post, User | (future) |
| `ClientOrg` | client_orgs | User, Missions | (future) |
| `ComplianceDocument` | compliance_documents | User | (future) |
| `AuditEvent` | audit_events | User | Admin |

### Enums (16)

| Enum | Valeurs | Utilisé par |
|------|---------|-------------|
| `UserRole` | WORKER, EMPLOYER, RESIDENTIAL, ADMIN | User, Auth |
| `LocalUserRole` | worker, employer, residential_client | LocalUser |
| `MissionStatus` | DRAFT, OPEN, MATCHED, IN_PROGRESS, COMPLETED, CANCELLED | Mission |
| `LocalMissionStatus` | open, assigned, in_progress, completed, cancelled | LocalMission |
| `ContractStatus` | DRAFT, PENDING, ACCEPTED, REJECTED, COMPLETED, CANCELLED | Contract |
| `MessageStatus` | SENT, DELIVERED, READ | Message |
| `MessageSenderRole` | WORKER, EMPLOYER | Message |
| `PaymentStatus` | REQUIRES_ACTION, SUCCEEDED, REFUNDED, DISPUTED | Payment |
| `OfferStatus` | PENDING, ACCEPTED, DECLINED | Offer |
| `DisputeStatus` | OPEN, IN_MEDIATION, RESOLVED, CLOSED | Dispute |
| `SubscriptionPlan` | FREE, PRO, PREMIUM | Subscription |
| `SubscriptionStatus` | ACTIVE, CANCELLED, EXPIRED | Subscription |
| `VerificationStatus` | PENDING, VERIFIED, REJECTED | ClientOrg |
| `ClientOrgType` | BUSINESS, RESIDENTIAL | ClientOrg |
| `ComplianceDocumentType` | TERMS, PRIVACY, CONTRACT, POLICY_LAW25 | ComplianceDocument |
| `ReviewModeration` | OK, FLAGGED | Review |

---

## Annexe B: Variables d'environnement

### Requises

| Variable | Description | Exemple |
|----------|-------------|---------|
| `DATABASE_URL` | URL PostgreSQL | `postgresql://user:pass@host:5432/db` |
| `NODE_ENV` | Environnement | `production` |
| `JWT_SECRET` | Secret JWT (prod) | `super-secret-32-chars-min` |

### Optionnelles

| Variable | Description | Défaut |
|----------|-------------|--------|
| `PORT` | Port serveur | 8080 |
| `API_PREFIX` | Préfixe API | `api/v1` |
| `CORS_ORIGIN` | Origines CORS | `*` |
| `STRIPE_SECRET_KEY` | Clé Stripe | - |
| `STRIPE_WEBHOOK_SECRET` | Secret webhook | - |
| `CLERK_SECRET_KEY` | Clé Clerk (optionnel) | - |
| `SENTRY_DSN` | DSN Sentry | - |
| `THROTTLE_LIMIT` | Limite rate | 20 |
| `LOG_LEVEL` | Niveau logs | `info` |
| `ENABLE_SWAGGER_PROD` | Activer Swagger prod | `false` |

---

**Fin de l'audit**

*Généré le 2 décembre 2025*  
*Backend version 1.0.0*  
*Railway deployment: workon-backend-production-8908*

