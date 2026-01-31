# 🎨 WorkOn UI Rehaussement Plan

> **Version:** 1.0  
> **Date:** 31 janvier 2026  
> **Objectif:** Upgrade visuel premium sans toucher à l'architecture

---

## 1️⃣ VISUAL DIRECTION SUMMARY

### Brand Identity

| Élément | Spécification |
|---------|---------------|
| **Symbole principal** | Téléphone rouge vintage |
| **Logo** | Work📍n (O = Pin rouge) |
| **Couleur accent** | Deep Red `#E53935` |
| **Thème principal** | Dark Mode Premium |
| **Style cible** | Uber / Airbnb / Stripe quality |

### Design Philosophy

```
╔════════════════════════════════════════════════════════════════════╗
║  "Une ligne directe vers le travail instantané"                    ║
║                                                                    ║
║  • Premium mais accessible                                         ║
║  • Dark mode = professionnel, moderne                              ║
║  • Rouge = urgence, action, connexion                              ║
║  • Humain-centré (photos workers, profils vivants)                ║
║                                                                    ║
╚════════════════════════════════════════════════════════════════════╝
```

### Inspirations visuelles clés (basées sur mockups)

1. **Login/Splash** - Logo téléphone rouge + WorkOn avec pin
2. **Worker Cards** - Style swipe Tinder-like avec photo, rating, description
3. **Map View** - Pins rouges, cartes glassmorphism avec preview mission
4. **Profile** - Stats prominentes (missions, gains, rating), timeline, badges
5. **Dashboard** - "TOP GAINS" leaderboard, navigation bottom claire

---

## 2️⃣ DESIGN SYSTEM SPEC

### 🎨 Color Palette

```dart
// === BACKGROUNDS ===
static const Color backgroundPrimary = Color(0xFF0D0D0F);    // Noir profond
static const Color backgroundSecondary = Color(0xFF1A1A1E);  // Cartes/surfaces
static const Color backgroundTertiary = Color(0xFF252529);   // Éléments surélevés

// === BRAND ===
static const Color brandRed = Color(0xFFE53935);             // Rouge WorkOn
static const Color brandRedDark = Color(0xFFB71C1C);         // Rouge hover/pressed
static const Color brandRedLight = Color(0xFFFF6659);        // Rouge highlight

// === TEXT ===
static const Color textPrimary = Color(0xFFFFFFFF);          // Titres
static const Color textSecondary = Color(0xFFB0B0B0);        // Body
static const Color textTertiary = Color(0xFF707070);         // Labels, hints
static const Color textOnRed = Color(0xFFFFFFFF);            // Texte sur fond rouge

// === SEMANTIC ===
static const Color success = Color(0xFF4CAF50);              // Vert succès
static const Color warning = Color(0xFFFFC107);              // Jaune warning
static const Color error = Color(0xFFE53935);                // Rouge (= brand)
static const Color info = Color(0xFF2196F3);                 // Bleu info

// === GLASSMORPHISM ===
static const Color glassWhite = Color(0x1AFFFFFF);           // 10% white
static const Color glassBorder = Color(0x33FFFFFF);          // 20% white border
```

### 📝 Typography

```dart
// === FONT FAMILY ===
// Primary: SF Pro Display (iOS) / Roboto (Android)
// Alternative: Inter, Poppins

// === SCALE ===
class WorkOnTypography {
  // Headings
  static const TextStyle h1 = TextStyle(
    fontSize: 32,
    fontWeight: FontWeight.w700,
    letterSpacing: -0.5,
    color: textPrimary,
  );
  
  static const TextStyle h2 = TextStyle(
    fontSize: 24,
    fontWeight: FontWeight.w600,
    letterSpacing: -0.3,
    color: textPrimary,
  );
  
  static const TextStyle h3 = TextStyle(
    fontSize: 20,
    fontWeight: FontWeight.w600,
    color: textPrimary,
  );
  
  // Body
  static const TextStyle bodyLarge = TextStyle(
    fontSize: 16,
    fontWeight: FontWeight.w400,
    color: textSecondary,
  );
  
  static const TextStyle bodyMedium = TextStyle(
    fontSize: 14,
    fontWeight: FontWeight.w400,
    color: textSecondary,
  );
  
  static const TextStyle bodySmall = TextStyle(
    fontSize: 12,
    fontWeight: FontWeight.w400,
    color: textTertiary,
  );
  
  // Labels
  static const TextStyle label = TextStyle(
    fontSize: 12,
    fontWeight: FontWeight.w500,
    letterSpacing: 0.5,
    color: textTertiary,
  );
  
  // CTA
  static const TextStyle button = TextStyle(
    fontSize: 16,
    fontWeight: FontWeight.w600,
    letterSpacing: 0.3,
    color: textOnRed,
  );
  
  // Stats (grands chiffres)
  static const TextStyle stat = TextStyle(
    fontSize: 28,
    fontWeight: FontWeight.w700,
    color: textPrimary,
  );
}
```

### 🃏 Card Styles

```dart
class WorkOnCardStyles {
  // === STANDARD CARD ===
  static BoxDecoration standard = BoxDecoration(
    color: backgroundSecondary,
    borderRadius: BorderRadius.circular(16),
    boxShadow: [
      BoxShadow(
        color: Colors.black.withOpacity(0.3),
        blurRadius: 12,
        offset: Offset(0, 4),
      ),
    ],
  );
  
  // === GLASSMORPHISM CARD ===
  static BoxDecoration glass = BoxDecoration(
    color: glassWhite,
    borderRadius: BorderRadius.circular(16),
    border: Border.all(color: glassBorder, width: 1),
    boxShadow: [
      BoxShadow(
        color: Colors.black.withOpacity(0.2),
        blurRadius: 20,
        offset: Offset(0, 8),
      ),
    ],
  );
  
  // === ELEVATED CARD (pour modals, overlays) ===
  static BoxDecoration elevated = BoxDecoration(
    color: backgroundTertiary,
    borderRadius: BorderRadius.circular(20),
    boxShadow: [
      BoxShadow(
        color: Colors.black.withOpacity(0.5),
        blurRadius: 24,
        offset: Offset(0, 12),
      ),
    ],
  );
  
  // === WORKER CARD (swipe style) ===
  static BoxDecoration workerCard = BoxDecoration(
    color: backgroundSecondary,
    borderRadius: BorderRadius.circular(24),
    boxShadow: [
      BoxShadow(
        color: Colors.black.withOpacity(0.4),
        blurRadius: 16,
        offset: Offset(0, 8),
      ),
    ],
  );
}

// === DIMENSIONS ===
class WorkOnSpacing {
  static const double xs = 4;
  static const double sm = 8;
  static const double md = 16;
  static const double lg = 24;
  static const double xl = 32;
  static const double xxl = 48;
  
  static const double cardRadius = 16;
  static const double cardRadiusLarge = 24;
  static const double buttonRadius = 12;
}
```

### 🔘 Button Styles

```dart
class WorkOnButtonStyles {
  // === PRIMARY (Rouge) ===
  static ButtonStyle primary = ElevatedButton.styleFrom(
    backgroundColor: brandRed,
    foregroundColor: textOnRed,
    elevation: 4,
    shadowColor: brandRed.withOpacity(0.5),
    padding: EdgeInsets.symmetric(horizontal: 24, vertical: 16),
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(12),
    ),
    textStyle: WorkOnTypography.button,
  );
  
  // === SECONDARY (Outline) ===
  static ButtonStyle secondary = OutlinedButton.styleFrom(
    foregroundColor: textPrimary,
    side: BorderSide(color: glassBorder, width: 1.5),
    padding: EdgeInsets.symmetric(horizontal: 24, vertical: 16),
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(12),
    ),
    textStyle: WorkOnTypography.button.copyWith(color: textPrimary),
  );
  
  // === GHOST (Text only) ===
  static ButtonStyle ghost = TextButton.styleFrom(
    foregroundColor: brandRed,
    padding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
    textStyle: WorkOnTypography.button.copyWith(color: brandRed),
  );
  
  // === DISABLED ===
  static ButtonStyle disabled = ElevatedButton.styleFrom(
    backgroundColor: backgroundTertiary,
    foregroundColor: textTertiary,
    elevation: 0,
    padding: EdgeInsets.symmetric(horizontal: 24, vertical: 16),
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(12),
    ),
  );
  
  // === ICON BUTTON (FAB style) ===
  static ButtonStyle iconPrimary = ElevatedButton.styleFrom(
    backgroundColor: brandRed,
    foregroundColor: textOnRed,
    elevation: 8,
    shadowColor: brandRed.withOpacity(0.5),
    shape: CircleBorder(),
    padding: EdgeInsets.all(16),
  );
}
```

### 🎯 Icon Usage Rules

```
╔════════════════════════════════════════════════════════════════════╗
║  ICÔNES BRAND                                                      ║
║  ─────────────────                                                 ║
║  • Téléphone rouge → Splash, App Icon, Header                      ║
║  • Pin rouge → Logo "WorkOn", Map markers, Location                ║
║                                                                    ║
║  ICÔNES UI (Material/Cupertino)                                    ║
║  ─────────────────────────────                                     ║
║  • Navigation: filled icons, 24px, textSecondary                   ║
║  • Navigation active: filled icons, 24px, brandRed                 ║
║  • Actions: outlined icons, 20px                                   ║
║  • Status: filled icons avec couleur sémantique                    ║
║                                                                    ║
║  ICÔNES CUSTOM                                                     ║
║  ─────────────                                                     ║
║  • Badges worker: "RELIABLE", "PUNCTUAL", "TOP PERFORMER"          ║
║  • Catégories missions: iconographie métiers                       ║
║                                                                    ║
╚════════════════════════════════════════════════════════════════════╝
```

---

## 3️⃣ SCREEN-BY-SCREEN REHAUSSEMENT PLAN

### 📱 ÉCRAN 1: Login / Splash

**Référence mockup:** Image 3 (écran gauche)

| Aspect | Ce qui reste | Ce qui change |
|--------|--------------|---------------|
| **Layout** | Champs email/password, boutons | Background → noir profond |
| **Logo** | Position centrale | Ajout icône téléphone rouge au-dessus |
| **Branding** | Texte "WorkOn" | Logo avec pin rouge pour le "O" |
| **Tagline** | - | Ajout "Une ligne directe vers le travail instantané" |
| **Boutons** | Se connecter, S'inscrire | Style primary (rouge) + secondary (outline) |
| **Inputs** | TextField standard | Dark inputs avec border subtile |

**Priorité:** 🔴 HIGH

**Composants à créer:**
- `WorkOnLogo` widget (avec pin animé)
- `WorkOnTextField` dark style
- `WorkOnPrimaryButton`

---

### 📱 ÉCRAN 2: Home / Dashboard

**Référence mockup:** Image 6

| Aspect | Ce qui reste | Ce qui change |
|--------|--------------|---------------|
| **Header** | Nom utilisateur | Logo WorkOn + avatar utilisateur |
| **Content** | Liste missions | Section "TOP GAINS" leaderboard |
| **Cards** | Mission cards | Style glassmorphism avec shadow |
| **Navigation** | Bottom nav | 5 tabs avec icônes (Missions, Connect, Centre, Messages, Profile) |
| **FAB** | - | Bouton "+" rouge pour créer mission |

**Priorité:** 🔴 HIGH

**Composants à créer:**
- `WorkOnBottomNav` avec pin central
- `LeaderboardCard` pour TOP GAINS
- `WorkOnHeader` avec logo + avatar

---

### 📱 ÉCRAN 3: Worker Cards (Liste/Swipe)

**Référence mockup:** Image 3 (2ème écran - Alice Martin)

| Aspect | Ce qui reste | Ce qui change |
|--------|--------------|---------------|
| **Layout** | Liste workers | Style swipe cards (Tinder-like) |
| **Photo** | Avatar circulaire | Grande photo carrée arrondie |
| **Info** | Nom, rating | Rating étoiles + description courte |
| **Actions** | Bouton contact | Boutons ❌ (passer) et ❤️ (favoris) |
| **Animation** | - | Swipe left/right gesture |

**Priorité:** 🟡 MEDIUM

**Composants à créer:**
- `WorkerSwipeCard` avec photo large
- `SwipeActions` (X et ❤️)
- `RatingStars` widget

---

### 📱 ÉCRAN 4: Worker Profile

**Référence mockup:** Images 4, 5 (Vincent Roy, Sophie Tremblay)

| Aspect | Ce qui reste | Ce qui change |
|--------|--------------|---------------|
| **Header** | Photo + nom | Photo ronde large + nom + métier |
| **Badges** | - | Ajout badges: "RELIABLE", "PUNCTUAL", "TOP PERFORMER" |
| **Stats** | Basic info | 3 colonnes: Missions | Earned | Rating |
| **Actions** | - | Boutons "Edit Profile", "Enable Premium", "Share Profile" |
| **Timeline** | - | Section historique missions avec photos |
| **Reviews** | Liste reviews | Reviews avec quotes stylisées |
| **Progress** | - | Barre "% du profil complété" |

**Priorité:** 🔴 HIGH

**Composants à créer:**
- `ProfileHeader` avec photo + badges
- `StatsRow` (3 colonnes)
- `TimelineItem` pour historique
- `BadgeChip` (RELIABLE, PUNCTUAL, etc.)
- `ProfileProgressBar`

---

### 📱 ÉCRAN 5: Map View

**Référence mockup:** Image 3 (3ème écran)

| Aspect | Ce qui reste | Ce qui change |
|--------|--------------|---------------|
| **Map** | Google Maps | Style dark map |
| **Markers** | Pins standard | Pins rouges WorkOn |
| **Search** | Barre recherche | Search bar dark avec filtre |
| **Cards** | - | Cards missions glassmorphism sur la map |
| **Preview** | - | Card preview avec photo, titre, rating, distance |

**Priorité:** 🟡 MEDIUM

**Composants à créer:**
- `WorkOnMapMarker` (pin rouge custom)
- `MissionMapCard` glassmorphism
- `SearchBarDark` avec filtres

---

### 📱 ÉCRAN 6: Account / Settings

**Référence mockup:** Image 3 (4ème écran - Jean Dupont)

| Aspect | Ce qui reste | Ce qui change |
|--------|--------------|---------------|
| **Header** | Photo + nom | Photo ronde + nom + badge "Certifié" |
| **Balance** | - | Affichage solde: "€320" style prominent |
| **Menu** | Liste settings | Menu items avec icônes: Portefeuille, Missions, Favoris, Paramètres, Aide |
| **Actions** | Logout | Bouton "Se déconnecter" rouge outline |
| **Footer** | - | Liens légaux (Privacy, Terms) |

**Priorité:** 🟡 MEDIUM

**Composants à créer:**
- `AccountHeader` avec balance
- `SettingsMenuItem` avec icône + chevron
- `LegalFooter` avec liens

---

## 4️⃣ FLUTTER IMPLEMENTATION STRATEGY

### Phase 1: Design System Foundation

```
📁 lib/
├── 📁 core/
│   ├── 📁 theme/
│   │   ├── workon_colors.dart      ← Palette couleurs
│   │   ├── workon_typography.dart  ← Styles texte
│   │   ├── workon_theme.dart       ← ThemeData complet
│   │   └── workon_spacing.dart     ← Constantes spacing
│   │
│   └── 📁 widgets/
│       ├── workon_button.dart      ← Boutons (primary, secondary, ghost)
│       ├── workon_card.dart        ← Cards (standard, glass, elevated)
│       ├── workon_text_field.dart  ← Inputs dark style
│       ├── workon_logo.dart        ← Logo avec pin animé
│       └── workon_bottom_nav.dart  ← Navigation bottom
```

### Phase 2: Screen Updates (Incremental)

```
Ordre d'implémentation:
1. ThemeData → Apply globally (non-breaking)
2. Login/Splash → Premier impact visuel
3. Home/Dashboard → Core experience
4. Worker Profile → High visibility
5. Map View → Complex mais impactant
6. Settings → Lower priority
```

### Phase 3: Components Migration

```dart
// AVANT (générique)
ElevatedButton(
  onPressed: () {},
  child: Text('Se connecter'),
)

// APRÈS (design system)
WorkOnButton.primary(
  onPressed: () {},
  label: 'Se connecter',
)
```

### Non-Destructive Approach

```dart
// 1. Créer ThemeData sans casser l'existant
class WorkOnTheme {
  static ThemeData get dark => ThemeData(
    brightness: Brightness.dark,
    scaffoldBackgroundColor: WorkOnColors.backgroundPrimary,
    primaryColor: WorkOnColors.brandRed,
    // ... rest of theme
  );
}

// 2. Appliquer dans main.dart
MaterialApp(
  theme: WorkOnTheme.dark,  // ← Seul changement
  // routes restent identiques
)

// 3. Migrer composants progressivement
// Chaque écran peut être mis à jour indépendamment
```

---

## 5️⃣ ASSETS REQUIREMENTS

### App Icons

| Platform | Dimensions | Format | Notes |
|----------|------------|--------|-------|
| iOS | 1024x1024 | PNG | Pas de transparence, pas de coins arrondis |
| Android | 512x512 | PNG | Peut avoir transparence |
| Adaptive (Android) | 108x108 (safe zone) | PNG | Foreground + background séparés |

**Design:** Téléphone rouge vintage sur fond noir/dark

### Screenshots (avec nouveau design)

| Screen | Priority | Content |
|--------|----------|---------|
| 1 | HIGH | Splash/Login avec logo |
| 2 | HIGH | Home Dashboard avec TOP GAINS |
| 3 | HIGH | Worker Cards (swipe view) |
| 4 | HIGH | Worker Profile avec stats |
| 5 | MEDIUM | Map View avec missions |
| 6 | MEDIUM | Settings/Account |

### Feature Graphic (Android)

- Dimensions: 1024x500
- Content: Logo WorkOn + tagline + mockup device
- Style: Dark background, rouge accent

---

## 6️⃣ IMPLEMENTATION CHECKLIST

### Phase 1: Foundation (Jour 1-2)
- [ ] Créer `workon_colors.dart`
- [ ] Créer `workon_typography.dart`
- [ ] Créer `workon_theme.dart`
- [ ] Appliquer ThemeData globalement
- [ ] Créer `WorkOnButton` widget
- [ ] Créer `WorkOnCard` widget
- [ ] Créer `WorkOnTextField` widget

### Phase 2: Core Screens (Jour 3-4)
- [ ] Rehausser Login/Splash
- [ ] Créer `WorkOnLogo` widget
- [ ] Rehausser Home/Dashboard
- [ ] Créer `WorkOnBottomNav`
- [ ] Rehausser Worker Profile

### Phase 3: Secondary Screens (Jour 5)
- [ ] Rehausser Worker Cards
- [ ] Rehausser Map View
- [ ] Rehausser Settings
- [ ] Ajouter `LegalFooter`

### Phase 4: Polish (Jour 6)
- [ ] Animations subtiles
- [ ] Transitions entre écrans
- [ ] Micro-interactions
- [ ] Tests responsive

### Phase 5: Assets (Jour 7)
- [ ] Générer App Icons
- [ ] Capturer Screenshots
- [ ] Créer Feature Graphic

---

## 📊 EFFORT ESTIMATION

| Phase | Effort | Compétence |
|-------|--------|------------|
| Design System | 8-12h | Flutter Dev |
| Core Screens | 12-16h | Flutter Dev |
| Secondary Screens | 8-12h | Flutter Dev |
| Polish | 4-8h | Flutter Dev |
| Assets | 4-8h | Designer |
| **TOTAL** | **36-56h** | **~1-2 semaines** |

---

**Document créé le 31 janvier 2026**  
**WorkOn UI Rehaussement Plan v1.0**
