# 🎯 CHECKLIST INTÉGRATION FLUTTERFLOW - WORKON

**Date d'audit:** 31 janvier 2026  
**Backend:** WorkOn API v1.0 (Railway)  
**Frontend:** FlutterFlow + Template Sparkly  
**Base URL:** `https://workon-backend-production-8908.up.railway.app/api/v1`

---

## 📊 RÉSUMÉ DE L'AUDIT

### État du Backend: ✅ COMPLET ET FONCTIONNEL

| Module | Endpoints | État |
|--------|-----------|------|
| Auth (JWT) | 7 endpoints | ✅ Prêt |
| Users/Profile | 5 endpoints | ✅ Prêt |
| Missions | 10 endpoints | ✅ Prêt |
| Messages/Chat | 5 endpoints | ✅ Prêt |
| Offers | 7 endpoints | ✅ Prêt |
| Payments | 3 endpoints | ✅ Prêt |
| Stripe Connect | 4 endpoints | ✅ Prêt |
| Notifications | 4 endpoints | ✅ Prêt |
| Reviews/Ratings | 4 endpoints | ✅ Prêt |
| Compliance | 3 endpoints | ✅ Prêt |
| Devices (Push) | 3 endpoints | ✅ Prêt |
| Metrics | 3 endpoints | ✅ Prêt |

### Problème Identifié: ⚠️ CONFIGURATION FLUTTERFLOW

Le backend est **100% fonctionnel**. Le problème est dans la **configuration des API Calls FlutterFlow** et/ou la **connexion UI → API**.

---

# ✅ CHECKLIST EXÉCUTABLE

## PHASE 1: FONDATIONS (Critique - Faire en premier)

### 1.1 Variables App State FlutterFlow
> Ces variables DOIVENT exister dans FlutterFlow → App State

- [ ] `authToken` (String, Persisted: ✅) - Token JWT
- [ ] `refreshToken` (String, Persisted: ✅) - Refresh token
- [ ] `currentUserId` (String, Persisted: ✅) - ID utilisateur
- [ ] `currentUserEmail` (String, Persisted: ✅) - Email
- [ ] `currentUserRole` (String, Persisted: ✅) - **minuscules!** `worker`, `employer`, `residential_client`
- [ ] `currentUserFirstName` (String, Persisted: ✅) - Prénom
- [ ] `currentUserLastName` (String, Persisted: ✅) - Nom
- [ ] `currentUserPictureUrl` (String, Persisted: ✅) - Photo profil
- [ ] `consentComplete` (Boolean, Persisted: ✅) - Terms acceptés

### 1.2 Configuration Base API FlutterFlow
> API Settings → Base URL

- [ ] Base URL configurée: `https://workon-backend-production-8908.up.railway.app/api/v1`
- [ ] Headers par défaut configurés:
  - [ ] `Content-Type: application/json`
  - [ ] `Authorization: Bearer {{authToken}}` (pour endpoints protégés)

---

## PHASE 2: AUTHENTIFICATION (Priorité 1)

### 2.1 API Call: `Auth_Register`
```
POST /auth/register
Content-Type: application/json
NO Auth Header (public)
```

**Configuration FlutterFlow:**
- [ ] Method: `POST` ⚠️ (PAS GET!)
- [ ] Endpoint: `/auth/register`
- [ ] Headers: `Content-Type: application/json`
- [ ] Body JSON:
```json
{
  "email": "{{email}}",
  "password": "{{password}}",
  "firstName": "{{firstName}}",
  "lastName": "{{lastName}}",
  "role": "{{role}}"
}
```

⚠️ **IMPORTANT:**
- `role` doit être en **minuscules**: `worker`, `employer`, ou `residential_client`
- `firstName` et `lastName` sont **optionnels** (peuvent être vides ou omis)
```

**Mapping réponse → App State:**
- [ ] `accessToken` → `authToken`
- [ ] `refreshToken` → `refreshToken`
- [ ] `user.id` → `currentUserId`
- [ ] `user.email` → `currentUserEmail`
- [ ] `user.role` → `currentUserRole`
- [ ] `user.firstName` → `currentUserFirstName`
- [ ] `user.lastName` → `currentUserLastName`

**Action après succès:**
- [ ] Navigate to: Compliance/Onboarding page (pour accepter Terms)

---

### 2.2 API Call: `Auth_Login`
```
POST /auth/login
Content-Type: application/json
NO Auth Header (public)
```

**Configuration FlutterFlow:**
- [ ] Method: `POST`
- [ ] Endpoint: `/auth/login`
- [ ] Body JSON:
```json
{
  "email": "{{email}}",
  "password": "{{password}}"
}
```

**Mapping réponse:** Identique à Register

**Action après succès:**
- [ ] Navigate to: Dashboard (selon role)

---

### 2.3 API Call: `Auth_GetMe`
```
GET /auth/me
Authorization: Bearer {{authToken}}
```

**Configuration FlutterFlow:**
- [ ] Method: `GET`
- [ ] Endpoint: `/auth/me`
- [ ] Headers: `Authorization: Bearer {{authToken}}`

**Utilisation:** SplashPage (vérifier token valide au démarrage)

---

### 2.4 API Call: `Auth_Refresh`
```
POST /auth/refresh
Content-Type: application/json
```

**Configuration FlutterFlow:**
- [ ] Method: `POST`
- [ ] Endpoint: `/auth/refresh`
- [ ] Body: `{ "refreshToken": "{{refreshToken}}" }`

**Action:** Stocker nouveaux tokens si 401 sur autre endpoint

---

### 2.5 API Call: `Auth_ForgotPassword`
```
POST /auth/forgot-password
Content-Type: application/json
```

- [ ] Method: `POST`
- [ ] Body: `{ "email": "{{email}}" }`
- [ ] Afficher message: "Si ce compte existe, un email a été envoyé"

---

### 2.6 API Call: `Auth_ResetPassword`
```
POST /auth/reset-password
Content-Type: application/json
```

- [ ] Method: `POST`
- [ ] Body: `{ "token": "{{code}}", "newPassword": "{{newPassword}}" }`

---

## PHASE 3: COMPLIANCE (Obligatoire après inscription)

### 3.1 API Call: `Compliance_GetStatus`
```
GET /compliance/status
Authorization: Bearer {{authToken}}
```

- [ ] Method: `GET`
- [ ] Endpoint: `/compliance/status`
- [ ] Vérifier: `isComplete === true` avant d'accéder aux fonctionnalités

---

### 3.2 API Call: `Compliance_Accept`
```
POST /compliance/accept
Authorization: Bearer {{authToken}}
```

- [ ] Method: `POST`
- [ ] Body: `{ "documentType": "TERMS", "version": "1.0" }` puis `"PRIVACY"`
- [ ] Appeler 2 fois: une pour TERMS, une pour PRIVACY
- [ ] Après acceptation: `consentComplete = true`

---

### 3.3 API Call: `Compliance_GetVersions` (Public)
```
GET /compliance/versions
```

- [ ] Method: `GET`
- [ ] Utiliser pour afficher les bons documents

---

## PHASE 4: PROFIL UTILISATEUR

### 4.1 API Call: `User_GetProfile`
```
GET /users/me
Authorization: Bearer {{authToken}}
```

- [ ] Method: `GET`
- [ ] Endpoint: `/users/me`

---

### 4.2 API Call: `User_UpdateProfile`
```
PATCH /users/me
Authorization: Bearer {{authToken}}
```

- [ ] Method: `PATCH` ⚠️ (pas PUT, pas POST)
- [ ] Body: `{ "firstName": "...", "lastName": "...", "phone": "...", "city": "..." }`

---

### 4.3 API Call: `User_UploadPicture`
```
POST /users/me/picture
Authorization: Bearer {{authToken}}
Content-Type: multipart/form-data
```

- [ ] Method: `POST`
- [ ] Content-Type: `multipart/form-data`
- [ ] Field name: `file`
- [ ] Stocker `pictureUrl` dans App State

---

## PHASE 5: MISSIONS (CLIENT/EMPLOYER)

### 5.1 API Call: `Client_CreateMission`
```
POST /missions-local
Authorization: Bearer {{authToken}}
```

- [ ] Method: `POST`
- [ ] Endpoint: `/missions-local`
- [ ] Body:
```json
{
  "title": "{{title}}",
  "description": "{{description}}",
  "category": "{{category}}",
  "price": {{price}},
  "latitude": {{latitude}},
  "longitude": {{longitude}},
  "city": "{{city}}",
  "address": "{{address}}"
}
```

---

### 5.2 API Call: `Client_GetMyMissions`
```
GET /missions-local/my-missions
Authorization: Bearer {{authToken}}
```

- [ ] Method: `GET`
- [ ] Afficher dans: MyJobsPage (client)

---

### 5.3 API Call: `Client_GetMissionDetail`
```
GET /missions-local/{{missionId}}
Authorization: Bearer {{authToken}}
```

- [ ] Method: `GET`
- [ ] Path param: `missionId`

---

### 5.4 API Call: `Client_CancelMission`
```
POST /missions-local/{{missionId}}/cancel
Authorization: Bearer {{authToken}}
```

- [ ] Method: `POST`
- [ ] Confirmer avant d'exécuter

---

### 5.5 API Call: `Client_CompleteMission`
```
POST /missions-local/{{missionId}}/complete
Authorization: Bearer {{authToken}}
```

- [ ] Method: `POST`

---

## PHASE 6: MISSIONS (WORKER/PROVIDER)

### 6.1 API Call: `Provider_GetNearbyMissions`
```
GET /missions-local/nearby?latitude={{lat}}&longitude={{lng}}&radiusKm={{radius}}
Authorization: Bearer {{authToken}}
```

- [ ] Method: `GET`
- [ ] Query params: `latitude`, `longitude`, `radiusKm` (défaut: 10)
- [ ] Utiliser géolocalisation FlutterFlow pour lat/lng

---

### 6.2 API Call: `Provider_GetMissionsMap`
```
GET /missions-local/map?north={{north}}&south={{south}}&east={{east}}&west={{west}}
Authorization: Bearer {{authToken}}
```

- [ ] Method: `GET`
- [ ] Pour affichage carte avec pins

---

### 6.3 API Call: `Provider_AcceptMission`
```
POST /missions-local/{{missionId}}/accept
Authorization: Bearer {{authToken}}
```

- [ ] Method: `POST`

---

### 6.4 API Call: `Provider_StartMission`
```
POST /missions-local/{{missionId}}/start
Authorization: Bearer {{authToken}}
```

- [ ] Method: `POST`
- [ ] Status: `assigned` → `in_progress`

---

### 6.5 API Call: `Provider_GetMyAssignments`
```
GET /missions-local/my-assignments
Authorization: Bearer {{authToken}}
```

- [ ] Method: `GET`
- [ ] Afficher dans: MyJobsPage (worker)

---

## PHASE 7: OFFERS (Système de candidatures)

### 7.1 API Call: `Offer_Create`
```
POST /offers
Authorization: Bearer {{authToken}}
```

- [ ] Method: `POST`
- [ ] Body:
```json
{
  "missionId": "{{missionId}}",
  "price": {{price}},
  "message": "{{message}}"
}
```

---

### 7.2 API Call: `Offer_GetMine`
```
GET /offers/mine
Authorization: Bearer {{authToken}}
```

- [ ] Method: `GET`
- [ ] Afficher: Mes candidatures (worker)

---

### 7.3 API Call: `Offer_GetForMission`
```
GET /offers/mission/{{missionId}}
Authorization: Bearer {{authToken}}
```

- [ ] Method: `GET`
- [ ] Afficher: Candidatures reçues (client)

---

### 7.4 API Call: `Offer_Accept`
```
PATCH /offers/{{offerId}}/accept
Authorization: Bearer {{authToken}}
```

- [ ] Method: `PATCH` ⚠️

---

### 7.5 API Call: `Offer_Reject`
```
PATCH /offers/{{offerId}}/reject
Authorization: Bearer {{authToken}}
```

- [ ] Method: `PATCH` ⚠️

---

## PHASE 8: MESSAGES/CHAT

### 8.1 API Call: `Messages_GetConversations`
```
GET /messages-local/conversations
Authorization: Bearer {{authToken}}
```

- [ ] Method: `GET`
- [ ] Afficher: Liste des chats

---

### 8.2 API Call: `Messages_GetThread`
```
GET /messages-local/thread/{{missionId}}
Authorization: Bearer {{authToken}}
```

- [ ] Method: `GET`
- [ ] Path param: `missionId`

---

### 8.3 API Call: `Messages_Send`
```
POST /messages-local
Authorization: Bearer {{authToken}}
```

- [ ] Method: `POST`
- [ ] Body: `{ "missionId": "{{missionId}}", "content": "{{content}}" }`

---

### 8.4 API Call: `Messages_MarkRead`
```
PATCH /messages-local/read/{{missionId}}
Authorization: Bearer {{authToken}}
```

- [ ] Method: `PATCH`

---

### 8.5 API Call: `Messages_GetUnreadCount`
```
GET /messages-local/unread-count
Authorization: Bearer {{authToken}}
```

- [ ] Method: `GET`
- [ ] Afficher: Badge sur icône messages

---

## PHASE 9: NOTIFICATIONS

### 9.1 API Call: `Notif_GetAll`
```
GET /notifications
Authorization: Bearer {{authToken}}
```

- [ ] Method: `GET`
- [ ] Query param optionnel: `unreadOnly=true`

---

### 9.2 API Call: `Notif_GetUnreadCount`
```
GET /notifications/unread-count
Authorization: Bearer {{authToken}}
```

- [ ] Method: `GET`
- [ ] Afficher: Badge sur icône notifications

---

### 9.3 API Call: `Notif_MarkAsRead`
```
PATCH /notifications/{{notificationId}}/read
Authorization: Bearer {{authToken}}
```

- [ ] Method: `PATCH`

---

### 9.4 API Call: `Notif_MarkAllRead`
```
PATCH /notifications/read-all
Authorization: Bearer {{authToken}}
```

- [ ] Method: `PATCH`

---

## PHASE 10: PAIEMENTS

### 10.1 API Call: `Payment_CreateIntent`
```
POST /payments-local/intent
Authorization: Bearer {{authToken}}
```

- [ ] Method: `POST`
- [ ] Body: `{ "missionId": "{{missionId}}" }`
- [ ] Réponse: `clientSecret` pour Stripe SDK

---

### 10.2 Intégration Stripe SDK FlutterFlow
- [ ] Ajouter Stripe package à FlutterFlow
- [ ] Configurer clé publique Stripe (pk_test_...)
- [ ] Utiliser `clientSecret` pour afficher Payment Sheet

---

## PHASE 11: STRIPE CONNECT (Workers)

### 11.1 API Call: `Stripe_GetOnboardingLink`
```
GET /payments/stripe/connect/onboarding
Authorization: Bearer {{authToken}}
```

- [ ] Method: `GET`
- [ ] Ouvrir URL retournée dans **navigateur externe** (pas WebView)

---

### 11.2 API Call: `Stripe_GetStatus`
```
GET /payments/stripe/connect/status
Authorization: Bearer {{authToken}}
```

- [ ] Method: `GET`
- [ ] Vérifier: `onboardingComplete === true` avant de recevoir paiements

---

## PHASE 12: REVIEWS/RATINGS

### 12.1 API Call: `Review_Create`
```
POST /reviews
Authorization: Bearer {{authToken}}
```

- [ ] Method: `POST`
- [ ] Body: `{ "targetUserId": "{{userId}}", "missionId": "{{missionId}}", "rating": {{rating}}, "comment": "{{comment}}" }`
- [ ] Rating: 1-5

---

### 12.2 API Call: `Review_GetSummary`
```
GET /reviews/summary?userId={{userId}}
Authorization: Bearer {{authToken}}
```

- [ ] Method: `GET`
- [ ] Afficher: Étoiles sur profil

---

### 12.3 API Call: `Review_GetList`
```
GET /reviews?userId={{userId}}
Authorization: Bearer {{authToken}}
```

- [ ] Method: `GET`
- [ ] Afficher: Liste des avis

---

## PHASE 13: DEVICES (Push Notifications)

### 13.1 API Call: `Device_Register`
```
POST /devices
Authorization: Bearer {{authToken}}
```

- [ ] Method: `POST`
- [ ] Body:
```json
{
  "deviceId": "{{vendorId}}",
  "platform": "ios" ou "android",
  "pushToken": "{{fcmToken}}",
  "appVersion": "{{appVersion}}"
}
```
- [ ] Appeler après login et après obtention du FCM token

---

## PHASE 14: METRICS (Dashboard)

### 14.1 API Call: `Metrics_GetRatio`
```
GET /metrics/ratio?region={{region}}
Authorization: optionnel
```

- [ ] Method: `GET`
- [ ] Afficher: Demande workers/employers dans la région

---

### 14.2 API Call: `Metrics_GetRegions`
```
GET /metrics/regions
```

- [ ] Method: `GET`
- [ ] Utiliser pour dropdown de sélection de région

---

# 🔧 ERREURS COURANTES À VÉRIFIER

## Erreur: "Cannot GET /api/v1/auth/register"
**Cause:** Method configuré en GET au lieu de POST
**Solution:** Changer Method en POST dans FlutterFlow API Call

## Erreur: 401 Unauthorized
**Causes possibles:**
1. Token non envoyé → Vérifier header `Authorization: Bearer {{authToken}}`
2. Token expiré → Appeler `/auth/refresh`
3. Token mal formaté → Vérifier pas d'espace en trop

## Erreur: 403 Forbidden (Consent required)
**Cause:** Utilisateur n'a pas accepté Terms/Privacy
**Solution:** Rediriger vers page Compliance avant accès aux fonctionnalités

## Erreur: CORS Error
**Cause:** Origine FlutterFlow non autorisée
**Solution:** Vérifier `CORS_ORIGIN=*` dans Railway

## Erreur: 400 Bad Request
**Causes possibles:**
1. Body JSON mal formaté
2. Champs requis manquants
3. Types incorrects (string au lieu de number)

---

# 📱 MAPPING PAGES SPARKLY → API CALLS

| Page Sparkly | API Calls à configurer |
|--------------|------------------------|
| SplashPage | `Auth_GetMe` (vérifier token) |
| LoginPage | `Auth_Login` |
| SignUpPage | `Auth_Register` |
| ForgotPasswordPage | `Auth_ForgotPassword`, `Auth_ResetPassword` |
| OnboardingPage | `Compliance_Accept` (x2) |
| HomePage (Client) | `Client_GetMyMissions` |
| HomePage (Provider) | `Provider_GetNearbyMissions` |
| CreateJobPage | `Client_CreateMission` |
| JobDetailPage (Client) | `Offer_GetForMission`, `Offer_Accept` |
| JobDetailPage (Provider) | `Provider_AcceptMission`, `Provider_StartMission` |
| MyJobsPage | `Client_GetMyMissions` ou `Provider_GetMyAssignments` |
| ChatListPage | `Messages_GetConversations` |
| ChatPage | `Messages_GetThread`, `Messages_Send`, `Messages_MarkRead` |
| NotificationsPage | `Notif_GetAll`, `Notif_MarkAsRead` |
| ProfilePage | `User_GetProfile`, `Review_GetSummary` |
| EditProfilePage | `User_UpdateProfile`, `User_UploadPicture` |
| PaymentPage | `Payment_CreateIntent` + Stripe SDK |
| PaymentSetupPage (Worker) | `Stripe_GetOnboardingLink`, `Stripe_GetStatus` |
| RatingPage | `Review_Create` |
| MapPage | `Provider_GetMissionsMap` |

---

# 🚀 ORDRE D'EXÉCUTION RECOMMANDÉ

1. **Jour 1:** Phase 1 (App State) + Phase 2 (Auth)
2. **Jour 2:** Phase 3 (Compliance) + Phase 4 (Profile)
3. **Jour 3:** Phase 5-6 (Missions)
4. **Jour 4:** Phase 7 (Offers)
5. **Jour 5:** Phase 8 (Messages) + Phase 9 (Notifications)
6. **Jour 6:** Phase 10-11 (Paiements)
7. **Jour 7:** Phase 12-14 (Reviews, Devices, Metrics)

---

**Document généré le 31 janvier 2026**  
**Backend WorkOn v1.0 - 100% fonctionnel**  
**Problème: Configuration FlutterFlow à compléter**
