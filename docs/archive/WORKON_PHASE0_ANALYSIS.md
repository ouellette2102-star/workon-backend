# WORKON — PHASE 0 : ANALYSE READ-ONLY
## Mapping PRD vs Frontend Actuel + Plan PR
### Produit le : Mars 2026 — STOP, attendre validation

---

> **RÈGLE ABSOLUE** : Ce document est READ-ONLY. Aucune modification de code n'a été effectuée.
> Valide ce document avant que la Phase 1 commence.

---

## DÉCOUVERTE CRITIQUE

### Stack réel identifié

Le projet WorkOn possède **DEUX frontends** :

| Frontend | Technologie | Localisation | Statut |
|---|---|---|---|
| **App Mobile Native** | **Flutter (Dart)** | `/app/` | ✅ **CIBLE PRINCIPALE** (PRD mobile natif) |
| Web Admin/Dashboard | Next.js 16 (React) | `/src/` | Secondaire — non ciblé par ce PRD |

**Le PRD parle de "mobile native store-ready" → La cible est exclusivement `/app/` (Flutter).**

---

## 1. ÉCRANS EXISTANTS

### Flutter App — Inventaire complet

| Fichier | Route | Description | Dernière modif |
|---|---|---|---|
| `splash_screen.dart` | `/` | Splash screen | 06/03/2026 |
| `home_screen.dart` | `/home` | Home + stats + nav | 06/03/2026 |
| `screens/auth/sign_in_screen.dart` | `/sign-in` | Connexion | 23/03/2026 |
| `screens/auth/sign_up_screen.dart` | `/sign-up?role=` | Inscription | 06/03/2026 |
| `screens/auth/reset_password_screen.dart` | `/reset-password` | Mot de passe oublié | 23/03/2026 |
| `screens/onboarding/onboarding_screen.dart` | `/onboarding` | Onboarding intro | 06/03/2026 |
| `screens/onboarding/account_type_screen.dart` | `/onboarding/account-type` | Choix du rôle | 06/03/2026 |
| `screens/onboarding/profile_ready_screen.dart` | `/profile/ready` | Profil créé confirmation | 06/03/2026 |
| `screens/talent/talent_swipe_screen.dart` | `/talent` | **Explorer / Swipe** | 23/03/2026 |
| `screens/map/map_screen.dart` | `/map` | **Map + Pins** | 23/03/2026 |
| `screens/publish/publish_screen.dart` | `/publish` | **Hub publication** | 23/03/2026 |
| `screens/publish/create_demand_form.dart` | `/publish/demand` | Formulaire demande | 06/03/2026 |
| `screens/publish/create_offer_form.dart` | `/publish/offer` | Formulaire offre | 06/03/2026 |
| `screens/messages/messages_screen.dart` | `/messages` | **Liste messages** | 23/03/2026 |
| `screens/messages/chat_screen.dart` | `/messages/:missionId` | **Fil de conversation** | 23/03/2026 |
| `screens/booking/booking_screen.dart` | `/talent/:workerId/book` | **Réservation** | 23/03/2026 |
| `screens/booking/payment_confirmation_screen.dart` | `/booking/confirmation` | Confirmation paiement | 06/03/2026 |
| `screens/profile/worker_detail_screen.dart` | `/talent/:workerId` | **Profil public** | 06/03/2026 |
| `screens/profile/my_profile_screen.dart` | `/profile/me` | **Mon profil scrollable** | 23/03/2026 |
| `screens/profile/edit_profile_screen.dart` | `/profile/edit` | **Édition profil** | 23/03/2026 |
| `screens/profile/dashboard_screen.dart` | `/dashboard` | **Dashboard stats** | 23/03/2026 |
| `screens/profile/earnings_screen.dart` | `/earnings` | **Gains / Revenus** | 06/03/2026 |
| `screens/profile/review_screen.dart` | `/review/:missionId` | Laisser un avis | 06/03/2026 |
| `screens/notifications/notifications_screen.dart` | `/notifications` | Notifications | 06/03/2026 |

**Total : 24 écrans existants, tous connectés au backend.**

### Widgets existants

| Fichier | Description |
|---|---|
| `widgets/bottom_nav_bar.dart` | Navigation bas — 5 tabs (Home, Talent, 📞, Map, Messages) |
| `widgets/worker_card.dart` | Carte worker (utilisée dans l'Explorer) |
| `widgets/home_stats_card.dart` | Carte de stats sur la Home |
| `widgets/app_drawer.dart` | Drawer latéral (menu hamburger) |
| `widgets/auth_gate.dart` | Guard d'auth pour les actions protégées |
| `widgets/consent_modal.dart` | Modal de consentement |

---

## 2. ÉCRANS CIBLES (PRD)

| Écran PRD | Priorité | Correspondance actuelle |
|---|---|---|
| Splash / Welcome cinématique | P1 | `splash_screen.dart` ✅ Existe |
| Onboarding — Choix rôle | P1 | `account_type_screen.dart` ✅ Existe |
| Onboarding — Score complétion | P1 | ❌ Absent — à intégrer dans `profile_ready_screen.dart` |
| Home / Dashboard personnalisé | P1 | `home_screen.dart` ✅ Existe (à améliorer) |
| Explorer / Swipe | P1 | `talent_swipe_screen.dart` ✅ Existe |
| Map + Pins disponibilité | P1 | `map_screen.dart` ✅ Existe |
| Publication de mission (3 étapes) | P1 | `publish_screen.dart` + forms ✅ Existe (à simplifier) |
| Profil public enrichi | P1 | `worker_detail_screen.dart` ✅ Existe |
| Mon profil scrollable vertical | P1 | `my_profile_screen.dart` ✅ Existe |
| Messagerie + module proposition | P1 | `messages_screen.dart` + `chat_screen.dart` ✅ Existent |
| Réservation / Booking | P1 | `booking_screen.dart` ✅ Existe |
| Paiement / Escrow sécurisé | P1 | `payment_confirmation_screen.dart` ✅ Existe |
| Conformité / Identité / Paramètres | P2 | `edit_profile_screen.dart` ✅ Partiel |
| Dashboard stats avancé | P2 | `dashboard_screen.dart` ✅ Existe |
| Earnings | P2 | `earnings_screen.dart` ✅ Existe |
| Badges / Niveaux visibles | P2 | ❌ Absent — à créer en tant que composants |
| Score de complétion de profil | P2 | ❌ Absent — à créer |
| Éléments premium / Upsell | P3 | ❌ Absent — Phase 6 |
| Notifications intelligentes | P3 | `notifications_screen.dart` ✅ Existe (à enrichir) |

---

## 3. GAP — DIFFÉRENCES PRD VS ACTUEL

### 3A — Design System

| Dimension | État actuel | Cible PRD | Delta |
|---|---|---|---|
| **Couleur principale** | Rouge `#E53935` | Rouge-orange `#E8400C → #FF7A2F` | ⚠️ Ajustement couleur (gradient manquant) |
| **Backgrounds** | `#0D0D0F`, `#1A1A1E`, `#252529` | `#0A0A0A`, `#141414`, `#1E1E1E` | ✅ Très proche, delta mineur |
| **Gradient brand** | `brandRed → brandRedDark` (rouge sombre) | `#C62800 → #FF7A2F` (rouge vers orange) | ⚠️ Gradient orange absent |
| **Typography** | `workon_typography.dart` existe | Scale définie dans PRD | ✅ À vérifier l'alignement exact |
| **Spacing** | `WkSpacing` : xs=4, sm=8, md=12, lg=16... | Base 4px scale identique | ✅ Conforme |
| **Radius** | `WkRadius` : card=16, button=10 | card=16, full=9999 | ✅ Conforme, button à ajuster |
| **Shadows** | `shadowCard`, `shadowElevated`, `shadowGlow` | shadow-sm à shadow-glow | ✅ Conforme |
| **Tokens** | `ui_tokens.dart` (WkSpacing, WkRadius, WkCopy) | Design tokens complets | ✅ Conforme, à enrichir |

### 3B — Navigation

| Dimension | État actuel | Cible PRD | Delta |
|---|---|---|---|
| **Bottom Nav** | Home \| Talent \| 📞 \| Map \| Messages | Explorer \| Map \| + \| Messages \| Profil | ⚠️ Renommages + tab Profil à ajouter |
| **Tab 1** | Home (maison) | Explorer (compass) | ⚠️ Renommage + icône |
| **Tab 2** | Talent (people) | Map (map pin) | ⚠️ Réordonner |
| **Tab 3 central** | 📞 Publish (téléphone rouge) | + Publier (contextuel) | ⚠️ Icône à changer |
| **Tab 4** | Map | Messages | ⚠️ Réordonner |
| **Tab 5** | Messages | Profil | ⚠️ Remplacer Messages par Profil |
| **Profil dans nav** | Via drawer hamburger | Tab 5 direct | ⚠️ Changement architecture nav |
| **Drawer** | Existe (hamburger menu) | À conserver comme accès secondaire | ✅ Garder, pas supprimer |

### 3C — Écrans prioritaires — Gaps spécifiques

**Home Screen** (`home_screen.dart`)
- ✅ Greeting utilisateur existe
- ✅ Stats chargées depuis API réelle
- ✅ Background gradient rouge-noir
- ❌ Pas de toggle "Disponible maintenant" rapide
- ❌ Pas de score de visibilité / complétion de profil
- ❌ Pas de rails horizontaux contextuels (missions proches, etc.)
- ❌ Actions rapides en chips manquantes

**Explorer / Swipe** (`talent_swipe_screen.dart`)
- ✅ Swipe existe et est connecté au backend
- ❌ Overlay gradient sur les cartes swipe à renforcer
- ❌ Badges de confiance non visibles sur les cartes
- ❌ Pas de toggle Feed / Swipe
- ❌ Indicateurs de position dans le deck absents

**Map** (`map_screen.dart`)
- ✅ Map fonctionnelle avec pins
- ❌ Clustering des pins à vérifier
- ❌ Bottom sheet preview des profils à enrichir
- ❌ Distinction visuelle pins travailleur / pins mission à vérifier

**Profil Public** (`worker_detail_screen.dart`)
- ✅ Profil complet avec données backend
- ❌ Hero photo pleine largeur absente
- ❌ Badge row (Vérifié, Conforme, Premium) absent
- ❌ CTA flottant bas absent ou à améliorer
- ❌ Section portfolio peu visible

**Mon Profil** (`my_profile_screen.dart`)
- ✅ Profil scrollable vertical existe
- ❌ Score de complétion absent
- ❌ Statistiques de la semaine absentes
- ❌ Section badges/niveaux absente

**Messagerie** (`chat_screen.dart`)
- ✅ Chat fonctionnel backend
- ❌ Module "Proposer une mission" dans le chat absent
- ❌ Header profil avec statut de réponse absent

**Paiement** (`booking_screen.dart` + `payment_confirmation_screen.dart`)
- ✅ Stripe intégré et fonctionnel
- ❌ Résumé escrow explicite avec explication absente
- ❌ Lien vers contrat de service absent

**Onboarding** (`account_type_screen.dart` + `onboarding_screen.dart`)
- ✅ Choix de rôle existe
- ❌ Score de complétion progressif absent
- ❌ Message motivant sur la photo de profil absent
- ❌ Catalogue visuel de métiers (icônes grandes) absent ou basique

### 3D — Composants manquants (à créer)

| Composant | Priorité | Usage |
|---|---|---|
| `WkBadge` (Vérifié, Pro, Top, Conforme) | P1 | Profils, cartes |
| `WkProfileCompletionBar` | P1 | Home, profil perso |
| `WkAvailabilityToggle` | P1 | Home, profil |
| `WkStatCard` (enrichi) | P1 | Dashboard, home |
| `WkHorizontalRail` | P1 | Home (rails contextuels) |
| `WkFloatingCTA` | P1 | Profil public |
| `WkMissionProposalCard` | P2 | Chat |
| `WkEscrowSummaryCard` | P2 | Paiement |
| `WkRatingDisplay` (étoiles) | P1 | Cartes, profils |
| `WkSkeletonLoader` | P1 | États de chargement |

---

## 4. RISQUES DE CASSE

### CRITIQUE — Ne toucher qu'avec précaution maximale

| Fichier | Risque | Raison |
|---|---|---|
| `workon_colors.dart` | 🔴 ÉLEVÉ | Utilisé dans TOUS les fichiers — moindre erreur = app inutilisable |
| `workon_theme.dart` | 🔴 ÉLEVÉ | ThemeData global — toute modification affecte l'app entière |
| `app_router.dart` | 🔴 ÉLEVÉ | Navigation complète de l'app — routes supprimées = crash |
| `bottom_nav_bar.dart` | 🟡 MOYEN | Navigation principale — toute modification affecte le flux core |
| `home_screen.dart` | 🟡 MOYEN | Écran d'entrée principale — doit rester fonctionnel |
| `auth_provider.dart` | 🔴 ÉLEVÉ | Auth state global — ne pas modifier |

### MOYEN — Modifier avec tests manuels

| Fichier | Risque | Raison |
|---|---|---|
| `talent_swipe_screen.dart` | 🟡 MOYEN | Connecté à l'API workers — garder appels API intacts |
| `map_screen.dart` | 🟡 MOYEN | Géolocalisation + API — ne pas modifier la logique |
| `booking_screen.dart` | 🟡 MOYEN | Stripe intégré — UI uniquement |
| `chat_screen.dart` | 🟡 MOYEN | WebSocket/API messages — UI uniquement |
| `my_profile_screen.dart` | 🟢 BAS | UI améliorable sans risque backend |

### FAIBLE — Modifications UI sûres

| Fichier | Risque |
|---|---|
| `splash_screen.dart` | 🟢 BAS — Pas de logique backend |
| `worker_detail_screen.dart` | 🟢 BAS — Lecture seule depuis API |
| `dashboard_screen.dart` | 🟢 BAS — Lecture seule depuis API |
| `edit_profile_screen.dart` | 🟢 BAS — PATCH API, structure stable |

---

## 5. ÉLÉMENTS RÉUTILISABLES (Assets précieux à ne pas recréer)

### Design system déjà opérationnel

```
✅ WkColors     — Palette dark complète, sémantique, statuts, badges
✅ WkTheme      — Material3 dark, colorScheme complet
✅ WkTypography — Échelle typographique
✅ WkSpacing    — Scale 4px base
✅ WkRadius     — Cards=16, button=10, circle=100
✅ WkCopy       — Microcopy français centralisé
```

### Services backend — NE PAS TOUCHER

```
✅ services/api/       — Client HTTP de base
✅ services/auth/      — TokenStorage, AuthService
✅ services/missions/  — CRUD missions
✅ services/workers/   — Profils workers
✅ services/messages/  — Messages/Chat
✅ services/payments/  — Stripe intégration
✅ services/ratings/   — Notation
✅ services/location/  — Géolocalisation
✅ services/push/      — Firebase notifications
✅ services/metrics/   — Stats home
```

### Composants réutilisables existants

```
✅ WorkOnBottomNavBar — Structure 5 tabs + logique auth → améliorer, pas recréer
✅ WorkerCard        — Carte worker avec données réelles → enrichir visuellement
✅ HomeStatsCard     — Stats connectées API → améliorer UI
✅ AppDrawer         — Navigation secondaire → conserver
✅ ConsentModal      — RGPD → conserver tel quel
```

---

## PLAN PR COMPLET — ORDRE EXACT D'EXÉCUTION

---

### PR #1 — DESIGN SYSTEM PREMIUM (Phase 1)
**Fichiers : `workon_colors.dart` uniquement**
- Ajouter les couleurs orange manquantes (`brandOrange`, `gradientEnd`)
- Créer le gradient linéaire WorkOn premium `#C62800 → #FF7A2F`
- Ajuster `brandRed` vers `#E8400C` (léger décalage vers l'orange)
- Ajouter `premiumGold` (#F5C842) et `verifiedBlue` (#1D9BF0)
- Aucune autre modification

**Risque** : 🟡 Moyen — tests visuels obligatoires sur tous les écrans
**Rollback** : Revenir aux valeurs originales de `workon_colors.dart`
**Tests** : Lancer l'app sur émulateur, vérifier tous les écrans visuellement

---

### PR #2 — TOKENS ENRICHIS + COMPOSANTS ATOMS (Phase 2)
**Fichiers : `ui_tokens.dart` + nouveaux composants dans `lib/widgets/`**
- Enrichir `WkRadius` : ajouter `xxl = 24.0`, `full = 9999.0`
- Enrichir `WkCopy` : labels manquants (disponible, badge, complétion...)
- Créer `lib/widgets/wk_badge.dart` (Vérifié, Pro, Top, Conforme, Urgence)
- Créer `lib/widgets/wk_rating_display.dart` (étoiles + note + nb avis)
- Créer `lib/widgets/wk_skeleton_loader.dart` (loading states)

**Risque** : 🟢 Bas — fichiers nouveaux uniquement (sauf tokens)
**Rollback** : Supprimer les nouveaux fichiers
**Tests** : Vérifier que les tokens enrichis ne cassent pas les imports existants

---

### PR #3 — BOTTOM NAV BAR PREMIUM (Phase 3)
**Fichiers : `widgets/bottom_nav_bar.dart` uniquement**
- Restructurer l'ordre des tabs : Explorer | Map | + | Messages | Profil
- Changer l'icône centrale : téléphone → Plus (add_circle_outline)
- Ajouter le tab Profil (avatar utilisateur)
- Supprimer le drawer comme navigation principale (conserver comme menu secondaire)
- Appliquer le gradient sur le tab actif
- Height : 68px + safe area (vs. 60px actuel)

**Risque** : 🟡 Moyen — navigation principale affectée
**Rollback** : Git revert du fichier
**Tests** : Tester chaque tab, tester auth guards, tester badge notifications

---

### PR #4 — HOME SCREEN PREMIUM (Phase 4 — Écran 1)
**Fichiers : `screens/home_screen.dart` + `widgets/home_stats_card.dart`**
- Ajouter greeting personnalisé avec prénom depuis AuthProvider
- Ajouter toggle "Disponible maintenant" (PATCH API via `services/user/`)
- Ajouter score de complétion de profil (calculé depuis profil)
- Ajouter actions rapides (chips horizontales)
- Ajouter rail horizontal "Missions proches" (connecté API missions)
- Améliorer les cards stats visuellement (gradient, ombres)

**Risque** : 🟡 Moyen — nouveaux appels API à gérer avec try/catch
**Rollback** : Git revert du fichier
**Tests** : Tester en connecté et déconnecté, tester erreur réseau

---

### PR #5 — MAP SCREEN PREMIUM (Phase 4 — Écran 2)
**Fichiers : `screens/map/map_screen.dart`**
- Améliorer les pins : distinction visuelle travailleur (vert) / mission (rouge)
- Améliorer le clustering visuel
- Enrichir le bottom sheet preview : photo + note + badge disponibilité + CTA
- Ajouter filtre rapide par métier (chips en overlay carte)

**Risque** : 🟡 Moyen — géolocalisation et API ne pas toucher
**Rollback** : Git revert
**Tests** : Tester sur device réel (géolocalisation), tester sans permissions

---

### PR #6 — EXPLORER / SWIPE PREMIUM (Phase 4 — Écran 3)
**Fichiers : `screens/talent/talent_swipe_screen.dart` + `widgets/worker_card.dart`**
- Enrichir la carte swipe : overlay gradient bas, badges confiance visibles
- Ajouter indicateurs de position dans le deck
- Améliorer les boutons swipe (✕ / ❤)
- Ajouter les badges Vérifié / Note / Disponible sur chaque carte

**Risque** : 🟡 Moyen — logique swipe et API à conserver
**Rollback** : Git revert
**Tests** : Tester le swipe complet, tester le tap profil, tester vide/erreur

---

### PR #7 — PROFIL PUBLIC PREMIUM (Phase 4 — Écran 4)
**Fichiers : `screens/profile/worker_detail_screen.dart`**
- Hero photo pleine largeur (240px) avec overlay gradient
- Badge row visible (Vérifié, Conforme, Top, etc.)
- CTA flottant bas "Contacter [Prénom]" toujours visible
- Section portfolio améliorée
- Section avis enrichie

**Risque** : 🟢 Bas — lecture seule depuis API
**Rollback** : Git revert
**Tests** : Tester avec profil complet et profil partiel, tester CTA booking

---

### PR #8 — DASHBOARD + MON PROFIL PREMIUM (Phase 4 — Écrans 5 & 6)
**Fichiers : `screens/profile/my_profile_screen.dart` + `screens/profile/dashboard_screen.dart`**
- Score de complétion animé en haut du profil
- Section stats semaine (vues, demandes, conversions)
- Badges et niveaux visibles
- Ajout des nudges d'amélioration de profil

**Risque** : 🟢 Bas — lecture seule, amélioration UI pure
**Rollback** : Git revert
**Tests** : Tester en connecté, tester profil incomplet

---

### PR #9 — MESSAGERIE PREMIUM (Phase 4 — Écran 7)
**Fichiers : `screens/messages/chat_screen.dart` + `screens/messages/messages_screen.dart`**
- Header profil enrichi avec statut de réponse et lien profil
- Amélioration visuelle des bulles de messages
- Ajout de la zone "Proposer une mission" (bouton dans la barre d'action)

**Risque** : 🟡 Moyen — WebSocket/API à ne pas toucher
**Rollback** : Git revert
**Tests** : Tester envoi/réception de messages, tester avec conversation vide

---

### PR #10 — BOOKING + PAIEMENT PREMIUM (Phase 4 — Écran 8)
**Fichiers : `screens/booking/booking_screen.dart` + `screens/booking/payment_confirmation_screen.dart`**
- Résumé escrow avec explication claire "Votre paiement est sécurisé"
- Lien vers le contrat de service standard
- Amélioration visuelle du récapitulatif de paiement
- Icône 🔒 Stripe visible

**Risque** : 🟡 Moyen — Stripe intégration à ne pas toucher
**Rollback** : Git revert
**Tests** : Tester le flow complet de booking avec paiement sandbox Stripe

---

### PR #11 — ONBOARDING PREMIUM (Phase 4 — Écran 9)
**Fichiers : `screens/onboarding/*.dart`**
- Améliorer le splash cinématique (animation gradient)
- Améliorer l'écran de choix de rôle (grandes cartes visuelles)
- Ajouter message motivant sur la photo de profil
- Ajouter score de complétion dans `profile_ready_screen.dart`

**Risque** : 🟢 Bas — peu de logique backend dans l'onboarding
**Rollback** : Git revert
**Tests** : Tester le flux complet de création de compte

---

### PR #12 — MÉCANIQUES PREMIUM / BADGES (Phase 5)
**Fichiers : nouveaux composants + intégration dans les écrans existants**
- Créer `lib/widgets/wk_level_badge.dart` (Nouveau, Actif, Fiable, Pro, Top)
- Intégrer les badges dans les profils et cartes
- Ajouter les indicateurs de disponibilité temps réel
- Score de matching visible dans l'Explorer

**Risque** : 🟢 Bas — nouveaux composants UI uniquement
**Rollback** : Supprimer les composants + retirer les intégrations

---

### PR #13 — MONÉTISATION UX (Phase 6)
**Fichiers : à définir selon l'implémentation backend premium**
- Ajouter les éléments visuels "Pro" / "Premium" sur les profils
- Ajouter la page d'abonnement (si backend prêt)
- Ajouter les nudges subtils d'upsell

**Risque** : 🟢 Bas si backend pas prêt = UI uniquement
**Rollback** : Git revert / feature flag

---

## RÉCAPITULATIF — ORDRE FINAL

```
PR #1  — Design System : couleurs orange + gradient premium       (FONDATIONS)
PR #2  — Tokens enrichis + composants atoms (Badge, Rating, Skeleton)
PR #3  — Bottom Nav Bar restructurée (ordre + Profil tab)
PR #4  — Home Screen premium (greeting, toggle dispo, rails)
PR #5  — Map premium (pins distincts, bottom sheet enrichi)
PR #6  — Explorer/Swipe premium (overlay, badges, indicateurs)
PR #7  — Profil public premium (hero, badge row, CTA flottant)
PR #8  — Dashboard + Mon Profil (score complétion, stats, badges)
PR #9  — Messagerie premium (header enrichi, proposition mission)
PR #10 — Booking + Paiement (escrow UI, contrat, lock icon)
PR #11 — Onboarding premium (cinématique, cartes rôle, complétion)
PR #12 — Mécaniques premium : badges niveaux + matching score
PR #13 — Monétisation UX : éléments visuels + nudges
```

---

## RÈGLES D'EXÉCUTION PAR PR

Pour chaque PR, valider :

```
[ ] Code modifié — fichiers listés uniquement
[ ] Aucune modification de service ou API
[ ] Aucune donnée fake introduite
[ ] Tests manuels sur émulateur iOS + Android
[ ] Screenshot avant / après
[ ] Rollback Git confirmé possible
[ ] Aucun nouveau écran cassé
[ ] App fonctionnelle à 100%
```

---

## ⚠️ STOP — EN ATTENTE DE VALIDATION

**Ce document est READ-ONLY. Aucune modification n'a été effectuée.**

Pour lancer la Phase 1 (PR #1), valider :
1. Que la cible est bien l'app Flutter `/app/`
2. Que l'ordre des PR est correct
3. Que les risques identifiés sont acceptables
4. Que tu es prêt à tester après chaque PR

**Répondre "go PR #1" pour lancer l'exécution.**
