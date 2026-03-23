# 📋 Plan de conversion Sparkly → WorkOn (FlutterFlow mobile)

> **Date**: 6 février 2026  
> **Objectif**: Convertir les pages du template Sparkly (données fake, hardcoding) vers l'API WorkOn réelle  
> **Scope**: App mobile FlutterFlow uniquement (web exclu)

---

## 🎯 Contexte

Le template **Sparkly** (House Cleaning Services) contient :
- Données factices et listes hardcodées
- Modèle métier "Customer/Cleaner" au lieu de "Employer/Worker"
- Endpoints fictifs ou inexistants
- Vocabulaire "cleaning" à remplacer par "missions" WorkOn

**Référence API**: `docs/FLUTTERFLOW_API_CONTRACT.md`  
**Endpoints réels**: `docs/release/E2E_FLOW_MATRIX.md` + backend NestJS

---

## ⚠️ Différences clés Sparkly ↔ WorkOn

| Sparkly | WorkOn (code) | WorkOn (UI / libellés) |
|---------|---------------|------------------------|
| Customer | employer / residential_client | **Client** ou **Client résidentiel** |
| Cleaner / Provider | worker | **Travailleur** |
| Job / Booking | mission | **Mission** |
| Accept mission directement | Offres (POST offer → PATCH accept) | **Offre** (proposition de service) |

---

## 📖 Vocabulaire UI établi (réf. VISION.md)

> Termes à utiliser dans l’interface utilisateur. Éviter employer, worker, job, booking dans les libellés visibles.

| Terme technique (code/API) | Libellé UI à afficher | À éviter |
|----------------------------|------------------------|----------|
| `worker` | **Travailleur** | Employé, salarié |
| `employer` | **Client** | Employeur (droit du travail) |
| `residential_client` | **Client résidentiel** | — |
| `mission` | **Mission** | Emploi, poste, job |
| `offer` | **Offre** | Candidature, booking |
| `earnings` | **Honoraires** | Salaire, paie |
| Action "publier mission" | **Publier un call** | — |

**Exemples de libellés :**
- Bouton : « Publier un call » (action de créer une mission)
- Navigation : « Offres » (missions disponibles pour les travailleurs)
- Rôles : « Je suis Travailleur », « Je suis Client »
| `/missions` | `/api/v1/missions-local` |
| `/missions/nearby` | `/api/v1/missions-local/nearby` |
| Catégories hardcodées | `GET /api/v1/catalog/categories` (dynamique) |

---

## 📱 TODO LIST — Conversion par phase

---

## PHASE 0 : Prérequis (à faire en premier)

- [ ] **0.1** Créer projet FlutterFlow connecté au repo WorkOn
- [ ] **0.2** Configurer la Base URL : `https://workon-backend-production-8908.up.railway.app/api/v1`
- [ ] **0.3** Créer les **App State Variables** : `authToken`, `currentUserId`, `currentUserEmail`, `currentUserRole`, `currentUserFirstName`, `currentUserLastName`
- [ ] **0.4** Créer les **API Calls** génériques dans FlutterFlow (template avec Header `Authorization: Bearer {{authToken}}`)

---

## PHASE 1 : Auth & Onboarding (Pages communes)

### 1.1 SplashPage
- [ ] Retirer tout hardcoding de redirection
- [ ] Créer API Call `Auth_GetMe` → `GET /auth/me`
- [ ] Logique On Load : si `authToken` vide → Navigate to LoginPage
- [ ] Sinon : appel `Auth_GetMe` → si 200 : `role == "worker"` → ProviderDashboard, sinon → ClientDashboard
- [ ] Si 401 : clear authToken, Navigate to LoginPage

### 1.2 LoginPage
- [ ] Supprimer données fake (email/password de test)
- [ ] Créer `Client_Login` et `Provider_Login` → `POST /auth/login` (même endpoint, body: `{ email, password }`)
- [ ] Sur succès : extraire `accessToken` → `authToken`, `user.*` → App State
- [ ] Navigate selon rôle (Client ou Provider home)

### 1.3 SignUpPage
- [ ] Supprimer données fake
- [ ] Créer `Client_Register` → `POST /auth/register` avec `role: "employer"`
- [ ] Créer `Provider_Register` → `POST /auth/register` avec `role: "worker"`
- [ ] Body : `{ email, password, firstName, lastName, phone?, city?, role }`
- [ ] Sur succès : extraire token + user, Navigate to Home

### 1.4 ForgotPasswordPage
- [ ] Créer `Auth_ForgotPassword` → `POST /auth/forgot-password` avec `{ email }`
- [ ] Créer page ResetPasswordPage si absente

### 1.5 ResetPasswordPage
- [ ] Créer `Auth_ResetPassword` → `POST /auth/reset-password` avec `{ email, token, newPassword }`

### 1.6 Terms / Privacy (Legal Consent)
- [ ] Créer `Compliance_Accept` → `POST /api/v1/compliance/accept`
- [ ] Créer `Compliance_Status` → `GET /api/v1/compliance/status`
- [ ] Remplacer tout hardcoding par appels API
- [ ] Gate : bloquer navigation si consent non accepté

---

## PHASE 2 : Client (Employer) — Flux missions

### 2.1 HomePage (Client)
- [ ] Supprimer données fake de missions
- [ ] Créer `Client_GetMyMissions` → `GET /api/v1/missions-local/my-missions`
- [ ] Binder les listes aux données API (pas de liste statique)
- [ ] Afficher statuts : `open`, `assigned`, `in_progress`, `completed`, `cancelled`

### 2.2 CreateBookingPage (Créer mission)
- [ ] Supprimer catégories hardcodées
- [ ] Créer `Catalog_GetCategories` → `GET /api/v1/catalog/categories`
- [ ] Créer `Client_CreateMission` → `POST /api/v1/missions-local`
- [ ] Body : `{ title, description, category, price, latitude, longitude, city, address? }`
- [ ] Catégories WorkOn : `cleaning`, `snow_removal`, `moving`, `handyman`, `gardening`, `painting`, `delivery`, `other`
- [ ] Utiliser le sélecteur de localisation (Map picker) pour lat/lng

### 2.3 MyBookingsPage
- [ ] Idem HomePage Client : `GET /api/v1/missions-local/my-missions`
- [ ] Supprimer données fake

### 2.4 BookingDetailPage
- [ ] Créer `Client_GetMissionDetail` → `GET /api/v1/missions-local/:id`
- [ ] Créer `Client_CancelMission` → `POST /api/v1/missions-local/:id/cancel`
- [ ] Créer `Client_ConfirmCompletion` → `POST /api/v1/missions-local/:id/complete` (si applicable)
- [ ] Créer `Client_GetOffers` → `GET /api/v1/offers/mission/:missionId`
- [ ] Créer `Client_AcceptOffer` → `PATCH /api/v1/offers/:id/accept`
- [ ] Remplacer tout hardcoding par données dynamiques

### 2.5 PaymentPage
- [ ] Retirer montants fake
- [ ] Créer `Client_CreatePaymentIntent` → `POST /api/v1/payments-local/intent` avec `{ missionId }`
- [ ] Intégrer Stripe SDK avec `clientSecret` retourné
- [ ] Afficher `platformFee`, `workerReceives` si fournis par l’API

---

## PHASE 3 : Provider (Worker) — Flux missions

### 3.1 JobsPage / HomePage (Provider)
- [ ] Supprimer missions fake
- [ ] Créer `Provider_GetNearbyMissions` → `GET /api/v1/missions-local/nearby`
- [ ] Query params : `latitude`, `longitude`, `radiusKm?` (défaut 10)
- [ ] Récupérer la position via `LocationService` (géolocalisation)
- [ ] Binder les cartes aux données API

### 3.2 JobDetailPage (Provider)
- [ ] Créer `Provider_GetMissionDetail` → `GET /api/v1/missions-local/:id`
- [ ] **Ne pas** utiliser "Accept" direct — WorkOn utilise les offres
- [ ] Créer `Provider_CreateOffer` → `POST /api/v1/offers` avec `{ missionId, message?, proposedPrice? }`
- [ ] Créer `Provider_StartMission` → `POST /api/v1/missions-local/:id/start`
- [ ] Créer `Provider_CompleteMission` → `POST /api/v1/missions-local/:id/complete`
- [ ] Afficher boutons selon statut : Apply → Start → Complete

### 3.3 MyJobsPage
- [ ] Supprimer données fake
- [ ] Créer `Provider_GetMyAssignments` → `GET /api/v1/missions-local/my-assignments`
- [ ] Créer `Provider_GetMyOffers` → `GET /api/v1/offers/mine` (pour voir statut des offres)

### 3.4 Filter & Search (composants)
- [ ] Créer `Provider_GetNearbyMissions` avec params : `?category=X&sort=proximity|date|price&query=Z`
- [ ] Binder FilterChips aux catégories `GET /api/v1/catalog/categories`

---

## PHASE 4 : Profil & Paramètres (Communes)

### 4.1 ProfilePage
- [ ] Créer `User_GetProfile` → `GET /api/v1/auth/me` ou `GET /api/v1/users/me`
- [ ] Créer `Rating_GetMine` → `GET /api/v1/reviews/summary` (ou équivalent)
- [ ] Supprimer données fake de profil

### 4.2 EditProfilePage
- [ ] Créer `User_UpdateProfile` → `PATCH /api/v1/users/me`
- [ ] Body : `{ firstName?, lastName?, phone?, city? }`

### 4.3 SettingsPage
- [ ] Reutiliser `User_GetProfile` pour afficher les infos
- [ ] Lier les paramètres aux préférences utilisateur (si API existe)

---

## PHASE 5 : Notifications & Messages

### 5.1 NotificationsPage
- [ ] Créer `Notifications_Get` → `GET /api/v1/notifications`
- [ ] Créer `Notifications_GetUnreadCount` → `GET /api/v1/notifications/unread-count`
- [ ] Créer `Notifications_MarkAsRead` → `PATCH /api/v1/notifications/:id/read`
- [ ] Créer `Notifications_MarkAllRead` → `PATCH /api/v1/notifications/read-all`
- [ ] Supprimer notifications fake

### 5.2 ChatPage (si activé hors MVP)
- [ ] Créer `Messages_GetThread` → `GET /api/v1/messages-local/thread/:missionId`
- [ ] Créer `Messages_Send` → `POST /api/v1/messages-local` avec `{ missionId, content }`
- [ ] Créer `Messages_MarkAsRead` → `PATCH /api/v1/messages-local/read/:missionId`
- [ ] Créer `Messages_GetUnreadCount` → `GET /api/v1/messages-local/unread-count`
- [ ] **Note** : Chat désactivé MVP — utiliser notifications ou masquer la page

---

## PHASE 6 : Paiements & Ratings (Provider)

### 6.1 PaymentSetupPage (Provider)
- [ ] Créer `Provider_GetStripeOnboardingLink` → `GET /api/v1/payments/stripe/connect/onboarding`
- [ ] Créer `Provider_GetStripeStatus` → `GET /api/v1/payments/stripe/connect/status`
- [ ] Ouvrir l’URL onboarding dans navigateur externe (pas WebView)
- [ ] Vérifier après retour : `GET /api/v1/payments/stripe/connect/status`

### 6.2 EarningsPage
- [ ] Créer `Provider_GetEarnings` → `GET /api/v1/earnings/summary` (ou équivalent)
- [ ] Créer `Provider_GetMarketRatio` → `GET /api/v1/metrics/ratio`
- [ ] Supprimer données fake de revenus

### 6.3 RatingPage / Review Dialog
- [ ] Créer `Rating_Create` → `POST /api/v1/reviews` avec `{ missionId, rating, comment? }`
- [ ] Afficher après mission complétée (Client et Provider)
- [ ] Créer `Rating_GetMission` → `GET /api/v1/reviews/mission/:id` si besoin
- [ ] Créer `Rating_GetUser` → `GET /api/v1/reviews/user/:userId` pour profil worker

---

## PHASE 7 : Contracts (Optionnel — MVP désactivé)

- [ ] **7.1** Si Contracts désactivé : masquer ou désactiver `ContractsPage`, `ContractDetailPage`
- [ ] **7.2** Si activé : créer APIs pour `GET /api/v1/contracts`, `PATCH /api/v1/contracts/:id/status`

---

## PHASE 8 : Nettoyage & Cohérence

### 8.1 Vocabulaire (cf. section « Vocabulaire UI établi » ci-dessus)
- [ ] Remplacer "Customer" par **Client** (ou **Client résidentiel** selon le rôle)
- [ ] Remplacer "Cleaner" / "Provider" par **Travailleur**
- [ ] Remplacer "Job" / "Booking" par **Mission**
- [ ] Bouton publier : **Publier un call**
- [ ] Navigation offres : **Offres** (missions disponibles)
- [ ] Ne pas afficher "Employer", "Worker", "Job" dans l’UI — utiliser les libellés français

### 8.2 Gestion des erreurs
- [ ] Parser le format d’erreur WorkOn : `{ error: { code, message, status } }`
- [ ] Afficher messages utilisateur en français

### 8.3 Tests manuels
- [ ] Parcours complet : Client publie call → Travailleur postule (offre) → Client accepte offre → Travailleur démarre → Travailleur complète → Client paie → Avis
- [ ] Vérifier consentement legal avant accès aux offres

---

## 📊 Récapitulatif des endpoints WorkOn (à jour)

| Endpoint | Méthode | Usage |
|----------|---------|-------|
| `/auth/register` | POST | Inscription |
| `/auth/login` | POST | Connexion |
| `/auth/me` | GET | Profil connecté |
| `/auth/forgot-password` | POST | Mot de passe oublié |
| `/auth/reset-password` | POST | Réinitialisation |
| `/api/v1/compliance/accept` | POST | Consentement |
| `/api/v1/compliance/status` | GET | Statut consentement |
| `/api/v1/missions-local` | POST | Créer mission |
| `/api/v1/missions-local/nearby` | GET | Missions à proximité |
| `/api/v1/missions-local/my-missions` | GET | Mes missions (employer) |
| `/api/v1/missions-local/my-assignments` | GET | Mes missions (worker) |
| `/api/v1/missions-local/:id` | GET | Détail mission |
| `/api/v1/missions-local/:id/start` | POST | Démarrer |
| `/api/v1/missions-local/:id/complete` | POST | Compléter |
| `/api/v1/missions-local/:id/cancel` | POST | Annuler |
| `/api/v1/offers` | POST | Créer offre |
| `/api/v1/offers/mission/:id` | GET | Offres d'une mission |
| `/api/v1/offers/mine` | GET | Mes offres |
| `/api/v1/offers/:id/accept` | PATCH | Accepter offre |
| `/api/v1/catalog/categories` | GET | Catégories |
| `/api/v1/catalog/skills` | GET | Skills |
| `/api/v1/payments-local/intent` | POST | PaymentIntent |
| `/api/v1/payments/stripe/connect/onboarding` | GET | Stripe onboarding |
| `/api/v1/payments/stripe/connect/status` | GET | Statut Stripe |
| `/api/v1/notifications` | GET | Notifications |
| `/api/v1/notifications/unread-count` | GET | Badge |
| `/api/v1/reviews` | POST | Créer avis |
| `/api/v1/users/me` | GET, PATCH | Profil |

---

## ✅ Definition of Done par page

Pour chaque page :
1. Aucune donnée fake ou hardcodée
2. Tous les appels API pointent vers WorkOn
3. Gestion des erreurs (401, 404, 403, 400)
4. Loading states pendant les requêtes
5. Données dynamiques liées aux réponses API

---

*Document généré le 6 février 2026*
