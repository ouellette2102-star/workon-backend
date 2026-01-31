# 📋 CONFIGURATION COPIER-COLLER FLUTTERFLOW

> Ouvre FlutterFlow → API Calls → Create API Call
> Copie-colle les configurations ci-dessous

---

## 🔧 CONFIGURATION GLOBALE

### Base URL (à configurer une seule fois)
```
https://workon-backend-production-8908.up.railway.app/api/v1
```

### Headers par défaut pour endpoints protégés
```
Authorization: Bearer [authToken]
Content-Type: application/json
```

---

# PHASE 1: APP STATE VARIABLES

Dans FlutterFlow → App State → Add Field :

| Nom | Type | Persisted | Initial Value |
|-----|------|-----------|---------------|
| `authToken` | String | ✅ Yes | (vide) |
| `refreshToken` | String | ✅ Yes | (vide) |
| `currentUserId` | String | ✅ Yes | (vide) |
| `currentUserEmail` | String | ✅ Yes | (vide) |
| `currentUserRole` | String | ✅ Yes | (vide) |
| `currentUserFirstName` | String | ✅ Yes | (vide) |
| `currentUserLastName` | String | ✅ Yes | (vide) |
| `currentUserPictureUrl` | String | ✅ Yes | (vide) |
| `consentComplete` | Boolean | ✅ Yes | false |

---

# PHASE 2: AUTHENTIFICATION

---

## API Call: Auth_Register

### Configuration
| Champ | Valeur |
|-------|--------|
| **API Call Name** | `Auth_Register` |
| **Method** | `POST` ⚠️ |
| **API URL** | `https://workon-backend-production-8908.up.railway.app/api/v1/auth/register` |

### Headers
| Key | Value |
|-----|-------|
| `Content-Type` | `application/json` |

### Body (JSON)
```json
{
  "email": "<email>",
  "password": "<password>",
  "firstName": "<firstName>",
  "lastName": "<lastName>",
  "role": "<role>"
}
```

### Variables
| Variable Name | Type | Is List |
|--------------|------|---------|
| `email` | String | No |
| `password` | String | No |
| `firstName` | String | No |
| `lastName` | String | No |
| `role` | String | No |

### Response → JSON Path
| JSON Path | Variable Name | Type |
|-----------|--------------|------|
| `$.accessToken` | `accessToken` | String |
| `$.refreshToken` | `refreshToken` | String |
| `$.user.id` | `userId` | String |
| `$.user.email` | `userEmail` | String |
| `$.user.role` | `userRole` | String |
| `$.user.firstName` | `userFirstName` | String |
| `$.user.lastName` | `userLastName` | String |

### Actions après succès (On Response → 201)
1. Update App State: `authToken` = `accessToken`
2. Update App State: `refreshToken` = `refreshToken`
3. Update App State: `currentUserId` = `userId`
4. Update App State: `currentUserEmail` = `userEmail`
5. Update App State: `currentUserRole` = `userRole`
6. Update App State: `currentUserFirstName` = `userFirstName`
7. Update App State: `currentUserLastName` = `userLastName`
8. Navigate to: CompliancePage

---

## API Call: Auth_Login

### Configuration
| Champ | Valeur |
|-------|--------|
| **API Call Name** | `Auth_Login` |
| **Method** | `POST` |
| **API URL** | `https://workon-backend-production-8908.up.railway.app/api/v1/auth/login` |

### Headers
| Key | Value |
|-----|-------|
| `Content-Type` | `application/json` |

### Body (JSON)
```json
{
  "email": "<email>",
  "password": "<password>"
}
```

### Variables
| Variable Name | Type |
|--------------|------|
| `email` | String |
| `password` | String |

### Response → JSON Path
(Identique à Register)

### Actions après succès
1. Update App State (tous les champs comme Register)
2. Call API: `Compliance_GetStatus`
3. Si `consentComplete` = true → Navigate to Dashboard
4. Sinon → Navigate to CompliancePage

---

## API Call: Auth_GetMe

### Configuration
| Champ | Valeur |
|-------|--------|
| **API Call Name** | `Auth_GetMe` |
| **Method** | `GET` |
| **API URL** | `https://workon-backend-production-8908.up.railway.app/api/v1/auth/me` |

### Headers
| Key | Value |
|-----|-------|
| `Authorization` | `Bearer [authToken]` |

### Response → JSON Path
| JSON Path | Variable Name |
|-----------|--------------|
| `$.id` | `userId` |
| `$.email` | `userEmail` |
| `$.role` | `userRole` |
| `$.firstName` | `firstName` |
| `$.lastName` | `lastName` |
| `$.pictureUrl` | `pictureUrl` |

---

## API Call: Auth_Refresh

### Configuration
| Champ | Valeur |
|-------|--------|
| **API Call Name** | `Auth_Refresh` |
| **Method** | `POST` |
| **API URL** | `https://workon-backend-production-8908.up.railway.app/api/v1/auth/refresh` |

### Headers
| Key | Value |
|-----|-------|
| `Content-Type` | `application/json` |

### Body (JSON)
```json
{
  "refreshToken": "<refreshToken>"
}
```

### Actions après succès
1. Update App State: `authToken` = nouveau token
2. Update App State: `refreshToken` = nouveau refresh token

---

## API Call: Auth_ForgotPassword

### Configuration
| Champ | Valeur |
|-------|--------|
| **API Call Name** | `Auth_ForgotPassword` |
| **Method** | `POST` |
| **API URL** | `https://workon-backend-production-8908.up.railway.app/api/v1/auth/forgot-password` |

### Body (JSON)
```json
{
  "email": "<email>"
}
```

---

## API Call: Auth_ResetPassword

### Configuration
| Champ | Valeur |
|-------|--------|
| **API Call Name** | `Auth_ResetPassword` |
| **Method** | `POST` |
| **API URL** | `https://workon-backend-production-8908.up.railway.app/api/v1/auth/reset-password` |

### Body (JSON)
```json
{
  "token": "<resetCode>",
  "newPassword": "<newPassword>"
}
```

---

# PHASE 3: COMPLIANCE

---

## API Call: Compliance_GetStatus

### Configuration
| Champ | Valeur |
|-------|--------|
| **API Call Name** | `Compliance_GetStatus` |
| **Method** | `GET` |
| **API URL** | `https://workon-backend-production-8908.up.railway.app/api/v1/compliance/status` |

### Headers
| Key | Value |
|-----|-------|
| `Authorization` | `Bearer [authToken]` |

### Response → JSON Path
| JSON Path | Variable Name |
|-----------|--------------|
| `$.isComplete` | `isComplete` |

### Actions
- Si `isComplete` = true → `consentComplete` = true

---

## API Call: Compliance_Accept

### Configuration
| Champ | Valeur |
|-------|--------|
| **API Call Name** | `Compliance_Accept` |
| **Method** | `POST` |
| **API URL** | `https://workon-backend-production-8908.up.railway.app/api/v1/compliance/accept` |

### Headers
| Key | Value |
|-----|-------|
| `Authorization` | `Bearer [authToken]` |
| `Content-Type` | `application/json` |

### Body (JSON) - Pour Terms
```json
{
  "documentType": "TERMS",
  "version": "1.0"
}
```

### Body (JSON) - Pour Privacy
```json
{
  "documentType": "PRIVACY",
  "version": "1.0"
}
```

### Utilisation
1. Appeler avec `documentType: "TERMS"` quand user accepte Terms
2. Appeler avec `documentType: "PRIVACY"` quand user accepte Privacy
3. Après les 2: `consentComplete` = true

---

# PHASE 4: PROFIL

---

## API Call: User_GetProfile

### Configuration
| Champ | Valeur |
|-------|--------|
| **API Call Name** | `User_GetProfile` |
| **Method** | `GET` |
| **API URL** | `https://workon-backend-production-8908.up.railway.app/api/v1/users/me` |

### Headers
| Key | Value |
|-----|-------|
| `Authorization` | `Bearer [authToken]` |

---

## API Call: User_UpdateProfile

### Configuration
| Champ | Valeur |
|-------|--------|
| **API Call Name** | `User_UpdateProfile` |
| **Method** | `PATCH` ⚠️ |
| **API URL** | `https://workon-backend-production-8908.up.railway.app/api/v1/users/me` |

### Headers
| Key | Value |
|-----|-------|
| `Authorization` | `Bearer [authToken]` |
| `Content-Type` | `application/json` |

### Body (JSON)
```json
{
  "firstName": "<firstName>",
  "lastName": "<lastName>",
  "phone": "<phone>",
  "city": "<city>"
}
```

---

# PHASE 5-6: MISSIONS

---

## API Call: Client_CreateMission

### Configuration
| Champ | Valeur |
|-------|--------|
| **API Call Name** | `Client_CreateMission` |
| **Method** | `POST` |
| **API URL** | `https://workon-backend-production-8908.up.railway.app/api/v1/missions-local` |

### Headers
| Key | Value |
|-----|-------|
| `Authorization` | `Bearer [authToken]` |
| `Content-Type` | `application/json` |

### Body (JSON)
```json
{
  "title": "<title>",
  "description": "<description>",
  "category": "<category>",
  "price": <price>,
  "latitude": <latitude>,
  "longitude": <longitude>,
  "city": "<city>",
  "address": "<address>"
}
```

### Variables
| Variable Name | Type |
|--------------|------|
| `title` | String |
| `description` | String |
| `category` | String |
| `price` | Double |
| `latitude` | Double |
| `longitude` | Double |
| `city` | String |
| `address` | String |

---

## API Call: Client_GetMyMissions

### Configuration
| Champ | Valeur |
|-------|--------|
| **API Call Name** | `Client_GetMyMissions` |
| **Method** | `GET` |
| **API URL** | `https://workon-backend-production-8908.up.railway.app/api/v1/missions-local/my-missions` |

### Headers
| Key | Value |
|-----|-------|
| `Authorization` | `Bearer [authToken]` |

---

## API Call: Provider_GetNearbyMissions

### Configuration
| Champ | Valeur |
|-------|--------|
| **API Call Name** | `Provider_GetNearbyMissions` |
| **Method** | `GET` |
| **API URL** | `https://workon-backend-production-8908.up.railway.app/api/v1/missions-local/nearby` |

### Headers
| Key | Value |
|-----|-------|
| `Authorization` | `Bearer [authToken]` |

### Query Parameters
| Key | Value |
|-----|-------|
| `latitude` | `<userLatitude>` |
| `longitude` | `<userLongitude>` |
| `radiusKm` | `10` |

---

## API Call: Provider_GetMyAssignments

### Configuration
| Champ | Valeur |
|-------|--------|
| **API Call Name** | `Provider_GetMyAssignments` |
| **Method** | `GET` |
| **API URL** | `https://workon-backend-production-8908.up.railway.app/api/v1/missions-local/my-assignments` |

### Headers
| Key | Value |
|-----|-------|
| `Authorization` | `Bearer [authToken]` |

---

## API Call: Mission_GetDetail

### Configuration
| Champ | Valeur |
|-------|--------|
| **API Call Name** | `Mission_GetDetail` |
| **Method** | `GET` |
| **API URL** | `https://workon-backend-production-8908.up.railway.app/api/v1/missions-local/<missionId>` |

### Headers
| Key | Value |
|-----|-------|
| `Authorization` | `Bearer [authToken]` |

### Variables
| Variable Name | Type |
|--------------|------|
| `missionId` | String |

---

## API Call: Provider_AcceptMission

### Configuration
| Champ | Valeur |
|-------|--------|
| **API Call Name** | `Provider_AcceptMission` |
| **Method** | `POST` |
| **API URL** | `https://workon-backend-production-8908.up.railway.app/api/v1/missions-local/<missionId>/accept` |

### Headers
| Key | Value |
|-----|-------|
| `Authorization` | `Bearer [authToken]` |

---

## API Call: Provider_StartMission

### Configuration
| Champ | Valeur |
|-------|--------|
| **API Call Name** | `Provider_StartMission` |
| **Method** | `POST` |
| **API URL** | `https://workon-backend-production-8908.up.railway.app/api/v1/missions-local/<missionId>/start` |

### Headers
| Key | Value |
|-----|-------|
| `Authorization` | `Bearer [authToken]` |

---

## API Call: Mission_Complete

### Configuration
| Champ | Valeur |
|-------|--------|
| **API Call Name** | `Mission_Complete` |
| **Method** | `POST` |
| **API URL** | `https://workon-backend-production-8908.up.railway.app/api/v1/missions-local/<missionId>/complete` |

### Headers
| Key | Value |
|-----|-------|
| `Authorization` | `Bearer [authToken]` |

---

## API Call: Mission_Cancel

### Configuration
| Champ | Valeur |
|-------|--------|
| **API Call Name** | `Mission_Cancel` |
| **Method** | `POST` |
| **API URL** | `https://workon-backend-production-8908.up.railway.app/api/v1/missions-local/<missionId>/cancel` |

### Headers
| Key | Value |
|-----|-------|
| `Authorization` | `Bearer [authToken]` |

---

# PHASE 7: OFFERS

---

## API Call: Offer_Create

### Configuration
| Champ | Valeur |
|-------|--------|
| **API Call Name** | `Offer_Create` |
| **Method** | `POST` |
| **API URL** | `https://workon-backend-production-8908.up.railway.app/api/v1/offers` |

### Headers
| Key | Value |
|-----|-------|
| `Authorization` | `Bearer [authToken]` |
| `Content-Type` | `application/json` |

### Body (JSON)
```json
{
  "missionId": "<missionId>",
  "price": <price>,
  "message": "<message>"
}
```

---

## API Call: Offer_GetMine

### Configuration
| Champ | Valeur |
|-------|--------|
| **API Call Name** | `Offer_GetMine` |
| **Method** | `GET` |
| **API URL** | `https://workon-backend-production-8908.up.railway.app/api/v1/offers/mine` |

### Headers
| Key | Value |
|-----|-------|
| `Authorization` | `Bearer [authToken]` |

---

## API Call: Offer_GetForMission

### Configuration
| Champ | Valeur |
|-------|--------|
| **API Call Name** | `Offer_GetForMission` |
| **Method** | `GET` |
| **API URL** | `https://workon-backend-production-8908.up.railway.app/api/v1/offers/mission/<missionId>` |

### Headers
| Key | Value |
|-----|-------|
| `Authorization` | `Bearer [authToken]` |

---

## API Call: Offer_Accept

### Configuration
| Champ | Valeur |
|-------|--------|
| **API Call Name** | `Offer_Accept` |
| **Method** | `PATCH` ⚠️ |
| **API URL** | `https://workon-backend-production-8908.up.railway.app/api/v1/offers/<offerId>/accept` |

### Headers
| Key | Value |
|-----|-------|
| `Authorization` | `Bearer [authToken]` |

---

## API Call: Offer_Reject

### Configuration
| Champ | Valeur |
|-------|--------|
| **API Call Name** | `Offer_Reject` |
| **Method** | `PATCH` ⚠️ |
| **API URL** | `https://workon-backend-production-8908.up.railway.app/api/v1/offers/<offerId>/reject` |

### Headers
| Key | Value |
|-----|-------|
| `Authorization` | `Bearer [authToken]` |

---

# PHASE 8: MESSAGES

---

## API Call: Messages_GetConversations

### Configuration
| Champ | Valeur |
|-------|--------|
| **API Call Name** | `Messages_GetConversations` |
| **Method** | `GET` |
| **API URL** | `https://workon-backend-production-8908.up.railway.app/api/v1/messages-local/conversations` |

### Headers
| Key | Value |
|-----|-------|
| `Authorization` | `Bearer [authToken]` |

---

## API Call: Messages_GetThread

### Configuration
| Champ | Valeur |
|-------|--------|
| **API Call Name** | `Messages_GetThread` |
| **Method** | `GET` |
| **API URL** | `https://workon-backend-production-8908.up.railway.app/api/v1/messages-local/thread/<missionId>` |

### Headers
| Key | Value |
|-----|-------|
| `Authorization` | `Bearer [authToken]` |

---

## API Call: Messages_Send

### Configuration
| Champ | Valeur |
|-------|--------|
| **API Call Name** | `Messages_Send` |
| **Method** | `POST` |
| **API URL** | `https://workon-backend-production-8908.up.railway.app/api/v1/messages-local` |

### Headers
| Key | Value |
|-----|-------|
| `Authorization` | `Bearer [authToken]` |
| `Content-Type` | `application/json` |

### Body (JSON)
```json
{
  "missionId": "<missionId>",
  "content": "<messageContent>"
}
```

---

## API Call: Messages_MarkRead

### Configuration
| Champ | Valeur |
|-------|--------|
| **API Call Name** | `Messages_MarkRead` |
| **Method** | `PATCH` ⚠️ |
| **API URL** | `https://workon-backend-production-8908.up.railway.app/api/v1/messages-local/read/<missionId>` |

### Headers
| Key | Value |
|-----|-------|
| `Authorization` | `Bearer [authToken]` |

---

## API Call: Messages_GetUnreadCount

### Configuration
| Champ | Valeur |
|-------|--------|
| **API Call Name** | `Messages_GetUnreadCount` |
| **Method** | `GET` |
| **API URL** | `https://workon-backend-production-8908.up.railway.app/api/v1/messages-local/unread-count` |

### Headers
| Key | Value |
|-----|-------|
| `Authorization` | `Bearer [authToken]` |

---

# PHASE 9: NOTIFICATIONS

---

## API Call: Notif_GetAll

### Configuration
| Champ | Valeur |
|-------|--------|
| **API Call Name** | `Notif_GetAll` |
| **Method** | `GET` |
| **API URL** | `https://workon-backend-production-8908.up.railway.app/api/v1/notifications` |

### Headers
| Key | Value |
|-----|-------|
| `Authorization` | `Bearer [authToken]` |

### Query Parameters (optionnel)
| Key | Value |
|-----|-------|
| `unreadOnly` | `true` |

---

## API Call: Notif_GetUnreadCount

### Configuration
| Champ | Valeur |
|-------|--------|
| **API Call Name** | `Notif_GetUnreadCount` |
| **Method** | `GET` |
| **API URL** | `https://workon-backend-production-8908.up.railway.app/api/v1/notifications/unread-count` |

### Headers
| Key | Value |
|-----|-------|
| `Authorization` | `Bearer [authToken]` |

---

## API Call: Notif_MarkAsRead

### Configuration
| Champ | Valeur |
|-------|--------|
| **API Call Name** | `Notif_MarkAsRead` |
| **Method** | `PATCH` ⚠️ |
| **API URL** | `https://workon-backend-production-8908.up.railway.app/api/v1/notifications/<notificationId>/read` |

### Headers
| Key | Value |
|-----|-------|
| `Authorization` | `Bearer [authToken]` |

---

## API Call: Notif_MarkAllRead

### Configuration
| Champ | Valeur |
|-------|--------|
| **API Call Name** | `Notif_MarkAllRead` |
| **Method** | `PATCH` ⚠️ |
| **API URL** | `https://workon-backend-production-8908.up.railway.app/api/v1/notifications/read-all` |

### Headers
| Key | Value |
|-----|-------|
| `Authorization` | `Bearer [authToken]` |

---

# PHASE 10: PAIEMENTS

---

## API Call: Payment_CreateIntent

### Configuration
| Champ | Valeur |
|-------|--------|
| **API Call Name** | `Payment_CreateIntent` |
| **Method** | `POST` |
| **API URL** | `https://workon-backend-production-8908.up.railway.app/api/v1/payments-local/intent` |

### Headers
| Key | Value |
|-----|-------|
| `Authorization` | `Bearer [authToken]` |
| `Content-Type` | `application/json` |

### Body (JSON)
```json
{
  "missionId": "<missionId>"
}
```

### Response → JSON Path
| JSON Path | Variable Name |
|-----------|--------------|
| `$.clientSecret` | `stripeClientSecret` |
| `$.paymentIntentId` | `paymentIntentId` |
| `$.amount` | `amount` |

### Utilisation avec Stripe SDK
1. Appeler cet endpoint
2. Récupérer `clientSecret`
3. Passer à Stripe Payment Sheet FlutterFlow

---

# PHASE 11: STRIPE CONNECT (Workers)

---

## API Call: Stripe_GetOnboardingLink

### Configuration
| Champ | Valeur |
|-------|--------|
| **API Call Name** | `Stripe_GetOnboardingLink` |
| **Method** | `GET` |
| **API URL** | `https://workon-backend-production-8908.up.railway.app/api/v1/payments/stripe/connect/onboarding` |

### Headers
| Key | Value |
|-----|-------|
| `Authorization` | `Bearer [authToken]` |

### Response
```json
{
  "url": "https://connect.stripe.com/setup/..."
}
```

### Action
- Ouvrir `url` dans **navigateur externe** (Launch URL avec mode external)

---

## API Call: Stripe_GetStatus

### Configuration
| Champ | Valeur |
|-------|--------|
| **API Call Name** | `Stripe_GetStatus` |
| **Method** | `GET` |
| **API URL** | `https://workon-backend-production-8908.up.railway.app/api/v1/payments/stripe/connect/status` |

### Headers
| Key | Value |
|-----|-------|
| `Authorization` | `Bearer [authToken]` |

### Response → JSON Path
| JSON Path | Variable Name |
|-----------|--------------|
| `$.hasAccount` | `hasStripeAccount` |
| `$.chargesEnabled` | `chargesEnabled` |
| `$.payoutsEnabled` | `payoutsEnabled` |

---

# PHASE 12: REVIEWS

---

## API Call: Review_Create

### Configuration
| Champ | Valeur |
|-------|--------|
| **API Call Name** | `Review_Create` |
| **Method** | `POST` |
| **API URL** | `https://workon-backend-production-8908.up.railway.app/api/v1/reviews` |

### Headers
| Key | Value |
|-----|-------|
| `Authorization` | `Bearer [authToken]` |
| `Content-Type` | `application/json` |

### Body (JSON)
```json
{
  "targetUserId": "<targetUserId>",
  "missionId": "<missionId>",
  "rating": <rating>,
  "comment": "<comment>"
}
```

### Variables
| Variable Name | Type |
|--------------|------|
| `targetUserId` | String |
| `missionId` | String |
| `rating` | Integer (1-5) |
| `comment` | String |

---

## API Call: Review_GetSummary

### Configuration
| Champ | Valeur |
|-------|--------|
| **API Call Name** | `Review_GetSummary` |
| **Method** | `GET` |
| **API URL** | `https://workon-backend-production-8908.up.railway.app/api/v1/reviews/summary` |

### Headers
| Key | Value |
|-----|-------|
| `Authorization` | `Bearer [authToken]` |

### Query Parameters
| Key | Value |
|-----|-------|
| `userId` | `<targetUserId>` |

---

# PHASE 13: DEVICES (Push)

---

## API Call: Device_Register

### Configuration
| Champ | Valeur |
|-------|--------|
| **API Call Name** | `Device_Register` |
| **Method** | `POST` |
| **API URL** | `https://workon-backend-production-8908.up.railway.app/api/v1/devices` |

### Headers
| Key | Value |
|-----|-------|
| `Authorization` | `Bearer [authToken]` |
| `Content-Type` | `application/json` |

### Body (JSON)
```json
{
  "deviceId": "<deviceVendorId>",
  "platform": "<ios|android>",
  "pushToken": "<fcmToken>",
  "appVersion": "<appVersion>"
}
```

### Quand appeler
- Après login réussi
- Après obtention du FCM token

---

# PHASE 14: METRICS

---

## API Call: Metrics_GetRatio

### Configuration
| Champ | Valeur |
|-------|--------|
| **API Call Name** | `Metrics_GetRatio` |
| **Method** | `GET` |
| **API URL** | `https://workon-backend-production-8908.up.railway.app/api/v1/metrics/ratio` |

### Query Parameters (optionnel)
| Key | Value |
|-----|-------|
| `region` | `Montréal` |

---

## API Call: Metrics_GetRegions

### Configuration
| Champ | Valeur |
|-------|--------|
| **API Call Name** | `Metrics_GetRegions` |
| **Method** | `GET` |
| **API URL** | `https://workon-backend-production-8908.up.railway.app/api/v1/metrics/regions` |

---

# ✅ RÉSUMÉ RAPIDE

| Phase | Nb API Calls | Critique |
|-------|-------------|----------|
| Auth | 6 | ⭐⭐⭐ |
| Compliance | 3 | ⭐⭐⭐ |
| Profile | 2 | ⭐⭐ |
| Missions | 9 | ⭐⭐⭐ |
| Offers | 5 | ⭐⭐ |
| Messages | 5 | ⭐⭐ |
| Notifications | 4 | ⭐ |
| Payments | 1 | ⭐⭐⭐ |
| Stripe Connect | 2 | ⭐⭐ |
| Reviews | 2 | ⭐ |
| Devices | 1 | ⭐ |
| Metrics | 2 | ⭐ |

**Total: 42 API Calls**

---

*Document généré le 31 janvier 2026*
