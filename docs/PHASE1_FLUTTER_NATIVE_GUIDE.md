# Phase 1 — Guide Flutter natif (app mobile)

> **Contexte** : L'app est une application Flutter **native** (code Dart). Le template Sparkly (FlutterFlow) a été abandonné — il ne correspondait pas à la logique backend WorkOn. Ce guide décrit l'implémentation en Flutter pur.
>
> **Réutilisable du template** : Si vous avez le code exporté Sparkly, voir [WORKON_CONVERSION_PLAN_COMPLETE.md § 2.1](WORKON_CONVERSION_PLAN_COMPLETE.md) — thème, composants UI, Login/SignUp, Stripe, assets.

---

## Stack cible

- **Flutter** (Dart) — app native iOS/Android
- **Backend** : `https://workon-backend-production-8908.up.railway.app/api/v1`
- **State** : Provider, Riverpod ou équivalent
- **HTTP** : `http` ou `dio`
- **Navigation** : `go_router` ou `Navigator` classique

---

## Structure projet recommandée

```
lib/
├── main.dart
├── app.dart
├── config/
│   └── api_config.dart          # Base URL, constantes
├── core/
│   ├── auth/
│   │   ├── auth_service.dart    # Login, register, getMe
│   │   └── auth_state.dart      # Token, user en mémoire
│   └── storage/
│       └── token_storage.dart   # SecureStorage pour JWT
├── services/
│   ├── api_client.dart          # Client HTTP avec interceptors
│   ├── metrics_api.dart        # GET /metrics/home-stats
│   └── auth_api.dart           # Auth endpoints
├── models/
│   ├── home_stats.dart
│   └── user.dart
├── screens/
│   ├── splash_screen.dart
│   ├── home_screen.dart         # Home unique
│   ├── login_screen.dart
│   └── signup_screen.dart
└── widgets/
    ├── bottom_nav_bar.dart      # Carte, Téléphone rouge, Mes demandes, Profil
    └── home_stats_card.dart
```

---

## Tâche 1.2 — Config API

### api_config.dart
```dart
class ApiConfig {
  static const String baseUrl = 
    'https://workon-backend-production-8908.up.railway.app/api/v1';
}
```

### Token storage (SharedPreferences ou flutter_secure_storage)
- Persister `authToken`, `currentUserId`, `currentUserRole`, etc.

---

## Tâche 1.3 — API Calls (services)

### metrics_api.dart
```dart
Future<HomeStats> getHomeStats() async {
  final response = await http.get(
    Uri.parse('${ApiConfig.baseUrl}/metrics/home-stats'),
  );
  if (response.statusCode == 200) {
    return HomeStats.fromJson(jsonDecode(response.body));
  }
  throw Exception('Failed to load home stats');
}
```

### auth_api.dart
- `login(email, password)` → POST /auth/login
- `register(...)` → POST /auth/register
- `getMe()` → GET /auth/me (avec Authorization: Bearer token)

### Modèle HomeStats
```dart
class HomeStats {
  final int completedContracts;
  final int activeWorkers;
  final int openServiceCalls;

  HomeStats({
    required this.completedContracts,
    required this.activeWorkers,
    required this.openServiceCalls,
  });

  factory HomeStats.fromJson(Map<String, dynamic> json) => HomeStats(
    completedContracts: json['completedContracts'] ?? 0,
    activeWorkers: json['activeWorkers'] ?? 0,
    openServiceCalls: json['openServiceCalls'] ?? 0,
  );
}
```

---

## Tâche 1.4 — Supprimer Home Client / Provider

- Supprimer les écrans `HomeClientScreen` et `HomeProviderScreen`
- Supprimer toute route ou navigation vers ces écrans
- Toutes les redirections "Home" pointent vers `HomeScreen` unique

---

## Tâche 1.5 — Home unique

### home_screen.dart
- **Header** : Drawer (hamburger), logo WorkOn (centre)
- **Titre + slogan**
- **Zone stats** : `FutureBuilder` ou `StreamBuilder` sur `metricsApi.getHomeStats()`
  - Afficher `completedContracts`, `activeWorkers`, `openServiceCalls`
  - En cas d'erreur : afficher 0 ou message discret
- **Zone feed** : Placeholder ("Bientôt")
- **BottomNavBar** : 4 items (Carte, Téléphone rouge, Mes demandes, Profil)

### Pas de mock
- Données 100 % API — pas de listes hardcodées

---

## Tâche 1.6 — Splash → Home

### splash_screen.dart
```dart
@override
void initState() {
  super.initState();
  _checkAuthAndNavigate();
}

Future<void> _checkAuthAndNavigate() async {
  final token = await tokenStorage.getToken();
  if (token == null || token.isEmpty) {
    context.go('/home');  // ou Navigator.pushReplacement
    return;
  }
  try {
    await authApi.getMe();
    context.go('/home');  // Pas de branche Client/Provider
  } catch (e) {
    await tokenStorage.clearToken();
    context.go('/home');
  }
}
```

- **Pas de gate** : on n'envoie jamais vers Login au démarrage
- **Résultat** : Home affichée en premier (avec ou sans token)

---

## Dépendances pubspec.yaml

```yaml
dependencies:
  flutter:
    sdk: flutter
  http: ^1.0.0
  go_router: ^13.0.0
  shared_preferences: ^2.2.0
  # ou flutter_secure_storage pour le token
```

---

## Validation Phase 1

- [ ] GET /api/v1/metrics/home-stats retourne des données
- [ ] Home affiche stats réelles (completedContracts, activeWorkers, openServiceCalls)
- [ ] Home Client et Home Provider supprimées
- [ ] Splash redirige vers Home
- [ ] Aucun crash de navigation
- [ ] Config API (baseUrl) appliquée
