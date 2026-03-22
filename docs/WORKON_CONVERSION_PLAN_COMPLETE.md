# 📋 Plan de conversion complet — WorkOn App Flutter native

> **Date**: 6 février 2026  
> **Objectif**: Construire une app Flutter **native** alignée sur le backend WorkOn  
> **Contexte** : Le template Sparkly (FlutterFlow) a été abandonné — il ralentissait et nuisait au projet (logique incompatible avec le backend)  
> **Design**: S'inspirer des mockups (dark theme, rouge, cartes)

---

## 1. ANALYSE DE L'ÉTAT ACTUEL

### 1.1 Conflit UX/UI identifié

| Source | Modèle | Navigation | Gate auth |
|--------|--------|------------|-----------|
| **Template Sparkly** | Customer/Cleaner, Jobs/Bookings | Home Client vs Home Provider séparés | Auth gate en premier |
| **Build local / mockups** | Client/Travailleur, Appels/Contrats | Home unique + barre du bas | Gate sur action |
| **Résultat** | Données mal réparties, incohérences | Conflit de structure | Double logique |

**Cause racine**: Le template impose un flux (Splash → Auth → Home rôle) alors que le design cible impose Home public → Gate sur action → Inscription.

---

### 1.2 Pages Sparkly actuelles (template)

| Page | Rôle | Backend mappé | Cohérent WorkOn ? |
|------|------|---------------|-------------------|
| SplashPage | Commune | Auth_GetMe | ⚠️ À adapter (gate différent) |
| LoginPage | Commune | POST /auth/login | ✅ Garder |
| SignUpPage | Commune | POST /auth/register | ✅ Garder (flow à modifier) |
| ForgotPasswordPage | Commune | POST /auth/forgot-password | ✅ Garder |
| HomePage (Client) | Client | GetMyMissions | ❌ Remplacer par Home unique |
| HomePage (Provider) | Provider | GetNearbyMissions | ❌ Remplacer par Home unique |
| JobsPage | Provider | GetNearbyMissions | ⚠️ Partiel → Carte appels |
| JobDetailPage | Provider | Accept, Start, Complete | ❌ Différent (offres, pas accept direct) |
| MyJobsPage | Provider | GetMyAssignments | ✅ → Mes demandes (onglet Actives) |
| CreateBookingPage | Client | CreateMission | ✅ → Téléphone rouge (demande) |
| MyBookingsPage | Client | GetMyMissions | ✅ → Mes demandes |
| BookingDetailPage | Client | Detail, Cancel, Complete | ✅ → Détail demande |
| ChatPage | Commune | messages-local | ⚠️ MVP désactivé ou simplifier |
| ProfilePage | Commune | User_GetProfile | ✅ Garder |
| EditProfilePage | Commune | User_UpdateProfile | ✅ Garder |
| NotificationsPage | Commune | Notifications | ✅ Garder |
| PaymentPage | Client | CreatePaymentIntent | ✅ Garder |
| PaymentSetupPage | Provider | Stripe onboarding | ✅ Garder |
| ContractsPage | Provider | Désactivé MVP | ❌ Supprimer ou masquer |
| ContractDetailPage | Both | Désactivé MVP | ❌ Supprimer ou masquer |

---

### 1.3 Backend — état et cohérence

| Domaine | Endpoints | Statut | Usage frontend |
|---------|-----------|--------|----------------|
| **Auth** | register, login, me, refresh, forgot, reset | ✅ Complet | Inscription, connexion |
| **Compliance** | accept, status | ✅ Complet | Popup Conditions |
| **Missions (appels)** | POST, nearby, map, my-missions, my-assignments, :id, start, complete, cancel | ✅ Complet | Carte, demandes, détails |
| **Missions-map** | GET (pins), GET :id, GET health | ✅ Complet | Carte pins, stats partielles |
| **Offers** | POST, mission/:id, mine, :id/accept, :id/reject | ✅ Complet | Demandes à confirmer |
| **Profile** | GET me, PATCH me | ✅ Complet | Mon profil |
| **Users** | GET me, PATCH me, GET :id | ✅ Complet | Profil public (détail) |
| **Catalog** | categories, skills | ✅ Complet | Métiers, catégories |
| **Payments** | intent, checkout, Stripe connect | ✅ Complet | Paiement dépôt |
| **Reviews** | POST, GET | ✅ Complet | Avis |
| **Messages** | conversations, thread, POST, read | ✅ Complet | Messages |
| **Notifications** | GET, unread-count, read | ✅ Complet | Badge, liste |
| **Metrics** | ratio (workers, employers) | ✅ Complet | Stats partielles |

**Gaps backend identifiés**:

| Besoin frontend | Backend actuel | Action |
|-----------------|----------------|--------|
| Stats Home (contrats complétés, candidats, appels) | missions-map/health (total, open), metrics/ratio | **Créer** `GET /api/v1/metrics/home-stats` |
| Feed photos + like | Aucun | **Phase 2** — nouveau module Posts/Likes ou mock |
| Swipe candidats (liste travailleurs) | Aucun | **Créer** `GET /api/v1/profiles/workers` ou adapter |

---

## 2. DÉCISIONS — GARDER / SUPPRIMER / CRÉER

### 2.1 À GARDER — Réutilisable

> **Projet existant** : `C:\Users\ouell\Downloads\work_on_v1\work_on_v1` — Flutter natif avec intégrations complètes.  
> **Inventaire détaillé** : [WORKON_V1_MERGE_INVENTORY.md](WORKON_V1_MERGE_INVENTORY.md)
>
> **Si vous avez le code exporté Sparkly** (FlutterFlow → Download Code), extraire aussi :

| Élément | Où chercher | Comment réutiliser |
|---------|-------------|-------------------|
| **Thème dark + rouge** | `theme.dart`, `app_theme.dart`, ou `lib/theme/` | Copier `ColorScheme`, `primaryColor`, `backgroundColor` → `lib/theme/workon_theme.dart` |
| **Composants UI** | Boutons, `TextField`, cartes, `AppBar` | Copier dans `lib/widgets/` ; retirer dépendances FlutterFlow (FF) |
| **LoginPage / SignUpPage** | Layout, champs, validation | Réutiliser structure (email, password, bouton) ; remplacer appels API par vos services |
| **EditProfilePage** | Champs profil (prénom, nom, photo, ville) | Réutiliser formulaire ; lier à `PATCH /users/me` |
| **PaymentPage** | Intégration Stripe (clientSecret, SDK) | Réutiliser flow Stripe ; lier à `POST /payments-local/intent` |
| **Drawer / Menu hamburger** | Structure navigation | Réutiliser items ; adapter liens (Home unique, pas Client/Provider) |
| **Assets** | `assets/images/`, logos, icônes | Copier si alignés mockups (dark, rouge) |

**À retirer du code Sparkly** : `flutter_flow/` (runtime FlutterFlow), `FF*` widgets, `AppState` FF → remplacer par Provider/Riverpod.

### 2.2 À SUPPRIMER ou DÉSACTIVER

| Élément | Raison |
|---------|--------|
| HomePage Client / HomePage Provider séparés | Remplacés par Home unique |
| SplashPage avec gate auth en premier | Nouveau flow : Home → Gate sur action |
| JobsPage (liste missions pour worker) | Remplacé par Carte + Swipe candidats |
| JobDetailPage (Accept direct) | WorkOn utilise offres, pas accept direct |
| ContractsPage, ContractDetailPage | MVP désactivé |
| Routing conditionnel Client/Provider au démarrage | Simplifier |
| Données fake, listes hardcodées | Remplacer par API |

### 2.3 À CRÉER (nouvelles pages / flows)

| Page | Description |
|------|-------------|
| **Home** (landing publique) | Titre, slogan, stats, feed, barre du bas |
| **Barre navigation** | Home, Swipe, Téléphone rouge, Map, Messages |
| **Trouver votre talent** | Swipe sur candidats (travailleurs) |
| **Carte appels** | Pins missions-map |
| **Téléphone rouge** | Choix offre / demande + formulaire |
| **Réservez en 1 tap** | Détails contrat + paiement |
| **Mon dashboard** | Stats globales, partage profil |
| **Mes demandes** (onglets) | À confirmer, Actives, Complétées |
| **Gate inscription** | Sur action (pas au démarrage) |

---

## 3. CHANGEMENTS DÉTAILLÉS — QUOI ET COMMENT

### 3.1 Navigation et structure

| Changement | Comment | Impact |
|------------|---------|--------|
| **Home unique** | Remplacer HomePage Client/Provider par une seule page. Contenu : titre, slogan, stats, feed (ou placeholder), barre du bas. | Tous les liens vers Home pointent ici. |
| **Barre du bas** | Créer composant BottomNav : 5 items (Home, Swipe, Téléphone rouge, Map, Messages). | Remplace tab bar Sparkly. |
| **Menu hamburger** | Garder drawer. Items : M'inscrire, Connexion, Mon profil, Mon dashboard. | Aligné design. |
| **Gate auth** | Au lieu de Splash → Auth : Home affichée. Clic sur Swipe/Map/Téléphone/Messages → si non connecté, ouvrir Inscription. | Flow inversé. |

### 3.2 Pages à modifier

| Page | Changements | Fichiers / zones |
|------|-------------|------------------|
| **SplashPage** | Option A : Rediriger vers Home. Option B : Supprimer, Home = première page. | SplashPage → redirect to Home |
| **SignUpPage** | Flow : Commencer → formulaire profil (prénom, nom, email, tél, ville, métier, photo) → Compléter → Popup Conditions → API compliance/accept → Home. | Ajouter step profil, popup Conditions |
| **LoginPage** | Garder. Après login → Home (pas Client/Provider home). | Changer redirect |
| **ProfilePage** | Fusionner avec "Mon profil" : profil éditable + onglets Demandes (À confirmer, Actives, Complétées). | Restructurer layout |
| **CreateBookingPage** | Renommer / réutiliser pour "Téléphone rouge". Ajouter choix : Publier offre (worker) ou Publier demande (client). Deux formulaires. | Choix + 2 formulaires |
| **MyBookingsPage / MyJobsPage** | Fusionner en "Mes demandes" avec 3 onglets. Données : my-missions (client) + my-assignments (worker) + offers (à confirmer). | Nouveau composant onglets |
| **BookingDetailPage** | Garder pour détail. Ajouter actions Confirmer/Refuser pour offres. Client : voir offres, accepter. Worker : voir statut. | Adapter actions |
| **JobDetailPage** | Remplacer par "Réservez en 1 tap" (côté client) ou détail mission (côté worker). Pas d’"Accept" direct. | Refonte ou suppression |

### 3.3 Nouvelles pages

| Page | Données | API |
|------|---------|-----|
| **Home** | Stats : metrics/home-stats (à créer) ou missions-map/health + metrics/ratio. Feed : mock ou futur posts. | GET /metrics/ratio, GET /missions-map/health |
| **Trouver votre talent** | Liste travailleurs. Backend : GET /profiles/workers (à créer) ou GET /users avec filtre role=worker. | Nouveau ou users?role=worker |
| **Carte appels** | Pins. GET /missions-map?lat=&lng=&radiusKm=. Clic pin → GET /missions-map/:id. | Existant |
| **Téléphone rouge** | Choix type. Client : POST /missions-local. Worker : POST /offers (avec missionId) ou formulaire "offre de service" (à préciser). | missions-local, offers |
| **Réservez en 1 tap** | Détail mission + worker. POST /payments-local/intent. Stripe. | Existant |
| **Mon dashboard** | Profil + stats (earnings, missions complétées). GET /profile/me, GET /earnings/summary. | Existant |

### 3.4 Vocabulaire UI

| Remplacer | Par |
|-----------|-----|
| Mission | Appel de service (liste) / Contrat de service (accord établi) |
| Job, Booking | Demande, Contrat |
| Customer, Cleaner | Client, Travailleur |
| Provider | Travailleur |

---

## 4. COHÉRENCE BACKEND

### 4.1 Mapping API → UI

| UI | Backend |
|----|---------|
| Appels de services (carte) | GET /api/v1/missions-map |
| Appels de services (liste nearby) | GET /api/v1/missions-local/nearby |
| Créer demande (client) | POST /api/v1/missions-local |
| Postuler (travailleur) | POST /api/v1/offers |
| Mes demandes (client) | GET /api/v1/missions-local/my-missions |
| Mes demandes (worker) | GET /api/v1/missions-local/my-assignments |
| Offres à confirmer (client) | GET /api/v1/offers/mission/:id |
| Accepter travailleur | PATCH /api/v1/offers/:id/accept |
| Démarrer / Compléter | POST /api/v1/missions-local/:id/start, complete |
| Paiement | POST /api/v1/payments-local/intent |

### 4.2 Endpoint à ajouter (backend)

**Option A — Stats Home (recommandé)**  
```
GET /api/v1/metrics/home-stats
Response: {
  completedContracts: number,
  activeWorkers: number,
  openServiceCalls: number
}
```
Implémentation : agrégation sur LocalMission (status=completed), LocalUser (role=worker), LocalMission (status=open).

**Option B — Liste travailleurs (swipe candidats)**  
```
GET /api/v1/profiles/workers?city=&category=&limit=
Response: [{ id, firstName, lastName, city, skills, averageRating, ... }]
```
Implémentation : requête sur LocalUser + UserProfile/WorkerProfile, jointure reviews pour rating.

---

## 5. TODO LIST EXÉCUTABLE — HIGH REWARD, LOW RISK

### Phase 1 — Fondations (Low risk, high reward)

| # | Tâche | Effort | Risque | Récompense |
|---|-------|--------|--------|------------|
| 1.1 | Créer `GET /api/v1/metrics/home-stats` (contrats complétés, candidats, appels) | 1h | Faible | Stats Home sans mock |
| 1.2 | Config API (baseUrl, token storage) dans app Flutter native | 30min | Faible | Base API |
| 1.3 | Créer services API (Auth, Metrics, Missions, Offers, Profile) | 1h | Faible | Réutilisation |
| 1.4 | Supprimer HomeClient et HomeProvider (écrans Flutter) | 30min | Faible | Éviter conflit |
| 1.5 | Créer HomeScreen unique (header, titre, slogan, stats API, feed placeholder, barre du bas) | 2h | Faible | Structure cible |

### Phase 2 — Auth et gate (Low risk)

| # | Tâche | Effort | Risque | Récompense |
|---|-------|--------|--------|------------|
| 2.1 | Modifier SplashPage : si token vide → Home. Si token → Auth_GetMe → Home. | 30min | Faible | Gate simplifié |
| 2.2 | Adapter SignUpPage : formulaire profil complet → "Compléter" → Popup Conditions → compliance/accept → Home | 2h | Moyen | Flow inscription cible |
| 2.3 | LoginPage : après succès → Home (pas Client/Provider home) | 15min | Faible | Navigation cohérente |
| 2.4 | Implémenter gate : clic Swipe/Map/Téléphone/Messages sans token → ouvrir Inscription | 1h | Faible | Comportement cible |

### Phase 3 — Navigation et pages principales (Medium risk)

| # | Tâche | Effort | Risque | Récompense |
|---|-------|--------|--------|------------|
| 3.1 | Créer barre du bas (Home, Swipe, Téléphone rouge, Map, Messages) | 1h | Faible | Navigation cible |
| 3.2 | Page Carte : intégrer GET /missions-map, afficher pins, clic → détail | 2h | Moyen | Carte fonctionnelle |
| 3.3 | Page Téléphone rouge : choix Offre / Demande. Demande → formulaire → POST /missions-local | 2h | Moyen | Publication demandes |
| 3.4 | Page Mes demandes : onglets À confirmer (offres), Actives (my-missions + my-assignments), Complétées | 2h | Moyen | Gestion demandes |
| 3.5 | Mon profil : profil éditable + lien vers Mes demandes | 1h | Faible | Aligné design |
| 3.6 | Mon dashboard : stats (profile + earnings si worker) | 1h | Faible | Vue globale |

### Phase 4 — Swipe et réservation (Medium risk)

| # | Tâche | Effort | Risque | Récompense |
|---|-------|--------|--------|------------|
| 4.1 | Backend : créer `GET /api/v1/profiles/workers` (ou équivalent) pour swipe candidats | 2h | Moyen | Données réelles |
| 4.2 | Page Trouver votre talent : swipe cartes, données depuis /profiles/workers | 2h | Moyen | Swipe candidats |
| 4.3 | Page Réservez en 1 tap : détail mission + worker, bouton Payer dépôt, Stripe | 2h | Moyen | Réservation complète |

### Phase 5 — Nettoyage et design (Low risk)

| # | Tâche | Effort | Risque | Récompense |
|---|-------|--------|--------|------------|
| 5.1 | Remplacer tous les libellés : Mission → Appel/Contrat, Customer → Client, etc. | 1h | Faible | Vocabulaire cohérent |
| 5.2 | Appliquer thème dark + rouge (couleurs, boutons, badges) selon mockups | 1h | Faible | Design aligné |
| 5.3 | Supprimer ou masquer ContractsPage, ContractDetailPage | 15min | Faible | Réduction confusion |
| 5.4 | Retirer données fake, listes hardcodées | 1h | Faible | Données réelles partout |

### Phase 6 — Feed (Optionnel, plus tard)

| # | Tâche | Effort | Risque | Récompense |
|---|-------|--------|--------|------------|
| 6.1 | Backend : module Posts + Likes (ou mock feed avec mission-photos) | 4h+ | Élevé | Feed social |
| 6.2 | Home : afficher feed (photos missions ou posts), like | 2h | Moyen | Engagement |

---

## 6. ORDRE D'EXÉCUTION RECOMMANDÉ

```
Phase 1 (fondations) → Phase 2 (auth) → Phase 3 (nav + pages) → Phase 4 (swipe) → Phase 5 (nettoyage)
```

**Sprint 1 (1–2 jours)** : 1.1 à 1.5, 2.1 à 2.4  
**Sprint 2 (2–3 jours)** : 3.1 à 3.6  
**Sprint 3 (2 jours)** : 4.1 à 4.3  
**Sprint 4 (1 jour)** : 5.1 à 5.4  

---

## 7. RÉSUMÉ — CE QUI CHANGE DANS L'APP

| Avant (Sparkly) | Après (WorkOn) |
|-----------------|----------------|
| Splash → Auth gate → Home rôle | Home publique → Gate sur action → Inscription |
| 2 Home (Client/Provider) | 1 Home unique |
| JobsPage = missions pour worker | Carte = appels ; Swipe = candidats |
| Accept mission direct | Offres : worker postule, client accepte |
| Tab bar Sparkly | Barre du bas (5 items) |
| Missions, Bookings, Jobs | Appels de services, Contrats, Demandes |
| Données fake | API WorkOn |
| Contracts pages | Masquées (MVP) |

---

*Document de référence pour la conversion. Valider avant exécution.*
