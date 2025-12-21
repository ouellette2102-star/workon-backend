# 📱 FlutterFlow API Contract - WorkOn x Sparkly Template

**Version:** 1.0.0  
**Date:** 2 décembre 2025  
**Template FlutterFlow:** Sparkly (House Cleaning Services)  
**Backend:** WorkOn API (Railway)

---

## 📋 Table des matières

1. [Configuration générale](#configuration-générale)
2. [Fonctionnalités CLIENT](#fonctionnalités-client)
3. [Fonctionnalités PROVIDER (Worker)](#fonctionnalités-provider-worker)
4. [Fonctionnalités COMMUNES](#fonctionnalités-communes)
5. [Mapping Pages Sparkly → Endpoints](#mapping-pages-sparkly--endpoints)

---

## Configuration générale

### Base URL

```
Production: https://workon-backend-production-8908.up.railway.app/api/v1
```

### Headers standards

| Header | Valeur | Obligatoire |
|--------|--------|-------------|
| `Content-Type` | `application/json` | Pour POST/PATCH/PUT |
| `Authorization` | `Bearer {{authToken}}` | Pour endpoints protégés |

### Variables App State à créer dans FlutterFlow

| Variable | Type | Persisted | Description |
|----------|------|-----------|-------------|
| `authToken` | String | ✅ Oui | JWT token |
| `currentUserId` | String | ✅ Oui | ID utilisateur |
| `currentUserEmail` | String | ✅ Oui | Email utilisateur |
| `currentUserRole` | String | ✅ Oui | `worker` ou `employer` ou `residential_client` |
| `currentUserFirstName` | String | ✅ Oui | Prénom |
| `currentUserLastName` | String | ✅ Oui | Nom |

---

# FONCTIONNALITÉS CLIENT

> Le **CLIENT** dans WorkOn = l'employeur / le particulier qui poste des missions (équivalent au "Customer" dans Sparkly)

---

## C1. Créer un compte Client

### Infos générales

| Propriété | Valeur |
|-----------|--------|
| **Nom API Call FlutterFlow** | `Client_Register` |
| **Page Sparkly** | `SignUpPage` (Customer flow) |
| **Endpoint** | `POST /auth/register` |
| **Auth requise** | ❌ Non |

### Paramètres

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `email` | String | ✅ | Email du client |
| `password` | String | ✅ | Mot de passe (min 8 chars) |
| `firstName` | String | ✅ | Prénom |
| `lastName` | String | ✅ | Nom |
| `phone` | String | ❌ | Téléphone |
| `city` | String | ❌ | Ville |
| `role` | String | ✅ | **Valeur fixe: `"employer"`** |

### Exemple de requête

```json
{
  "email": "client@example.com",
  "password": "SecurePass123!",
  "firstName": "Marie",
  "lastName": "Dupont",
  "phone": "+1514555000",
  "city": "Montréal",
  "role": "employer"
}
```

### Exemple de réponse (201 Created)

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_abc123",
    "email": "client@example.com",
    "firstName": "Marie",
    "lastName": "Dupont",
    "role": "employer"
  }
}
```

### Champs à extraire

| Champ réponse | Variable App State |
|---------------|-------------------|
| `accessToken` | `authToken` |
| `user.id` | `currentUserId` |
| `user.email` | `currentUserEmail` |
| `user.role` | `currentUserRole` |
| `user.firstName` | `currentUserFirstName` |
| `user.lastName` | `currentUserLastName` |

---

## C2. Connexion Client

### Infos générales

| Propriété | Valeur |
|-----------|--------|
| **Nom API Call FlutterFlow** | `Client_Login` |
| **Page Sparkly** | `LoginPage` |
| **Endpoint** | `POST /auth/login` |
| **Auth requise** | ❌ Non |

### Paramètres

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `email` | String | ✅ | Email |
| `password` | String | ✅ | Mot de passe |

### Exemple de requête

```json
{
  "email": "client@example.com",
  "password": "SecurePass123!"
}
```

### Exemple de réponse (201 OK)

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_abc123",
    "email": "client@example.com",
    "firstName": "Marie",
    "lastName": "Dupont",
    "role": "employer"
  }
}
```

### Champs à extraire

Identiques à C1.

---

## C2b. Mot de passe oublié

### Infos générales

| Propriété | Valeur |
|-----------|--------|
| **Nom API Call FlutterFlow** | `Auth_ForgotPassword` |
| **Page Sparkly** | `ForgotPasswordPage` |
| **Endpoint** | `POST /auth/forgot-password` |
| **Auth requise** | ❌ Non |

### Paramètres

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `email` | String | ✅ | Email du compte |

### Exemple de requête

```json
{
  "email": "client@example.com"
}
```

### Exemple de réponse (200 OK)

```json
{
  "message": "If an account exists with this email, a reset code has been sent."
}
```

### Notes

> ⚠️ L'API retourne TOUJOURS un succès pour éviter l'énumération d'emails.
> En production, un code à 6 chiffres est envoyé par email.
> En développement, le code est affiché dans les logs du backend.

---

## C2c. Réinitialiser le mot de passe

### Infos générales

| Propriété | Valeur |
|-----------|--------|
| **Nom API Call FlutterFlow** | `Auth_ResetPassword` |
| **Page Sparkly** | `ResetPasswordPage` |
| **Endpoint** | `POST /auth/reset-password` |
| **Auth requise** | ❌ Non |

### Paramètres

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `email` | String | ✅ | Email du compte |
| `token` | String | ✅ | Code à 6 chiffres reçu par email |
| `newPassword` | String | ✅ | Nouveau mot de passe (min 8 chars) |

### Exemple de requête

```json
{
  "email": "client@example.com",
  "token": "123456",
  "newPassword": "NewSecurePass123!"
}
```

### Exemple de réponse (200 OK)

```json
{
  "message": "Password reset successfully. You can now login with your new password."
}
```

### Erreurs possibles

| Code | Message |
|------|---------|
| 400 | `Invalid or expired reset token` |

---

## C3. Créer une mission (Poster un job)

### Infos générales

| Propriété | Valeur |
|-----------|--------|
| **Nom API Call FlutterFlow** | `Client_CreateMission` |
| **Page Sparkly** | `CreateBookingPage` ou `NewJobPage` |
| **Endpoint** | `POST /missions` |
| **Auth requise** | ✅ Oui (Bearer token) |

### Paramètres

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `title` | String | ✅ | Titre de la mission |
| `description` | String | ✅ | Description détaillée |
| `category` | String | ✅ | Catégorie (ex: "cleaning", "gardening") |
| `price` | Number | ✅ | Prix proposé |
| `latitude` | Number | ✅ | Latitude de l'adresse |
| `longitude` | Number | ✅ | Longitude de l'adresse |
| `address` | String | ❌ | Adresse textuelle |
| `city` | String | ✅ | Ville |

### Exemple de requête

```json
{
  "title": "Nettoyage appartement 3 pièces",
  "description": "Nettoyage complet : sols, vitres, salle de bain, cuisine. Produits fournis.",
  "category": "cleaning",
  "price": 120.00,
  "latitude": 45.5017,
  "longitude": -73.5673,
  "address": "123 Rue Sainte-Catherine, Montréal",
  "city": "Montréal"
}
```

### Exemple de réponse (201 Created)

```json
{
  "id": "mission_xyz789",
  "title": "Nettoyage appartement 3 pièces",
  "description": "Nettoyage complet...",
  "category": "cleaning",
  "status": "open",
  "price": 120.00,
  "latitude": 45.5017,
  "longitude": -73.5673,
  "address": "123 Rue Sainte-Catherine, Montréal",
  "city": "Montréal",
  "createdByUserId": "user_abc123",
  "assignedToUserId": null,
  "createdAt": "2025-12-02T10:00:00.000Z"
}
```

### Champs importants

| Champ | Description |
|-------|-------------|
| `id` | ID de la mission créée |
| `status` | Statut initial: `open` |

### Notes

> ✅ **CONFIRMÉ:** L'endpoint officiel MVP est `POST /api/v1/missions` (module `MissionsLocalModule`).
> Ce module utilise le modèle `LocalMission` et l'authentification JWT locale.
> Les missions sont automatiquement liées au créateur (`createdByUserId`).

---

## C4. Voir mes missions postées

### Infos générales

| Propriété | Valeur |
|-----------|--------|
| **Nom API Call FlutterFlow** | `Client_GetMyMissions` |
| **Page Sparkly** | `MyBookingsPage` ou `MyJobsPage` |
| **Endpoint** | `GET /missions/my-missions` |
| **Auth requise** | ✅ Oui |

### Paramètres

Aucun.

### Exemple de réponse (200 OK)

```json
[
  {
    "id": "mission_xyz789",
    "title": "Nettoyage appartement 3 pièces",
    "status": "open",
    "price": 120.00,
    "city": "Montréal",
    "createdAt": "2025-12-02T10:00:00.000Z",
    "assignedToUserId": null
  },
  {
    "id": "mission_abc456",
    "title": "Ménage maison",
    "status": "assigned",
    "price": 200.00,
    "city": "Laval",
    "createdAt": "2025-12-01T14:00:00.000Z",
    "assignedToUserId": "user_worker_123"
  }
]
```

### Champs importants

| Champ | Description |
|-------|-------------|
| `status` | `open`, `assigned`, `in_progress`, `completed`, `cancelled` |
| `assignedToUserId` | ID du worker assigné (null si pas encore) |

---

## C5. Voir le détail d'une mission

### Infos générales

| Propriété | Valeur |
|-----------|--------|
| **Nom API Call FlutterFlow** | `Client_GetMissionDetail` |
| **Page Sparkly** | `BookingDetailPage` ou `JobDetailPage` |
| **Endpoint** | `GET /missions/{missionId}` |
| **Auth requise** | ✅ Oui |

### Paramètres

| Paramètre | Type | Requis | Emplacement |
|-----------|------|--------|-------------|
| `missionId` | String | ✅ | Path |

### Exemple de réponse (200 OK)

```json
{
  "id": "mission_xyz789",
  "title": "Nettoyage appartement 3 pièces",
  "description": "Nettoyage complet : sols, vitres, salle de bain, cuisine.",
  "category": "cleaning",
  "status": "assigned",
  "price": 120.00,
  "latitude": 45.5017,
  "longitude": -73.5673,
  "address": "123 Rue Sainte-Catherine, Montréal",
  "city": "Montréal",
  "createdByUserId": "user_abc123",
  "assignedToUserId": "user_worker_456",
  "createdAt": "2025-12-02T10:00:00.000Z",
  "updatedAt": "2025-12-02T11:00:00.000Z"
}
```

---

## C6. Annuler une mission

### Infos générales

| Propriété | Valeur |
|-----------|--------|
| **Nom API Call FlutterFlow** | `Client_CancelMission` |
| **Page Sparkly** | `BookingDetailPage` (bouton "Cancel") |
| **Endpoint** | `POST /missions/{missionId}/cancel` |
| **Auth requise** | ✅ Oui |

### Paramètres

| Paramètre | Type | Requis | Emplacement |
|-----------|------|--------|-------------|
| `missionId` | String | ✅ | Path |

### Exemple de réponse (200 OK)

```json
{
  "id": "mission_xyz789",
  "status": "cancelled",
  "updatedAt": "2025-12-02T12:00:00.000Z"
}
```

---

## C7. Marquer une mission comme terminée

### Infos générales

| Propriété | Valeur |
|-----------|--------|
| **Nom API Call FlutterFlow** | `Client_CompleteMission` |
| **Page Sparkly** | `BookingDetailPage` (bouton "Complete" / "Confirm") |
| **Endpoint** | `POST /missions/{missionId}/complete` |
| **Auth requise** | ✅ Oui |

### Paramètres

| Paramètre | Type | Requis | Emplacement |
|-----------|------|--------|-------------|
| `missionId` | String | ✅ | Path |

### Exemple de réponse (200 OK)

```json
{
  "id": "mission_xyz789",
  "status": "completed",
  "updatedAt": "2025-12-02T15:00:00.000Z"
}
```

---

## C8. Envoyer un message au Provider

### Infos générales

| Propriété | Valeur |
|-----------|--------|
| **Nom API Call FlutterFlow** | `Client_SendMessage` |
| **Page Sparkly** | `ChatPage` |
| **Endpoint** | `POST /messages` |
| **Auth requise** | ✅ Oui |

### Paramètres

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `missionId` | String | ✅ | ID de la mission |
| `content` | String | ✅ | Contenu du message (max 2000 chars) |

### Exemple de requête

```json
{
  "missionId": "mission_xyz789",
  "content": "Bonjour, à quelle heure pouvez-vous venir demain ?"
}
```

### Exemple de réponse (201 Created)

```json
{
  "id": "msg_123456",
  "missionId": "mission_xyz789",
  "senderId": "user_abc123",
  "senderRole": "EMPLOYER",
  "content": "Bonjour, à quelle heure pouvez-vous venir demain ?",
  "createdAt": "2025-12-02T10:30:00.000Z"
}
```

---

## C9. Voir les messages d'une mission

### Infos générales

| Propriété | Valeur |
|-----------|--------|
| **Nom API Call FlutterFlow** | `Client_GetMessages` |
| **Page Sparkly** | `ChatPage` |
| **Endpoint** | `GET /messages/thread/{missionId}` |
| **Auth requise** | ✅ Oui |

### Paramètres

| Paramètre | Type | Requis | Emplacement |
|-----------|------|--------|-------------|
| `missionId` | String | ✅ | Path |

### Exemple de réponse (200 OK)

```json
[
  {
    "id": "msg_001",
    "missionId": "mission_xyz789",
    "senderId": "user_abc123",
    "senderRole": "EMPLOYER",
    "content": "Bonjour, à quelle heure pouvez-vous venir ?",
    "createdAt": "2025-12-02T10:30:00.000Z"
  },
  {
    "id": "msg_002",
    "missionId": "mission_xyz789",
    "senderId": "user_worker_456",
    "senderRole": "WORKER",
    "content": "Je peux venir à 9h demain matin.",
    "createdAt": "2025-12-02T10:35:00.000Z"
  }
]
```

---

## C10. Créer un contrat

### Infos générales

| Propriété | Valeur |
|-----------|--------|
| **Nom API Call FlutterFlow** | `Client_CreateContract` |
| **Page Sparkly** | `ConfirmBookingPage` ou `ContractPage` |
| **Endpoint** | `POST /contracts` |
| **Auth requise** | ✅ Oui |

### Paramètres

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `missionId` | String | ✅ | ID de la mission |
| `amount` | Number | ✅ | Montant total |
| `hourlyRate` | Number | ❌ | Taux horaire (optionnel) |
| `startAt` | DateTime | ❌ | Date de début |
| `endAt` | DateTime | ❌ | Date de fin |

### Exemple de requête

```json
{
  "missionId": "mission_xyz789",
  "amount": 120.00,
  "hourlyRate": 30.00,
  "startAt": "2025-12-03T09:00:00.000Z",
  "endAt": "2025-12-03T13:00:00.000Z"
}
```

### Exemple de réponse (201 Created)

```json
{
  "id": "contract_abc123",
  "missionId": "mission_xyz789",
  "employerId": "user_abc123",
  "workerId": "user_worker_456",
  "status": "DRAFT",
  "amount": 120.00,
  "hourlyRate": 30.00,
  "startAt": "2025-12-03T09:00:00.000Z",
  "endAt": "2025-12-03T13:00:00.000Z",
  "signedByWorker": false,
  "signedByEmployer": false,
  "createdAt": "2025-12-02T11:00:00.000Z"
}
```

---

## C11. Envoyer le contrat au Provider (passer en PENDING)

### Infos générales

| Propriété | Valeur |
|-----------|--------|
| **Nom API Call FlutterFlow** | `Client_SendContract` |
| **Page Sparkly** | `ContractPage` (bouton "Send") |
| **Endpoint** | `PATCH /contracts/{contractId}/status` |
| **Auth requise** | ✅ Oui |

### Paramètres

| Paramètre | Type | Requis | Emplacement |
|-----------|------|--------|-------------|
| `contractId` | String | ✅ | Path |
| `status` | String | ✅ | Body - **Valeur: `"PENDING"`** |

### Exemple de requête

```json
{
  "status": "PENDING"
}
```

### Exemple de réponse (200 OK)

```json
{
  "id": "contract_abc123",
  "status": "PENDING",
  "signedByEmployer": true,
  "updatedAt": "2025-12-02T11:30:00.000Z"
}
```

---

## C12. Voir mes notifications

### Infos générales

| Propriété | Valeur |
|-----------|--------|
| **Nom API Call FlutterFlow** | `Client_GetNotifications` |
| **Page Sparkly** | `NotificationsPage` |
| **Endpoint** | `GET /notifications` |
| **Auth requise** | ✅ Oui |

### Paramètres (optionnels)

| Paramètre | Type | Requis | Emplacement |
|-----------|------|--------|-------------|
| `unreadOnly` | String | ❌ | Query - `"true"` pour seulement non lues |

### Exemple de réponse (200 OK)

```json
[
  {
    "id": "notif_001",
    "userId": "user_abc123",
    "type": "MISSION_ACCEPTED",
    "payloadJSON": {
      "missionId": "mission_xyz789",
      "missionTitle": "Nettoyage appartement",
      "workerName": "Jean Tremblay"
    },
    "readAt": null,
    "createdAt": "2025-12-02T11:00:00.000Z"
  }
]
```

---

## C13. Compter les notifications non lues

### Infos générales

| Propriété | Valeur |
|-----------|--------|
| **Nom API Call FlutterFlow** | `Client_GetUnreadNotifCount` |
| **Page Sparkly** | Badge sur icône notifications |
| **Endpoint** | `GET /notifications/unread-count` |
| **Auth requise** | ✅ Oui |

### Exemple de réponse (200 OK)

```json
{
  "count": 3
}
```

---

## C14. Payer une mission (Stripe)

### Infos générales

| Propriété | Valeur |
|-----------|--------|
| **Nom API Call FlutterFlow** | `Client_CreatePaymentIntent` |
| **Page Sparkly** | `PaymentPage` ou `CheckoutPage` |
| **Endpoint** | `POST /payments/intent` |
| **Auth requise** | ✅ Oui |

### Paramètres

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `missionId` | String | ✅ | ID de la mission |

### Exemple de requête

```json
{
  "missionId": "mission_xyz789"
}
```

### Exemple de réponse (201 Created)

```json
{
  "paymentIntentId": "pi_xxx",
  "clientSecret": "pi_xxx_secret_yyy",
  "amount": 120.00,
  "currency": "cad",
  "status": "requires_payment_method"
}
```

### Notes

> ✅ **CONFIRMÉ:** 
> - Le `clientSecret` doit être utilisé avec le SDK Stripe FlutterFlow pour finaliser le paiement.
> - Le montant vient du champ `price` de la mission (`LocalMission.price`).
> - Pour les paiements avec Stripe Connect (où le provider reçoit l'argent), utilisez `POST /payments/connect/intent`.

---

# FONCTIONNALITÉS PROVIDER (Worker)

> Le **PROVIDER** dans WorkOn = le travailleur qui accepte et réalise des missions (équivalent au "Cleaner" dans Sparkly)

---

## P1. Créer un compte Provider

### Infos générales

| Propriété | Valeur |
|-----------|--------|
| **Nom API Call FlutterFlow** | `Provider_Register` |
| **Page Sparkly** | `SignUpPage` (Provider flow) |
| **Endpoint** | `POST /auth/register` |
| **Auth requise** | ❌ Non |

### Paramètres

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `email` | String | ✅ | Email |
| `password` | String | ✅ | Mot de passe |
| `firstName` | String | ✅ | Prénom |
| `lastName` | String | ✅ | Nom |
| `phone` | String | ❌ | Téléphone |
| `city` | String | ❌ | Ville |
| `role` | String | ✅ | **Valeur fixe: `"worker"`** |

### Exemple de requête

```json
{
  "email": "provider@example.com",
  "password": "SecurePass123!",
  "firstName": "Jean",
  "lastName": "Tremblay",
  "phone": "+1514555001",
  "city": "Montréal",
  "role": "worker"
}
```

### Exemple de réponse

Identique à C1, avec `"role": "worker"`.

---

## P2. Connexion Provider

### Infos générales

| Propriété | Valeur |
|-----------|--------|
| **Nom API Call FlutterFlow** | `Provider_Login` |
| **Page Sparkly** | `LoginPage` |
| **Endpoint** | `POST /auth/login` |
| **Auth requise** | ❌ Non |

Identique à C2.

---

## P3. Voir les missions disponibles près de moi

### Infos générales

| Propriété | Valeur |
|-----------|--------|
| **Nom API Call FlutterFlow** | `Provider_GetNearbyMissions` |
| **Page Sparkly** | `JobsPage` ou `AvailableJobsPage` |
| **Endpoint** | `GET /missions/nearby` |
| **Auth requise** | ✅ Oui |

### Paramètres

| Paramètre | Type | Requis | Emplacement |
|-----------|------|--------|-------------|
| `latitude` | Number | ✅ | Query |
| `longitude` | Number | ✅ | Query |
| `radiusKm` | Number | ❌ | Query (défaut: 10) |

### Exemple d'URL

```
GET /missions/nearby?latitude=45.5017&longitude=-73.5673&radiusKm=15
```

### Exemple de réponse (200 OK)

```json
[
  {
    "id": "mission_xyz789",
    "title": "Nettoyage appartement 3 pièces",
    "description": "Nettoyage complet...",
    "category": "cleaning",
    "status": "open",
    "price": 120.00,
    "latitude": 45.5020,
    "longitude": -73.5680,
    "address": "123 Rue Sainte-Catherine",
    "city": "Montréal",
    "createdAt": "2025-12-02T10:00:00.000Z",
    "distance": 0.8
  },
  {
    "id": "mission_abc456",
    "title": "Ménage maison",
    "status": "open",
    "price": 200.00,
    "city": "Montréal",
    "distance": 2.3
  }
]
```

### Champs importants

| Champ | Description |
|-------|-------------|
| `distance` | Distance en km depuis la position du provider |
| `status` | Doit être `open` pour être visible |

---

## P4. Accepter une mission

### Infos générales

| Propriété | Valeur |
|-----------|--------|
| **Nom API Call FlutterFlow** | `Provider_AcceptMission` |
| **Page Sparkly** | `JobDetailPage` (bouton "Accept") |
| **Endpoint** | `POST /missions/{missionId}/accept` |
| **Auth requise** | ✅ Oui |

### Paramètres

| Paramètre | Type | Requis | Emplacement |
|-----------|------|--------|-------------|
| `missionId` | String | ✅ | Path |

### Exemple de réponse (200 OK)

```json
{
  "id": "mission_xyz789",
  "status": "assigned",
  "assignedToUserId": "user_worker_456",
  "updatedAt": "2025-12-02T11:00:00.000Z"
}
```

---

## P4b. Démarrer une mission

### Infos générales

| Propriété | Valeur |
|-----------|--------|
| **Nom API Call FlutterFlow** | `Provider_StartMission` |
| **Page Sparkly** | `JobDetailPage` (bouton "Start") |
| **Endpoint** | `POST /missions/{missionId}/start` |
| **Auth requise** | ✅ Oui |

### Paramètres

| Paramètre | Type | Requis | Emplacement |
|-----------|------|--------|-------------|
| `missionId` | String | ✅ | Path |

### Exemple de réponse (200 OK)

```json
{
  "id": "mission_xyz789",
  "status": "in_progress",
  "assignedToUserId": "user_worker_456",
  "updatedAt": "2025-12-02T11:30:00.000Z"
}
```

### Workflow

```
assigned → in_progress → completed
```

Seul le worker assigné peut démarrer la mission.

---

## P5. Voir mes missions assignées

### Infos générales

| Propriété | Valeur |
|-----------|--------|
| **Nom API Call FlutterFlow** | `Provider_GetMyAssignments` |
| **Page Sparkly** | `MyJobsPage` ou `SchedulePage` |
| **Endpoint** | `GET /missions/my-assignments` |
| **Auth requise** | ✅ Oui |

### Exemple de réponse (200 OK)

```json
[
  {
    "id": "mission_xyz789",
    "title": "Nettoyage appartement 3 pièces",
    "status": "assigned",
    "price": 120.00,
    "address": "123 Rue Sainte-Catherine",
    "city": "Montréal",
    "createdAt": "2025-12-02T10:00:00.000Z"
  },
  {
    "id": "mission_def789",
    "title": "Jardinage",
    "status": "in_progress",
    "price": 80.00,
    "city": "Laval",
    "createdAt": "2025-12-01T09:00:00.000Z"
  }
]
```

---

## P6. Marquer une mission comme terminée

### Infos générales

| Propriété | Valeur |
|-----------|--------|
| **Nom API Call FlutterFlow** | `Provider_CompleteMission` |
| **Page Sparkly** | `JobDetailPage` (bouton "Complete") |
| **Endpoint** | `POST /missions/{missionId}/complete` |
| **Auth requise** | ✅ Oui |

### Paramètres

| Paramètre | Type | Requis | Emplacement |
|-----------|------|--------|-------------|
| `missionId` | String | ✅ | Path |

### Exemple de réponse

Identique à C7.

---

## P7. Envoyer un message au Client

### Infos générales

| Propriété | Valeur |
|-----------|--------|
| **Nom API Call FlutterFlow** | `Provider_SendMessage` |
| **Page Sparkly** | `ChatPage` |
| **Endpoint** | `POST /messages` |
| **Auth requise** | ✅ Oui |

Identique à C8. Le `senderRole` sera automatiquement `WORKER`.

---

## P8. Voir les messages d'une mission

### Infos générales

| Propriété | Valeur |
|-----------|--------|
| **Nom API Call FlutterFlow** | `Provider_GetMessages` |
| **Page Sparkly** | `ChatPage` |
| **Endpoint** | `GET /messages/thread/{missionId}` |
| **Auth requise** | ✅ Oui |

Identique à C9.

---

## P9. Voir mes contrats

### Infos générales

| Propriété | Valeur |
|-----------|--------|
| **Nom API Call FlutterFlow** | `Provider_GetMyContracts` |
| **Page Sparkly** | `ContractsPage` ou `EarningsPage` |
| **Endpoint** | `GET /contracts/user/me` |
| **Auth requise** | ✅ Oui |

### Exemple de réponse (200 OK)

```json
[
  {
    "id": "contract_abc123",
    "missionId": "mission_xyz789",
    "status": "PENDING",
    "amount": 120.00,
    "signedByWorker": false,
    "signedByEmployer": true,
    "createdAt": "2025-12-02T11:00:00.000Z",
    "mission": {
      "id": "mission_xyz789",
      "title": "Nettoyage appartement"
    }
  }
]
```

---

## P10. Accepter un contrat

### Infos générales

| Propriété | Valeur |
|-----------|--------|
| **Nom API Call FlutterFlow** | `Provider_AcceptContract` |
| **Page Sparkly** | `ContractDetailPage` (bouton "Accept") |
| **Endpoint** | `PATCH /contracts/{contractId}/status` |
| **Auth requise** | ✅ Oui |

### Paramètres

| Paramètre | Type | Requis | Emplacement |
|-----------|------|--------|-------------|
| `contractId` | String | ✅ | Path |
| `status` | String | ✅ | Body - **Valeur: `"ACCEPTED"`** |

### Exemple de requête

```json
{
  "status": "ACCEPTED"
}
```

### Exemple de réponse (200 OK)

```json
{
  "id": "contract_abc123",
  "status": "ACCEPTED",
  "signedByWorker": true,
  "signedByEmployer": true,
  "updatedAt": "2025-12-02T12:00:00.000Z"
}
```

---

## P11. Refuser un contrat

### Infos générales

| Propriété | Valeur |
|-----------|--------|
| **Nom API Call FlutterFlow** | `Provider_RejectContract` |
| **Page Sparkly** | `ContractDetailPage` (bouton "Reject") |
| **Endpoint** | `PATCH /contracts/{contractId}/status` |
| **Auth requise** | ✅ Oui |

### Paramètres

| Paramètre | Type | Requis | Emplacement |
|-----------|------|--------|-------------|
| `contractId` | String | ✅ | Path |
| `status` | String | ✅ | Body - **Valeur: `"REJECTED"`** |

### Exemple de requête

```json
{
  "status": "REJECTED"
}
```

---

## P12. Voir mes notifications

### Infos générales

| Propriété | Valeur |
|-----------|--------|
| **Nom API Call FlutterFlow** | `Provider_GetNotifications` |
| **Page Sparkly** | `NotificationsPage` |
| **Endpoint** | `GET /notifications` |
| **Auth requise** | ✅ Oui |

Identique à C12.

---

## P13. Voir le ratio workers/employeurs (Dashboard)

### Infos générales

| Propriété | Valeur |
|-----------|--------|
| **Nom API Call FlutterFlow** | `Provider_GetMarketRatio` |
| **Page Sparkly** | `DashboardPage` ou `EarningsPage` |
| **Endpoint** | `GET /metrics/ratio` |
| **Auth requise** | ❌ Non |

### Paramètres (optionnels)

| Paramètre | Type | Requis | Emplacement |
|-----------|------|--------|-------------|
| `region` | String | ❌ | Query |

### Exemple d'URL

```
GET /metrics/ratio?region=Montréal
```

### Exemple de réponse (200 OK)

```json
{
  "workers": 150,
  "employers": 80,
  "ratio": 1.875,
  "region": "Montréal",
  "message": "Forte demande de workers dans cette région"
}
```

---

## P14. Onboarding Stripe Connect

### Infos générales

| Propriété | Valeur |
|-----------|--------|
| **Nom API Call FlutterFlow** | `Provider_GetStripeOnboardingLink` |
| **Page Sparkly** | `SettingsPage` ou `PaymentSetupPage` |
| **Endpoint** | `GET /payments/connect/onboarding` |
| **Auth requise** | ✅ Oui |

### Exemple de réponse (200 OK)

```json
{
  "url": "https://connect.stripe.com/setup/..."
}
```

### Notes

> ✅ **CONFIRMÉ:**
> - L'URL d'onboarding doit être ouverte dans un **navigateur externe** (pas WebView) car Stripe l'exige pour la sécurité.
> - Dans FlutterFlow, utilisez `launchUrl` avec `mode: LaunchMode.externalApplication`.
> - Après l'onboarding, Stripe redirige vers votre URL de retour (configurable dans Stripe Dashboard).
> - Appelez `GET /payments/connect/status` pour vérifier si l'onboarding est complet.

---

## P15. Vérifier le statut Stripe Connect

### Infos générales

| Propriété | Valeur |
|-----------|--------|
| **Nom API Call FlutterFlow** | `Provider_GetStripeStatus` |
| **Page Sparkly** | `SettingsPage` ou `EarningsPage` |
| **Endpoint** | `GET /payments/connect/status` |
| **Auth requise** | ✅ Oui |

### Exemple de réponse (200 OK)

```json
{
  "hasAccount": true,
  "accountId": "acct_xxx",
  "chargesEnabled": true,
  "payoutsEnabled": true,
  "detailsSubmitted": true
}
```

---

# FONCTIONNALITÉS COMMUNES

---

## X1. Vérifier le token au démarrage

### Infos générales

| Propriété | Valeur |
|-----------|--------|
| **Nom API Call FlutterFlow** | `Auth_GetMe` |
| **Page Sparkly** | `SplashPage` (on load) |
| **Endpoint** | `GET /auth/me` |
| **Auth requise** | ✅ Oui |

### Exemple de réponse (200 OK)

```json
{
  "id": "user_abc123",
  "email": "user@example.com",
  "firstName": "Marie",
  "lastName": "Dupont",
  "role": "employer",
  "phone": "+1514555000",
  "city": "Montréal",
  "createdAt": "2025-01-15T10:00:00.000Z"
}
```

### Logique FlutterFlow

```
On Page Load (SplashPage):
1. Si authToken est vide → Navigate to LoginPage
2. Sinon → Call Auth_GetMe
   - Si 200 OK:
     - Si role == "worker" → Navigate to ProviderDashboard
     - Si role == "employer" → Navigate to ClientDashboard
   - Si 401 Error:
     - Clear authToken
     - Navigate to LoginPage
```

---

## X2. Voir mon profil

### Infos générales

| Propriété | Valeur |
|-----------|--------|
| **Nom API Call FlutterFlow** | `User_GetProfile` |
| **Page Sparkly** | `ProfilePage` |
| **Endpoint** | `GET /users/me` |
| **Auth requise** | ✅ Oui |

### Exemple de réponse (200 OK)

```json
{
  "id": "user_abc123",
  "email": "user@example.com",
  "firstName": "Marie",
  "lastName": "Dupont",
  "role": "employer",
  "phone": "+1514555000",
  "city": "Montréal",
  "createdAt": "2025-01-15T10:00:00.000Z"
}
```

---

## X3. Mettre à jour mon profil

### Infos générales

| Propriété | Valeur |
|-----------|--------|
| **Nom API Call FlutterFlow** | `User_UpdateProfile` |
| **Page Sparkly** | `EditProfilePage` |
| **Endpoint** | `PATCH /users/me` |
| **Auth requise** | ✅ Oui |

### Paramètres

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `firstName` | String | ❌ | Prénom |
| `lastName` | String | ❌ | Nom |
| `phone` | String | ❌ | Téléphone |
| `city` | String | ❌ | Ville |

### Exemple de requête

```json
{
  "firstName": "Marie-Claire",
  "phone": "+1514555999",
  "city": "Laval"
}
```

### Exemple de réponse (200 OK)

```json
{
  "id": "user_abc123",
  "email": "user@example.com",
  "firstName": "Marie-Claire",
  "lastName": "Dupont",
  "phone": "+1514555999",
  "city": "Laval"
}
```

---

## X4. Marquer une notification comme lue

### Infos générales

| Propriété | Valeur |
|-----------|--------|
| **Nom API Call FlutterFlow** | `Notif_MarkAsRead` |
| **Page Sparkly** | `NotificationsPage` (on tap notification) |
| **Endpoint** | `PATCH /notifications/{notificationId}/read` |
| **Auth requise** | ✅ Oui |

### Paramètres

| Paramètre | Type | Requis | Emplacement |
|-----------|------|--------|-------------|
| `notificationId` | String | ✅ | Path |

### Exemple de réponse (200 OK)

```json
{
  "success": true
}
```

---

## X5. Marquer toutes les notifications comme lues

### Infos générales

| Propriété | Valeur |
|-----------|--------|
| **Nom API Call FlutterFlow** | `Notif_MarkAllAsRead` |
| **Page Sparkly** | `NotificationsPage` (bouton "Mark all as read") |
| **Endpoint** | `PATCH /notifications/read-all` |
| **Auth requise** | ✅ Oui |

### Exemple de réponse (200 OK)

```json
{
  "success": true
}
```

---

## X6. Marquer les messages comme lus

### Infos générales

| Propriété | Valeur |
|-----------|--------|
| **Nom API Call FlutterFlow** | `Messages_MarkAsRead` |
| **Page Sparkly** | `ChatPage` (on page load) |
| **Endpoint** | `PATCH /messages/read/{missionId}` |
| **Auth requise** | ✅ Oui |

### Paramètres

| Paramètre | Type | Requis | Emplacement |
|-----------|------|--------|-------------|
| `missionId` | String | ✅ | Path |

### Exemple de réponse (200 OK)

```json
{
  "count": 5
}
```

---

## X7. Compter les messages non lus

### Infos générales

| Propriété | Valeur |
|-----------|--------|
| **Nom API Call FlutterFlow** | `Messages_GetUnreadCount` |
| **Page Sparkly** | Badge sur icône messages |
| **Endpoint** | `GET /messages/unread-count` |
| **Auth requise** | ✅ Oui |

### Exemple de réponse (200 OK)

```json
{
  "count": 3
}
```

---

## X8. Health Check (Debug)

### Infos générales

| Propriété | Valeur |
|-----------|--------|
| **Nom API Call FlutterFlow** | `Debug_HealthCheck` |
| **Page Sparkly** | N/A (debug only) |
| **Endpoint** | `GET /healthz` (sans préfixe /api/v1) |
| **Auth requise** | ❌ Non |

### URL complète

```
GET https://workon-backend-production-8908.up.railway.app/healthz
```

### Exemple de réponse (200 OK)

```json
{
  "status": "ok",
  "timestamp": "2025-12-02T10:00:00.000Z"
}
```

---

# RATINGS (NOUVEAU)

> Système de notation après mission complétée. Client et Provider peuvent se noter mutuellement.

---

## R1. Créer un rating

### Infos générales

| Propriété | Valeur |
|-----------|--------|
| **Nom API Call FlutterFlow** | `Rating_Create` |
| **Page Sparkly** | `RatingPage` ou `CompletedJobPage` |
| **Endpoint** | `POST /ratings` |
| **Auth requise** | ✅ Oui |

### Paramètres

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `missionId` | String | ✅ | ID de la mission terminée |
| `rating` | Number | ✅ | Note de 1 à 5 |
| `comment` | String | ❌ | Commentaire optionnel (max 1000 chars) |

### Exemple de requête

```json
{
  "missionId": "mission_xyz789",
  "rating": 5,
  "comment": "Excellent travail ! Très professionnel et ponctuel."
}
```

### Exemple de réponse (201 Created)

```json
{
  "id": "rating_abc123",
  "missionId": "mission_xyz789",
  "authorId": "user_client_123",
  "targetId": "user_worker_456",
  "rating": 5,
  "comment": "Excellent travail ! Très professionnel et ponctuel.",
  "type": "CLIENT_TO_PROVIDER",
  "createdAt": "2025-12-02T16:00:00.000Z"
}
```

### Notes

- La mission doit être en statut `completed`
- Chaque utilisateur ne peut noter qu'une fois par mission
- Le type est déterminé automatiquement (CLIENT_TO_PROVIDER ou PROVIDER_TO_CLIENT)

---

## R2. Voir mes ratings

### Infos générales

| Propriété | Valeur |
|-----------|--------|
| **Nom API Call FlutterFlow** | `Rating_GetMine` |
| **Page Sparkly** | `ProfilePage` |
| **Endpoint** | `GET /ratings/me` |
| **Auth requise** | ✅ Oui |

### Exemple de réponse (200 OK)

```json
{
  "summary": {
    "averageRating": 4.8,
    "totalReceived": 25,
    "totalGiven": 20
  },
  "given": [...],
  "received": [...]
}
```

---

## R3. Voir les ratings d'un utilisateur

### Infos générales

| Propriété | Valeur |
|-----------|--------|
| **Nom API Call FlutterFlow** | `Rating_GetUser` |
| **Page Sparkly** | `ProviderProfilePage` |
| **Endpoint** | `GET /ratings/user/{userId}` |
| **Auth requise** | ✅ Oui |

### Paramètres

| Paramètre | Type | Requis | Emplacement |
|-----------|------|--------|-------------|
| `userId` | String | ✅ | Path |

### Exemple de réponse (200 OK)

```json
{
  "user": {
    "id": "user_worker_456",
    "firstName": "Jean",
    "lastName": "Tremblay",
    "role": "worker"
  },
  "summary": {
    "averageRating": 4.9,
    "totalRatings": 50,
    "ratingDistribution": {
      "5": 45,
      "4": 4,
      "3": 1,
      "2": 0,
      "1": 0
    }
  },
  "ratings": [...]
}
```

---

## R4. Voir les ratings d'une mission

### Infos générales

| Propriété | Valeur |
|-----------|--------|
| **Nom API Call FlutterFlow** | `Rating_GetMission` |
| **Page Sparkly** | `CompletedJobDetailPage` |
| **Endpoint** | `GET /ratings/mission/{missionId}` |
| **Auth requise** | ✅ Oui |

### Exemple de réponse (200 OK)

```json
{
  "mission": {
    "id": "mission_xyz789",
    "title": "Nettoyage appartement",
    "status": "completed"
  },
  "clientRating": {
    "rating": 5,
    "comment": "Excellent travail !"
  },
  "providerRating": {
    "rating": 5,
    "comment": "Client très agréable"
  }
}
```

---

# PHOTOS (NOUVEAU)

> Gestion des photos de mission. FlutterFlow upload vers Supabase/Firebase, puis enregistre l'URL dans le backend.

---

## PH1. Enregistrer une photo

### Infos générales

| Propriété | Valeur |
|-----------|--------|
| **Nom API Call FlutterFlow** | `Photo_Create` |
| **Page Sparkly** | `JobDetailPage` |
| **Endpoint** | `POST /photos` |
| **Auth requise** | ✅ Oui |

### Workflow FlutterFlow

1. **Uploader le fichier** vers Supabase Storage (ou Firebase Storage)
2. **Récupérer l'URL** publique ou signée
3. **Appeler cet endpoint** pour enregistrer l'URL

### Paramètres

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `missionId` | String | ✅ | ID de la mission |
| `url` | String | ✅ | URL HTTPS de la photo |
| `mimeType` | String | ✅ | Type MIME (image/jpeg, image/png, etc.) |
| `sizeBytes` | Number | ✅ | Taille en bytes (max 10MB) |
| `thumbnailUrl` | String | ❌ | URL de la miniature |
| `description` | String | ❌ | Description de la photo |

### Exemple de requête

```json
{
  "missionId": "mission_xyz789",
  "url": "https://storage.supabase.co/bucket/photo123.jpg",
  "mimeType": "image/jpeg",
  "sizeBytes": 1048576,
  "thumbnailUrl": "https://storage.supabase.co/bucket/photo123_thumb.jpg",
  "description": "Avant nettoyage - cuisine"
}
```

### Exemple de réponse (201 Created)

```json
{
  "id": "photo_abc123",
  "missionId": "mission_xyz789",
  "uploaderId": "user_worker_456",
  "url": "https://storage.supabase.co/bucket/photo123.jpg",
  "mimeType": "image/jpeg",
  "sizeBytes": 1048576,
  "createdAt": "2025-12-02T10:30:00.000Z"
}
```

### Types MIME acceptés

- `image/jpeg`
- `image/jpg`
- `image/png`
- `image/webp`
- `image/gif`

---

## PH2. Voir les photos d'une mission

### Infos générales

| Propriété | Valeur |
|-----------|--------|
| **Nom API Call FlutterFlow** | `Photo_GetMission` |
| **Page Sparkly** | `JobDetailPage` |
| **Endpoint** | `GET /photos/mission/{missionId}` |
| **Auth requise** | ✅ Oui |

### Exemple de réponse (200 OK)

```json
{
  "mission": {
    "id": "mission_xyz789",
    "title": "Nettoyage appartement"
  },
  "photos": [
    {
      "id": "photo_abc123",
      "url": "https://storage.supabase.co/bucket/photo123.jpg",
      "thumbnailUrl": "https://storage.supabase.co/bucket/photo123_thumb.jpg",
      "description": "Avant nettoyage",
      "createdAt": "2025-12-02T10:30:00.000Z"
    }
  ],
  "totalCount": 1
}
```

---

## PH3. Supprimer une photo

### Infos générales

| Propriété | Valeur |
|-----------|--------|
| **Nom API Call FlutterFlow** | `Photo_Delete` |
| **Page Sparkly** | `JobDetailPage` |
| **Endpoint** | `DELETE /photos/{photoId}` |
| **Auth requise** | ✅ Oui |

### Notes

> ⚠️ Cet endpoint supprime seulement l'enregistrement dans la DB.
> Vous devez aussi supprimer le fichier de Supabase/Firebase côté FlutterFlow.

---

# STRIPE CONNECT (PROVIDER)

> Onboarding Stripe Connect pour les workers.

---

## SC1. Démarrer l'onboarding Stripe

### Infos générales

| Propriété | Valeur |
|-----------|--------|
| **Nom API Call FlutterFlow** | `Stripe_StartOnboarding` |
| **Page Sparkly** | `PaymentSetupPage` |
| **Endpoint** | `POST /payments/connect/onboard` |
| **Auth requise** | ✅ Oui (worker uniquement) |

### Exemple de réponse (201 Created)

```json
{
  "url": "https://connect.stripe.com/setup/...",
  "accountId": "acct_xxxxx"
}
```

### Utilisation FlutterFlow

1. Appeler cet endpoint
2. Ouvrir l'URL dans un WebView ou navigateur externe
3. L'utilisateur complète l'onboarding sur Stripe
4. Redirection vers `FRONTEND_URL/provider/stripe/complete`

---

## SC2. Rafraîchir le lien d'onboarding

### Infos générales

| Propriété | Valeur |
|-----------|--------|
| **Nom API Call FlutterFlow** | `Stripe_RefreshOnboarding` |
| **Page Sparkly** | `PaymentSetupPage` |
| **Endpoint** | `POST /payments/connect/refresh` |
| **Auth requise** | ✅ Oui |

### Notes

Si le lien d'onboarding a expiré, utiliser cet endpoint pour en générer un nouveau.

---

## SC3. Vérifier le statut Stripe

### Infos générales

| Propriété | Valeur |
|-----------|--------|
| **Nom API Call FlutterFlow** | `Stripe_GetStatus` |
| **Page Sparkly** | `EarningsPage` ou `SettingsPage` |
| **Endpoint** | `GET /payments/connect/status` |
| **Auth requise** | ✅ Oui |

### Exemple de réponse (200 OK)

```json
{
  "hasAccount": true,
  "accountId": "acct_xxxxx",
  "chargesEnabled": true,
  "payoutsEnabled": true,
  "detailsSubmitted": true,
  "onboardingComplete": true
}
```

### Champs importants

| Champ | Description |
|-------|-------------|
| `onboardingComplete` | `true` = le worker peut recevoir des paiements |
| `chargesEnabled` | Stripe peut débiter ce compte |
| `payoutsEnabled` | Stripe peut verser sur ce compte |

---

## SC4. Créer un paiement Connect

### Infos générales

| Propriété | Valeur |
|-----------|--------|
| **Nom API Call FlutterFlow** | `Stripe_CreateConnectPayment` |
| **Page Sparkly** | `PaymentPage` |
| **Endpoint** | `POST /payments/connect/intent` |
| **Auth requise** | ✅ Oui (employer/client) |

### Paramètres

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `missionId` | String | ✅ | ID de la mission |

### Exemple de réponse (201 Created)

```json
{
  "paymentIntentId": "pi_xxxxx",
  "clientSecret": "pi_xxxxx_secret_xxxxx",
  "amount": 10000,
  "currency": "CAD",
  "missionId": "mission_xyz789",
  "platformFee": 1200,
  "workerReceives": 8800
}
```

### Notes

- Le `platformFee` est 12% du montant
- Le `workerReceives` est le montant après déduction des frais
- Utiliser `clientSecret` avec le SDK Stripe pour finaliser le paiement

---

# MAPPING PAGES SPARKLY → ENDPOINTS

## Vue d'ensemble

| Page Sparkly | Type | Endpoints à configurer |
|--------------|------|------------------------|
| `SplashPage` | Commune | `Auth_GetMe` |
| `LoginPage` | Commune | `Client_Login` ou `Provider_Login` |
| `SignUpPage` | Commune | `Client_Register` ou `Provider_Register` |
| `ForgotPasswordPage` | Commune | ✅ `Auth_ForgotPassword`, `Auth_ResetPassword` |
| `HomePage` (Client) | Client | `Client_GetMyMissions` |
| `HomePage` (Provider) | Provider | `Provider_GetNearbyMissions` |
| `JobsPage` | Provider | `Provider_GetNearbyMissions` |
| `JobDetailPage` | Provider | `Provider_AcceptMission`, `Provider_StartMission`, `Provider_CompleteMission` |
| `MyJobsPage` | Provider | `Provider_GetMyAssignments` |
| `CreateBookingPage` | Client | `Client_CreateMission` |
| `MyBookingsPage` | Client | `Client_GetMyMissions` |
| `BookingDetailPage` | Client | `Client_GetMissionDetail`, `Client_CancelMission`, `Client_CompleteMission` |
| `ChatPage` | Commune | ⚠️ **Désactivé MVP** - Utiliser notifications |
| `ProfilePage` | Commune | `User_GetProfile` |
| `EditProfilePage` | Commune | `User_UpdateProfile` |
| `NotificationsPage` | Commune | `*_GetNotifications`, `Notif_MarkAsRead` |
| `ContractsPage` | Provider | ⚠️ **Désactivé MVP** |
| `ContractDetailPage` | Both | ⚠️ **Désactivé MVP** |
| `PaymentPage` | Client | `Client_CreatePaymentIntent` |
| `EarningsPage` | Provider | `Provider_GetMyContracts`, `Provider_GetMarketRatio` |
| `SettingsPage` | Commune | `User_GetProfile` |
| `PaymentSetupPage` | Provider | `Provider_GetStripeOnboardingLink`, `Provider_GetStripeStatus` |

---

## ✅ Points confirmés (Mis à jour le 9 décembre 2025)

### Architecture

| Question | Réponse | Statut |
|----------|---------|--------|
| Quel module Missions utiliser? | **MissionsLocalModule** (modèle LocalUser) | ✅ Confirmé |
| Endpoint ForgotPassword? | Implémenté: `POST /auth/forgot-password` + `POST /auth/reset-password` | ✅ Confirmé |
| Photos de profil/missions? | Implémenté: FlutterFlow upload vers Supabase, puis `POST /photos` pour enregistrer l'URL | ✅ Confirmé |

### FlutterFlow

| Question | Réponse | Statut |
|----------|---------|--------|
| Stripe SDK? | Utiliser le `clientSecret` avec le Stripe SDK FlutterFlow | ✅ Confirmé |
| Géolocalisation? | FlutterFlow récupère lat/lng, les envoie à `GET /missions/nearby` | ✅ Confirmé |
| Stripe Connect onboarding? | Ouvrir l'URL dans le navigateur externe (pas WebView), puis appeler `GET /payments/connect/status` | ✅ Confirmé |

### Business

| Question | Réponse | Statut |
|----------|---------|--------|
| Workflow MVP | Client crée → Provider accepte → Provider démarre → Paiement → Mission complétée → Ratings | ✅ Confirmé |
| Ratings après mission? | Implémenté: `POST /ratings` après mission complétée | ✅ Confirmé |

---

## ⚠️ Limitations MVP actuelles

| Fonctionnalité | État | Alternative |
|----------------|------|-------------|
| Messages/Chat | ❌ Désactivé | Utiliser les notifications ou email externe |
| Contrats formels | ❌ Désactivé | Mission = accord implicite |
| Upload direct photos | ❌ Côté backend | FlutterFlow → Supabase → Backend URL |

---

**Fin du contrat API**

*Document mis à jour le 9 décembre 2025*  
*Compatible avec WorkOn Backend v1.0.0 (MVP)*

