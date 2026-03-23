# Inventaire work_on_v1 — Éléments à garder pour workonapp/app

> **Date**: 6 février 2026  
> **Source**: `C:\Users\ouell\Downloads\work_on_v1\work_on_v1`  
> **Cible**: `C:\Users\ouell\workonapp\app`  
> **Objectif**: Fusionner les intégrations existantes dans l'app Phase 1

---

## 0. ROLLBACK — Revenir en arrière

**Avant toute modification**, créer un point de restauration :

### work_on_v1 (source — a un repo git)

```powershell
cd C:\Users\ouell\Downloads\work_on_v1\work_on_v1
git stash                    # Sauvegarder les changements non commités
git checkout -b backup-avant-refonte-ui   # Créer une branche de sauvegarde
git checkout -               # Revenir sur la branche précédente
git stash pop                # Restaurer les changements si besoin
```

**Pour revenir en arrière** : `git checkout backup-avant-refonte-ui`

### workonapp/app (cible)

```powershell
# Option A : Copie manuelle avant modification
Copy-Item -Path "C:\Users\ouell\workonapp\app" -Destination "C:\Users\ouell\workonapp\app_backup_$(Get-Date -Format 'yyyyMMdd')" -Recurse

# Option B : Si app est dans le repo workonapp
cd C:\Users\ouell\workonapp
git add app/
git commit -m "backup: app Phase 1 avant fusion work_on_v1"
```

**Pour revenir en arrière** : supprimer `app/`, restaurer depuis `app_backup_*` ou `git checkout -- app/`

---

## 1. EMPLACEMENT DU PROJET EXISTANT

| Chemin | Description |
|--------|-------------|
| `C:\Users\ouell\Downloads\work_on_v1\work_on_v1` | Projet Flutter WorkOn v1 avec intégrations complètes |

**Recommandation**: Copier ou déplacer ce projet dans `workonapp/app` (remplacer le projet Phase 1 minimal) OU fusionner les dossiers/services manquants.

---

## 2. CONFIGURATION — À GARDER

| Fichier | Description | Priorité |
|---------|-------------|----------|
| `lib/config/app_config.dart` | Base URL, env (dev/staging/prod), Timeouts, Stripe, Maps, Feature flags | **Haute** |
| `lib/config/workon_theme.dart` | Thème dark premium (WkTheme) | **Haute** |
| `lib/config/workon_colors.dart` | Palette WkColors (rouge, dark, badges) | **Haute** |
| `lib/config/workon_typography.dart` | WkTypography | **Haute** |
| `lib/config/workon_widgets.dart` | WkButtonStyle, WkCardDecoration | **Haute** |

**Note**: `app_config.dart` dépend de `RemoteConfig` — simplifier ou adapter si non utilisé.

---

## 3. SERVICES API — À GARDER

| Service | Fichiers | Backend mappé | Action |
|---------|----------|---------------|--------|
| **ApiClient** | `services/api/api_client.dart`, `request_id.dart` | - | **Copier** — client HTTP avec refresh token |
| **Auth** | `auth/auth_service.dart`, `token_storage.dart`, `token_refresh_interceptor.dart`, `real_auth_repository.dart` | `/auth/*` | **Copier** |
| **Missions** | `missions/missions_api.dart`, `mission_models.dart`, `missions_service.dart` | `/missions-local/*` | **Copier** |
| **Offers** | `offers/offers_api.dart`, `offer_models.dart`, `offers_service.dart` | `/offers/*` | **Copier** |
| **Payments** | `payments/payments_api.dart`, `payment_models.dart`, `stripe_service.dart` | `/payments-local/*` | **Copier** |
| **Messages** | `messages/messages_api.dart`, `message_models.dart`, `messages_service.dart` | `/messages/*` | **Copier** |
| **Ratings** | `ratings/ratings_api.dart`, `ratings_models.dart`, `ratings_service.dart` | `/reviews/*` | **Copier** |
| **Consent** | `legal/consent_api.dart`, `consent_store.dart`, `consent_gate.dart` | `/compliance/*` | **Copier** |
| **Catalog** | `catalog/catalog_api.dart`, `catalog_models.dart`, `catalog_service.dart` | `/catalog/*` | **Copier** |
| **Devices** | `devices/devices_api.dart`, `devices_service.dart` | `/devices/*` | **Copier** |
| **Push** | `push/push_api.dart`, `push_service.dart`, `push_config.dart` | FCM + backend | **Copier** |
| **Earnings** | `earnings/earnings_api.dart`, `earnings_models.dart` | `/earnings/*` | **Copier** |
| **Stripe Connect** | `payments/stripe_connect_api.dart`, `stripe_connect_service.dart` | Stripe Connect | **Copier** |
| **Support** | `support/support_api.dart`, `support_models.dart`, `support_service.dart` | `/support/*` | **Copier** |
| **Mission Photos** | `mission_photos/mission_photos_api.dart` | `/mission-photos/*` | **Copier** |
| **Mission Events** | `mission_events/mission_events_api.dart` | `/mission-events/*` | **Copier** |
| **Notification Prefs** | `notification_preferences/notification_prefs_api.dart` | - | **Copier** |
| **User** | `user/user_api.dart`, `user_service.dart`, `user_context.dart` | `/users/*`, `/profile/*` | **Copier** |
| **Users** | `users/users_service.dart` | - | **Copier** |
| **Discovery** | `discovery/discovery_service.dart` | `/missions-local/nearby` | **Copier** |
| **Location** | `location/location_service.dart` | - | **Copier** |

### Metrics — À ADAPTER

| Fichier | Contenu actuel | Action |
|---------|----------------|--------|
| `metrics/metrics_api.dart` | `getRatio()`, `getRegions()` | **Ajouter** `getHomeStats()` → `GET /metrics/home-stats` |
| `metrics/metrics_models.dart` | `RatioMetrics` | **Ajouter** `HomeStats` (completedContracts, activeWorkers, openServiceCalls) |
| `metrics/metrics_service.dart` | Service layer | **Copier** — adapter pour home-stats |

---

## 4. DÉPENDANCES pubspec.yaml — À AJOUTER

```yaml
# Déjà dans work_on_v1, à ajouter dans workonapp/app
dependencies:
  provider: ^6.1.5
  go_router: ^12.1.3
  geolocator: ^13.0.2
  google_maps_flutter: ^2.5.3
  flutter_stripe: ^11.4.0
  firebase_core: ^3.8.1
  firebase_messaging: ^15.1.6
  flutter_card_swiper: ^7.0.1
  cached_network_image: 3.4.1
  image_picker: 1.1.2
  share_plus: ^10.1.4
  # ... (voir pubspec work_on_v1 complet)
```

---

## 5. ASSETS — À COPIER

| Dossier | Contenu |
|---------|---------|
| `assets/fonts/` | General Sans, MigambiIconOutline, MigambiVIPIcons |
| `assets/images/` | workon_splash_logo.png, icônes |
| `assets/icons/` | app_icon_1024.png, app_icon_foreground.png |
| `assets/videos/`, `assets/audios/`, `assets/rive_animations/`, `assets/pdfs/`, `assets/jsons/` | Selon usage |

---

## 6. COMPOSANTS UI — À GARDER

| Composant | Fichier | Usage |
|-----------|---------|-------|
| Notification badge | `components/notification_badge.dart` | Badge compteur |
| Skill badge | `components/skill_badge_widget.dart` | Badges compétences |
| Mission timeline | `components/mission_timeline_widget.dart` | Timeline missions |

---

## 7. ÉCRANS / WIDGETS — À ÉVALUER

| Écran | Fichier | Note |
|-------|---------|------|
| Home | `client_part/home/home_widget.dart` | Vérifier structure vs Home unique cible |
| Mission detail | `client_part/mission_detail/mission_detail_widget.dart` | Réutilisable |
| User profile | `client_part/user_profile/user_public_profile_widget.dart` | Réutilisable |
| Leave review | `client_part/leave_review/leave_review_model.dart` | Réutilisable |
| Support tickets | `client_part/support_tickets/*` | Réutilisable |
| Stripe Connect | `provider_part/provider_profile_pages/stripe_connect/*` | Réutilisable |

---

## 8. FLUTTER_FLOW — À RETIRER OU ADAPTER

| Élément | Action |
|---------|--------|
| `flutter_flow/` | Vérifier si code généré — retirer dépendances FF si possible |
| `FlutterFlowTheme` | Remplacer par `WkTheme` |
| `FlutterFlowUtil` | Adapter ou remplacer |

---

## 9. STRATÉGIE DE FUSION RECOMMANDÉE

### Option A : Remplacer workonapp/app par work_on_v1

1. Supprimer le contenu de `workonapp/app` (sauf .git si monorepo)
2. Copier tout `work_on_v1` dans `workonapp/app`
3. Ajouter `getHomeStats()` dans `metrics_api.dart`
4. Adapter Home pour structure Phase 1 (stats, barre du bas)
5. Mettre à jour `main.dart` pour routing Splash → Home

### Option B : Fusionner dans workonapp/app existant

1. Copier `lib/config/` (app_config, workon_theme, workon_colors, workon_typography, workon_widgets)
2. Copier `lib/services/` (api, auth, missions, offers, payments, messages, etc.)
3. Copier `assets/`
4. Mettre à jour `pubspec.yaml` avec dépendances manquantes
5. Adapter `main.dart` pour utiliser WkTheme, AuthService, etc.
6. Mettre à jour `home_screen.dart` pour utiliser ApiClient + MetricsApi.getHomeStats()

---

## 10. ORDRE D'EXÉCUTION SUGGÉRÉ

1. **Config** : Copier app_config, workon_theme, workon_colors, workon_typography
2. **ApiClient + Auth** : api_client, token_storage, token_refresh_interceptor, auth_service
3. **Metrics** : Adapter metrics_api pour getHomeStats()
4. **Services métier** : missions, offers, payments, messages, consent, catalog
5. **Assets** : fonts, images, icons
6. **UI** : Appliquer WkTheme dans main.dart, adapter HomeScreen
7. **Optionnel** : push, devices, support, stripe_connect, discovery

---

*Document de référence pour la fusion work_on_v1 → workonapp/app*
