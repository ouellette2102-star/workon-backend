# WORKON — PRD UX/UI PREMIUM
## Direction Mobile Native Mondiale
### Version 1.0 — Mars 2026
### Classifié : Document de Direction Produit Interne

---

> **Rôle de ce document**
> Ce PRD est le document de référence unique pour la direction UX/UI de WorkOn.
> Il sert de boussole stratégique pour toutes les décisions design, produit et développement.
> Il est exécutable, priorisé, légalement défendable et orienté rétention + confiance + valeur réelle.

---

# PARTIE 1 — FONDATIONS STRATÉGIQUES

---

## 1. POSITIONNEMENT UX

### La sensation que WorkOn doit donner

Quand un utilisateur ouvre WorkOn, il doit ressentir en moins de 3 secondes :

> **"Cette plateforme me prend au sérieux. Elle est faite pour moi. Je peux agir maintenant."**

Ce n'est pas une app de petites annonces. Ce n'est pas un job board. Ce n'est pas un réseau social générique.

WorkOn est **l'infrastructure de confiance** entre les personnes qui ont des compétences et les personnes qui ont des besoins. La sensation doit être :

- **Puissante** — le produit respire la compétence
- **Rapide** — chaque action est à portée d'un geste
- **Confiante** — tout est transparent, vérifiable, sécurisé
- **Locale mais mondiale** — pertinent ici, crédible partout
- **Juste** — ni employeur ni patron, une infrastructure neutre et équitable

### Pourquoi un utilisateur doit préférer WorkOn

| Dimension | WorkOn vs. alternatives |
|---|---|
| Rapidité d'activation | Passer de l'inscription à la première action en < 5 minutes |
| Confiance instantanée | Profils vérifiés, badges, conformité visible dès le premier regard |
| Pertinence locale | Map + géolocalisation = opportunités à portée immédiate |
| Neutralité légale | Pas de subordination, contrat de service clair, posture marketplace |
| Profil qui travaille pour soi | Visibilité passive 24h/24, même sans être connecté |
| Matching intelligent | Pas de scroll infini inutile — des suggestions pertinentes |
| Monétisation juste | Le gratuit est suffisant pour commencer, le premium est désirable |

### La promesse UX centrale

> **WorkOn connecte les compétences aux besoins, instantanément, en confiance, pour tout le monde.**

Cette phrase doit être le filtre de toute décision design :
- "Est-ce que cet écran connecte mieux ?" → Garde-le
- "Est-ce que cela construit la confiance ?" → Garde-le
- "Est-ce que cela alourdit sans valeur ?" → Supprime-le

---

## 2. PRINCIPES DE DESIGN

Ces 10 principes ne sont pas décoratifs. Ils sont des garde-fous décisionnels.

---

### P1 — CLARTÉ AVANT EFFET
Chaque écran doit être compris en moins de 2 secondes par un nouvel utilisateur.
L'animation, le style et la profondeur servent la clarté — jamais l'inverse.
*Règle opérationnelle : si on retire l'effet, l'écran doit toujours faire sens.*

### P2 — ACTION AVANT COMPLEXITÉ
L'utilisateur doit pouvoir agir (postuler, publier, contacter, réserver) avant de tout comprendre.
L'app guide progressivement, elle n'impose pas un manuel d'utilisation à l'entrée.
*Règle opérationnelle : le CTA primaire est toujours visible sans scroll sur mobile.*

### P3 — CONFIANCE AVANT DENSITÉ
Chaque profil, chaque carte, chaque transaction doit signaler la confiance avant l'information.
Badge, étoile, statut vérifié, photo réelle — ces signaux passent avant les détails.
*Règle opérationnelle : pas de carte sans au minimum un signal de confiance visible.*

### P4 — MOBILE NATIF, PAS MOBILE WEB
Chaque interaction respecte les conventions iOS/Android.
Swipe, bottom sheet, tab bar, haptic feedback, pull-to-refresh — tout est natif.
*Règle opérationnelle : aucun pattern web-first ne passe en production mobile.*

### P5 — DENSITÉ MAÎTRISÉE
WorkOn n'est pas un tableau Excel. Chaque écran a un focus principal et 2 actions secondaires maximum.
La richesse s'exprime en profondeur (scroll vertical) pas en largeur (compression).
*Règle opérationnelle : test des 3 secondes — si l'œil ne sait pas où aller, réduire.*

### P6 — PROGRESSION VISIBLE
L'utilisateur doit toujours savoir où il en est, ce qu'il a accompli, ce qu'il peut améliorer.
La progression est une mécanique de rétention, pas une gamification creuse.
*Règle opérationnelle : chaque espace utilisateur a un indicateur de complétion ou de statut.*

### P7 — NEUTRALITÉ LÉGALE BY DESIGN
Aucun texte, aucune icône, aucune mécanique ne doit sous-entendre une relation d'emploi.
Le vocabulaire est celui du contrat de service : mission, prestation, accord, confirmation.
*Règle opérationnelle : revue légale obligatoire de tout label UX avant production.*

### P8 — RÉTENTION PAR UTILITÉ RÉELLE
Les notifications, nudges et rappels sont justifiés par de la valeur réelle, pas du bruit.
Un utilisateur ne revient pas parce qu'il est harcelé, mais parce qu'il y trouve quelque chose.
*Règle opérationnelle : chaque notification doit passer le test "est-ce que je suis content de l'avoir reçue ?"*

### P9 — INCLUSIVITÉ SANS COMPROMIS PREMIUM
WorkOn sert des travailleurs autonomes, des PME, des résidents. Tous les niveaux de littératie digitale.
La simplicité du parcours de base ne compromet jamais la profondeur pour les utilisateurs avancés.
*Règle opérationnelle : 3 niveaux d'interface — onboarding simple, usage courant, power user.*

### P10 — COHÉRENCE TOTALE DU SYSTÈME
Un composant créé une fois est réutilisé partout. Pas de composant orphelin.
La cohérence visuelle est ce qui transforme une app en plateforme crédible.
*Règle opérationnelle : aucun composant custom sans validation dans le design system.*

---

## 3. SYSTÈME VISUEL PREMIUM

### 3.1 — Palette de couleurs

**Couleurs fondatrices**

| Rôle | Valeur | Usage |
|---|---|---|
| `Background Deep` | `#0A0A0A` | Fond principal, dark mode absolu |
| `Background Surface` | `#141414` | Cartes, modals, bottom sheets |
| `Background Elevated` | `#1E1E1E` | Inputs, sections élevées |
| `Border Subtle` | `#2A2A2A` | Séparateurs, contours discrets |
| `Border Medium` | `#3A3A3A` | Contours de cartes |

**Couleurs de marque — Gradient WorkOn**

| Rôle | Valeur | Usage |
|---|---|---|
| `Brand Primary` | `#E8400C` | Rouge-orange vif — CTA primaires, accents forts |
| `Brand Secondary` | `#FF6B35` | Orange — états hover, secondaires |
| `Brand Gradient Start` | `#C62800` | Rouge profond — début du gradient |
| `Brand Gradient End` | `#FF7A2F` | Orange lumineux — fin du gradient |
| `Brand Glow` | `rgba(232,64,12,0.15)` | Halo subtil autour des éléments actifs |

**Texte et icônes**

| Rôle | Valeur | Usage |
|---|---|---|
| `Text Primary` | `#F5F5F5` | Titres, labels principaux |
| `Text Secondary` | `#A0A0A0` | Sous-titres, métadonnées |
| `Text Disabled` | `#505050` | États désactivés |
| `Text Inverse` | `#0A0A0A` | Texte sur fond clair/CTA |

**Couleurs sémantiques**

| Rôle | Valeur | Usage |
|---|---|---|
| `Success` | `#22C55E` | Confirmations, badges verts |
| `Warning` | `#F59E0B` | Alertes, profils incomplets |
| `Error` | `#EF4444` | Erreurs, litiges |
| `Info` | `#3B82F6` | Informations, nouvelles |
| `Premium Gold` | `#F5C842` | Badge premium, niveau top |
| `Verified Blue` | `#1D9BF0` | Identité vérifiée, conformité |

---

### 3.2 — Typographie

**Stack typographique recommandée**

```
Display / Hero    : SF Pro Display Bold (iOS) / Roboto Bold (Android)
Titre section     : SF Pro Display Semibold / Roboto Medium
Corps principal   : SF Pro Text Regular / Roboto Regular
Corps secondaire  : SF Pro Text Light / Roboto Light
Labels / Tags     : SF Pro Text Medium / Roboto Medium
Mono / Données    : SF Mono / Roboto Mono
```

**Échelle typographique**

| Token | Taille | Poids | Ligne | Usage |
|---|---|---|---|---|
| `display-xl` | 32px | 800 | 38px | Hero sections, onboarding |
| `display-lg` | 28px | 700 | 34px | Titres d'écran principaux |
| `heading-md` | 22px | 600 | 28px | Sections, modals |
| `heading-sm` | 18px | 600 | 24px | Cartes, sous-sections |
| `body-lg` | 16px | 400 | 24px | Corps principal |
| `body-md` | 14px | 400 | 20px | Corps secondaire |
| `body-sm` | 12px | 400 | 16px | Métadonnées, labels |
| `caption` | 10px | 500 | 14px | Badges, tags, micro-labels |

---

### 3.3 — Spacing & Radius

**Échelle de spacing (base 4px)**

```
space-1  : 4px    — micro espacement, icônes
space-2  : 8px    — espacement interne compact
space-3  : 12px   — espacement standard
space-4  : 16px   — padding de base
space-5  : 20px   — espacement confortable
space-6  : 24px   — gap entre sections
space-8  : 32px   — espacement large
space-10 : 40px   — sections majeures
space-12 : 48px   — hero, onboarding
space-16 : 64px   — espaces d'air maximal
```

**Échelle de radius**

```
radius-xs : 4px   — tags, badges
radius-sm : 8px   — inputs, boutons secondaires
radius-md : 12px  — cartes standard
radius-lg : 16px  — cartes proéminentes, modals
radius-xl : 24px  — bottom sheets, hero cards
radius-full : 9999px — avatars, boutons pill, chips
```

---

### 3.4 — Profondeur & Ombres

```
shadow-sm   : 0 1px 3px rgba(0,0,0,0.4)         — cartes légères
shadow-md   : 0 4px 12px rgba(0,0,0,0.5)         — cartes standard
shadow-lg   : 0 8px 24px rgba(0,0,0,0.6)         — modals, bottom sheets
shadow-glow : 0 0 20px rgba(232,64,12,0.25)       — CTA actifs, éléments premium
shadow-card : 0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)
```

---

### 3.5 — Iconographie

- **Style** : Outlined avec stroke 1.5px, corners légèrement arrondis
- **Librairie recommandée** : Phosphor Icons ou SF Symbols (iOS) / Material Symbols (Android)
- **Tailles** : 16px (micro), 20px (standard), 24px (navigation), 32px (hero)
- **Couleur** : `Text Secondary` par défaut, `Brand Primary` pour l'état actif
- **Jamais** d'icônes remplies et d'icônes outlined mélangées dans le même contexte

---

### 3.6 — Usage du Gradient Marque

**Règles d'usage**

Le gradient `#C62800 → #FF7A2F` est utilisé **avec parcimonie** pour créer de l'impact :
- CTA primaire (bouton principal de l'écran)
- Barre de progression premium
- Highlight de badge top performer
- Fond de l'écran d'onboarding hero (atténué, cinématique)
- Overlay sur photo de profil pour les cartes swipe

**Ce qu'il ne faut pas faire**
- Ne pas gradient-ifier tout l'écran
- Ne pas utiliser le gradient sur du texte secondaire
- Ne jamais mélanger rouge-orange et bleu ou vert dans le même composant

---

### 3.7 — Composants visuels clés

**Cartes standard**
```
Background : #141414
Border     : 1px solid #2A2A2A
Radius     : 16px
Shadow     : shadow-card
Padding    : 16px
```

**CTA Primaire**
```
Background  : gradient(#C62800, #FF7A2F)
Text        : #FFFFFF bold 16px
Radius      : radius-full (pill) ou radius-md (rectangulaire)
Height      : 52px (mobile standard)
Shadow      : shadow-glow
```

**CTA Secondaire**
```
Background  : transparent
Border      : 1px solid #3A3A3A
Text        : #F5F5F5 medium 15px
Radius      : radius-full ou radius-md
Height      : 48px
```

**Bottom Navigation Bar**
```
Background  : #0F0F0F avec blur iOS (backdrop-filter)
Border top  : 1px solid #1E1E1E
Height      : 83px (avec safe area iOS) / 68px Android
Icons       : 24px, 5 éléments max
Active      : Brand Primary + label visible
Inactive    : Text Disabled sans label (ou label atténué)
```

**Tags / Chips**
```
Background actif   : rgba(232,64,12,0.15) border #E8400C
Background inactif : #1E1E1E border #2A2A2A
Text               : 12px medium
Radius             : radius-full
Padding            : 6px 12px
```

**Badges de statut**
```
Verified    : #1D9BF0 + icône checkmark
Premium     : #F5C842 + icône star
Top Rated   : gradient WorkOn + icône award
Disponible  : #22C55E + dot animé
Hors ligne  : #505050
Conforme    : #22C55E + shield
```

---

# PARTIE 2 — ARCHITECTURE PRODUIT

---

## 4. ARCHITECTURE DE L'APPLICATION

### 4.1 — Navigation principale (Bottom Tab Bar)

5 onglets, dans cet ordre, pour tous les rôles :

```
[ Explorer ] [ Map ] [ + Publier ] [ Messages ] [ Profil ]
```

| Tab | Icône | Rôle primaire | Comportement |
|---|---|---|---|
| **Explorer** | Compass | Découvrir candidats / missions / opportunités | Swipe + Feed contextuel |
| **Map** | Map Pin | Voir appels de service géolocalisés | Map interactive avec pins |
| **+ Publier** | Plus circle (gradient) | Action principale selon rôle | Bottom sheet contextuel |
| **Messages** | Chat bubble | Conversations actives | Badge numérique |
| **Profil** | Avatar | Profil personnel + paramètres | Hub central |

**Note architecture** : Le bouton central `+ Publier` change de comportement selon le rôle :
- Travailleur → "Annoncer ma disponibilité" / "Poster une offre de service"
- Client → "Publier une mission" / "Faire une demande"
- Entreprise → "Publier un appel d'offre" / "Inviter un prestataire"

---

### 4.2 — Hiérarchie des sections

```
APP WORKON
│
├── ONBOARDING (hors navigation principale)
│   ├── Splash / Welcome
│   ├── Choix du type de compte
│   ├── Création profil progressif
│   └── Activation (email/téléphone)
│
├── EXPLORER (Tab 1)
│   ├── Feed contextuel (missions / travailleurs selon rôle)
│   ├── Swipe mode (découverte rapide)
│   ├── Filtres intelligents
│   └── Résultats de recherche
│
├── MAP (Tab 2)
│   ├── Vue carte principale
│   ├── Pins de disponibilité (travailleurs)
│   ├── Pins de missions (clients)
│   ├── Zoom / clusters
│   └── Preview cards (bottom sheet)
│
├── PUBLIER (Tab 3 — Action centrale)
│   ├── Publier mission (client)
│   ├── Mettre à jour disponibilité (travailleur)
│   ├── Créer offre de service (travailleur)
│   └── Publier appel d'offre (entreprise)
│
├── MESSAGES (Tab 4)
│   ├── Liste des conversations
│   ├── Fil de conversation
│   ├── Pièces jointes / Documents
│   └── Confirmation de mission dans le chat
│
└── PROFIL (Tab 5)
    ├── Profil public (vue externe)
    ├── Profil scrollable vertical (hub personnel)
    ├── Édition profil
    ├── Dashboard (activité, gains, stats)
    ├── Conformité / Documents / Licences
    ├── Paramètres compte
    ├── Abonnement premium
    └── Aide / Support
```

---

### 4.3 — Rôles utilisateur et différenciation UX

WorkOn supporte 4 postures utilisateur. L'onboarding les segmente dès le départ, mais un utilisateur peut avoir les deux rôles.

| Rôle | Identité | Besoin primaire | CTA dominant |
|---|---|---|---|
| **Travailleur autonome** | Prestataire, freelance, auto-entrepreneur | Visibilité, missions, revenus | "Voir les missions disponibles" |
| **Client résidentiel** | Particulier, propriétaire | Trouver quelqu'un de confiance rapidement | "Trouver un prestataire" |
| **Client entreprise** | PME, gestionnaire, RH | Sourcing fiable, volume, conformité | "Publier un appel d'offre" |
| **Double rôle** | Travailleur ET client | Flexibilité totale | Interface adaptée contextuelle |

**Personnalisation UX selon le rôle**
- Le feed Explorer est inversé : le travailleur voit des missions, le client voit des profils
- Le bouton + Publier propose des actions différentes selon le rôle actif
- Le dashboard affiche des métriques différentes (revenus vs. dépenses, missions gagnées vs. publiées)
- Les notifications sont filtrées et pertinentes au rôle actif

---

## 5. PARCOURS CROISÉS

### 5.1 — Parcours Travailleur

```
Onboarding Travailleur
│
├── Type de compte → Travailleur autonome
├── Métier principal (catalogue 90 métiers)
├── Zone géographique desservie
├── Photo de profil (obligatoire — impact fort sur matching)
├── Complétion profil progressive (20% → 100%)
│
└── Activation
    ├── Dashboard avec score de complétion
    ├── Suggestions de missions pertinentes (matching immédiat)
    ├── CTA : "Compléter mon profil pour plus de visibilité"
    └── Premier contact ou première candidature
```

### 5.2 — Parcours Client Résidentiel

```
Onboarding Client Résidentiel
│
├── Type de compte → Client / J'ai un besoin
├── Type de besoin (optionnel à l'onboarding)
├── Adresse / Zone (géolocalisation ou saisie)
│
└── Activation
    ├── Feed de travailleurs disponibles dans sa zone
    ├── CTA : "Publier ma première demande"
    ├── OU : "Parcourir les prestataires disponibles maintenant"
    └── Matching immédiat + contact direct
```

### 5.3 — Parcours Client Entreprise

```
Onboarding Client Entreprise
│
├── Type de compte → Entreprise / Organisation
├── Secteur d'activité
├── Taille (optionnel)
├── Email professionnel pour vérification
│
└── Activation
    ├── Dashboard entreprise avec outils de publication
    ├── CTA : "Publier votre premier appel d'offre"
    ├── Accès outils CRM léger (premium)
    └── Invitation à upgrader pour volume et analytics
```

---

## 6. ONBOARDING INTELLIGENT

### 6.1 — Principes d'onboarding WorkOn

L'onboarding WorkOn suit la règle du **"valeur avant effort"** :
1. Montrer de la valeur en < 60 secondes
2. Demander le minimum vital pour activer le compte
3. Reporter les informations complexes (conformité, documents) après la première valeur

### 6.2 — Structure de l'onboarding

**Étape 0 — Splash & Hook (5 secondes)**
- Écran cinématique avec le gradient WorkOn
- Tagline animée : "Connectez vos compétences. Trouvez vos missions."
- CTA unique : "Commencer" (sans login social forcé)

**Étape 1 — Choix du rôle (10 secondes)**
- Deux grandes cartes visuelles : "J'offre des services" / "J'ai un besoin"
- Sous-texte rassurant et simple
- Possibilité de cocher les deux
- Aucune contrainte légale visible à cette étape

**Étape 2 — Personnalisation rapide (30 secondes)**
- Pour travailleur : choisir son/ses métiers dans le catalogue visuel (icônes grandes, scroll horizontal)
- Pour client : choisir le type de besoin (optionnel — "Je déciderai plus tard")
- Géolocalisation ou zone manuelle

**Étape 3 — Création de compte (45 secondes)**
- Prénom + Nom
- Email ou téléphone
- Mot de passe fort avec indicateur visuel
- Pas de CGU interminable en wall of text — checkbox simple avec lien

**Étape 4 — Photo de profil (30 secondes)**
- Message motivant : "Les profils avec photo reçoivent 5x plus de demandes"
- Upload obligatoire mais guidelines visuelles (pas de logo, vrai visage)
- Alternative : "Je compléterai plus tard" (mais visible dans le score de complétion)

**Étape 5 — Activation valeur immédiate**
- Redirection vers le feed personnalisé avec les premières opportunités pertinentes
- Score de complétion visible : 40%
- Nudge subtil : "Complétez votre profil pour apparaître dans les résultats"

### 6.3 — Score de complétion progressif

| Étape | Points | Débloqué |
|---|---|---|
| Photo de profil | +20% | Apparition dans les recherches |
| Description métier | +15% | Meilleur ranking |
| Zone desservie | +10% | Matching géographique |
| Certifications/Documents | +20% | Badge "Conforme" |
| Tarif indicatif | +10% | Filtre prix activé |
| Premier avis reçu | +15% | Badge "Fiable" |
| Identité vérifiée | +10% | Badge "Vérifié" |

---

# PARTIE 3 — ÉCRANS STRATÉGIQUES PRIORITAIRES

---

## 7. LES 10 ÉCRANS CRITIQUES

### ÉCRAN 1 — HOME / DASHBOARD PERSONNALISÉ

**Concept** : Le quartier général intelligent de l'utilisateur. Ce n'est pas un simple feed. C'est un tableau de bord qui parle de TOI.

**Structure de l'écran (scroll vertical)**

```
┌─────────────────────────────────────┐
│ [Avatar] Bonjour, Marco 👋           │
│ "3 nouvelles missions dans ta zone" │
│                              [🔔 2] │
├─────────────────────────────────────┤
│ STATUS CARD                         │
│ ● Disponible maintenant             │
│ Score visibilité : [████░░] 72%     │
│ Cette semaine : 4 demandes reçues  │
├─────────────────────────────────────┤
│ RAIL ACTIONS RAPIDES                │
│ [Mes missions] [Map live] [Boost]   │
├─────────────────────────────────────┤
│ SECTION : OPPORTUNITÉS PROCHES      │
│ ── Rail horizontal de cartes ──     │
│ [Card mission 1] [Card mission 2]   │
├─────────────────────────────────────┤
│ SECTION : PROFILS SIMILAIRES        │
│ (pour client : prestataires récents)│
│ ── Rail horizontal de cartes ──     │
├─────────────────────────────────────┤
│ SECTION : COMPLÉTEZ VOTRE PROFIL    │
│ [Ajouter une certification →]       │
│ +15% visibilité                     │
├─────────────────────────────────────┤
│ SECTION : ACTIVITÉ RÉCENTE          │
│ Timeline compacte des événements    │
└─────────────────────────────────────┘
```

**Règles UX**
- Greeting personnalisé avec le prénom
- Statut de disponibilité éditable en un tap depuis la home
- Maximum 3 sections visibles avant le premier scroll
- Aucun élément inutile visible above the fold

---

### ÉCRAN 2 — SWIPE / EXPLORER

**Concept** : La mécanique de découverte principale. Inspirée de Tinder pour la rapidité décisionnelle, mais avec la profondeur d'Airbnb pour la confiance.

**Mode Swipe (Travailleur voit des missions / Client voit des profils)**

```
┌─────────────────────────────────────┐
│ Explorer          [Filtres ⚙] [Map] │
├─────────────────────────────────────┤
│                                     │
│  ┌───────────────────────────────┐  │
│  │ PHOTO / AVATAR PLEIN FORMAT   │  │
│  │                               │  │
│  │ Overlay gradient bas          │  │
│  │ ─────────────────────────    │  │
│  │ Marco T. ✓ ⭐ 4.9 (47 avis)  │  │
│  │ Électricien • À 2.3 km       │  │
│  │ [Disponible aujourd'hui]      │  │
│  │ "Spécialisé résidentiel..."   │  │
│  │                               │  │
│  │ [💼 Compétences] [📋 Avis]   │  │
│  └───────────────────────────────┘  │
│                                     │
│     ✕ PASSER    ❤ CONTACTER        │
│                                     │
│  ───  ─────  ─────  ─────          │
│  (indicateurs de position dans deck) │
└─────────────────────────────────────┘
```

**Interactions**
- Swipe gauche = Passer (sans stigmate)
- Swipe droite = Marquer comme favori / Contacter
- Tap sur la carte = Profil complet en overlay (bottom sheet → plein écran)
- Tap sur la photo = Galerie photos
- Double tap = Super Like / Demande urgente (premium)

**Mode Feed (alternatif au swipe)**
- Toggle en haut : [Swipe] [Feed]
- Feed vertical inspiré TikTok/Pinterest
- Cartes plus compactes, plus d'informations visibles simultanément

---

### ÉCRAN 3 — MAP / PINS

**Concept** : La carte est l'écran le plus différenciant de WorkOn. Elle rend visible l'invisible — la disponibilité locale, les besoins proches, l'opportunité immédiate.

```
┌─────────────────────────────────────┐
│ [⬅] Zone active    [Filtres] [Liste]│
├─────────────────────────────────────┤
│                                     │
│     [Carte Google Maps / MapBox]    │
│                                     │
│   📍 (cluster 5)    🔴 Mission      │
│        📍 Marco                     │
│   🟢 Sophie  📍 (cluster 3)        │
│                    🔴 Mission urgente│
│                                     │
│   📍 = Travailleur disponible       │
│   🔴 = Mission publiée              │
│                                     │
├─────────────────────────────────────┤
│ ─── BOTTOM SHEET (drag-to-expand) ─ │
│ 3 prestataires disponibles près     │
│                                     │
│ [Avatar] Marco T. • Élec. • 2.3km  │
│ ⭐ 4.9 • Disponible maintenant      │
│                          [Contacter]│
│ ─────────────────────────────────── │
│ [Avatar] Sophie L. • Plomb. • 3km  │
└─────────────────────────────────────┘
```

**Règles UX Map**
- Les pins sont lisibles à tous les zooms (clustering intelligent)
- Couleurs distinctes par type (travailleur vs mission vs urgence)
- Bottom sheet draggable : compact / mi-hauteur / plein écran
- Tap sur pin = preview card flottante avec action directe
- Géolocalisation temps réel (avec consentement explicite)
- Filtres rapides : métier, disponibilité, rayon, note minimum

---

### ÉCRAN 4 — PROFIL PUBLIC

**Concept** : La vitrine professionnelle de l'utilisateur. Inspiré de la richesse d'Airbnb combinée à l'impact visuel de LinkedIn premium.

```
┌─────────────────────────────────────┐
│ [⬅]              [Partager] [...]   │
├─────────────────────────────────────┤
│ HERO PHOTO (pleine largeur, 240px)  │
│ Overlay gradient bas léger          │
├─────────────────────────────────────┤
│ [Avatar 80px] Marco Tremblay        │
│ ✓ Identité vérifiée                 │
│ ⭐ 4.9 • 47 avis • 98% fiabilité   │
│ Électricien • Montréal + 30km       │
│ [🟢 Disponible] [💬 Contacter]     │
├─────────────────────────────────────┤
│ BADGES ROW                          │
│ [✓ Conforme][⭐ Top Rated][🔒 Assuré]│
├─────────────────────────────────────┤
│ À PROPOS                            │
│ "Électricien certifié depuis 12 ans │
│  Résidentiel et commercial..."      │
│ [Voir plus]                         │
├─────────────────────────────────────┤
│ SERVICES OFFERTS                    │
│ Tags scrollables horizontaux        │
│ [Installation][Dépannage][Panel]   │
├─────────────────────────────────────┤
│ TARIFS                              │
│ À partir de 75$/h • Devis gratuit  │
├─────────────────────────────────────┤
│ PORTFOLIO (scroll horizontal)       │
│ [Photo 1][Photo 2][Photo 3][+14]   │
├─────────────────────────────────────┤
│ AVIS (scroll)                       │
│ [Avis 1 avec photo] [Avis 2]       │
├─────────────────────────────────────┤
│ CONFORMITÉ & CERTIFICATIONS         │
│ [Licence RBQ ✓][Assurance ✓]       │
├─────────────────────────────────────┤
│ MISSIONS RÉALISÉES                  │
│ 127 missions • 12 clients réguliers │
└─────────────────────────────────────┘
│ CTA FLOTTANT BAS                    │
│ [      Contacter Marco      ]       │
└─────────────────────────────────────┘
```

---

### ÉCRAN 5 — PROFIL SCROLLABLE VERTICAL (HUB PERSONNEL)

**Concept** : Le profil personnel est différent du profil public. C'est ton espace de contrôle. Feed vertical de ta propre activité, de ta progression, de tes opportunités.

**Structure (scroll vertical immersif)**

```
Section 1 : Hero identité (photo, nom, score, statut)
Section 2 : Progression (complétion, visibilité, rang)
Section 3 : Statistiques semaine (vues, demandes, réponses)
Section 4 : Missions actives (cartes scroll horizontal)
Section 5 : Historique récent (timeline compacte)
Section 6 : Votre réputation (avis récents, évolution note)
Section 7 : Badges et certifications
Section 8 : Contenu portfolio récent
Section 9 : Actions recommandées (nudges utiles)
```

---

### ÉCRAN 6 — ÉDITION DE PROFIL

**Concept** : L'édition de profil doit être aussi engageante que remplir son profil Airbnb hôte. Guidée, progressive, motivante.

**Structure par sections dépliables**

```
INFORMATIONS DE BASE
├── Photo principale (drag to reorder gallery)
├── Prénom / Nom
├── Description (avec counter caractères)
└── Langues

SERVICES & MÉTIERS
├── Métier principal (catalogue visuel)
├── Spécialités secondaires (tags)
└── Zone desservie (carte interactive)

TARIFS
├── Tarif horaire (optionnel mais recommandé)
├── Tarif à la mission (optionnel)
└── Devis gratuit oui/non

PORTFOLIO
├── Upload photos (drag & drop)
├── Description de chaque photo
└── Organiser / supprimer

CERTIFICATIONS & CONFORMITÉ
├── Licences métier
├── Assurances
├── Documents fiscaux
└── Liens REQ / CNESST / selon métier

DISPONIBILITÉ
├── Jours habituels
├── Disponible maintenant (toggle rapide)
└── Congés / indisponibilités
```

---

### ÉCRAN 7 — PUBLICATION DE MISSION

**Concept** : Publier une mission doit être aussi simple que poster une story. 3 étapes max pour une mission standard.

**Flux de publication (3 étapes)**

**Étape 1 — Décris ton besoin**
- Champ titre large (placeholder intelligent par métier)
- Catégorie / Métier (catalogue visuel)
- Description courte (optionnelle mais recommandée)
- Photos optionnelles (impact fort sur le matching)

**Étape 2 — Où et quand**
- Adresse (autocomplétion Google)
- Date souhaitée (date picker natif)
- Urgence : [Dès que possible] [Flexible] [Date précise]

**Étape 3 — Budget et préférences**
- Budget estimatif (ranges visuels, non bloquant)
- Préférences : [Noté 4.5+] [Disponible maintenant] [Assuré] [Certifié]
- Publier publiquement OU inviter directement un prestataire spécifique

**Confirmation**
- Résumé visuel de la mission
- Estimation "Recevez des offres en < 2h" (si profil suffisant)
- [Publier maintenant] et partage optionnel

---

### ÉCRAN 8 — MESSAGERIE

**Concept** : La messagerie de WorkOn n'est pas qu'un chat. C'est le canal de finalisation de l'accord. Elle intègre la confirmation de mission nativement.

```
┌─────────────────────────────────────┐
│ [⬅] Marco T.  [🟢] [Profil] [...]  │
│ Électricien • Réponse < 1h          │
├─────────────────────────────────────┤
│                                     │
│           [Messages récents...]     │
│                                     │
│    Vous : Bonjour, disponible le    │
│           15 mars pour panneau...   │
│                             10:32   │
│                                     │
│ Marco : Oui, je suis disponible.    │
│         Mon tarif est 85$/h.        │
│                             10:35 ✓ │
│                                     │
│  ╔══════════════════════════════╗   │
│  ║  💼 PROPOSITION DE MISSION  ║   │
│  ║  Remplacement panneau élec. ║   │
│  ║  📅 15 mars • 🕙 9h00      ║   │
│  ║  💵 255$ (3h estimées)      ║   │
│  ║  [Accepter] [Négocier]      ║   │
│  ╚══════════════════════════════╝   │
│                                     │
├─────────────────────────────────────┤
│ [📎][📷][💼 Proposer mission]  [→] │
│ [     Écrire un message...     ]    │
└─────────────────────────────────────┘
```

**Fonctionnalités messagerie**
- Statut de lecture (vu / non vu)
- Indicateur de typing
- Envoi de photos depuis la galerie
- Module natif "Proposer une mission" avec montant, date, détails
- Acceptation de mission dans le chat → déclenche le flux paiement/escrow
- Archivage automatique des conversations inactives > 90 jours

---

### ÉCRAN 9 — PAIEMENT SÉCURISÉ / ESCROW

**Concept** : L'écran de paiement est l'écran de confiance maximale. Il doit rassurer, être transparent et être rapide.

```
┌─────────────────────────────────────┐
│ [⬅]     Confirmer la mission        │
├─────────────────────────────────────┤
│ RÉSUMÉ MISSION                      │
│ Remplacement panneau électrique     │
│ Marco Tremblay • ⭐ 4.9             │
│ 📅 15 mars 2026 • 9h00             │
│ 📍 1234 Rue Principale, Montréal   │
├─────────────────────────────────────┤
│ DÉTAIL DU PAIEMENT                  │
│ Prestation estimée     255,00 $     │
│ Frais de service        12,75 $     │
│ ─────────────────────────────────   │
│ Total dépôt            267,75 $     │
│                                     │
│ ℹ️ Votre paiement est sécurisé en   │
│    dépôt. Marco ne sera payé        │
│    qu'après votre confirmation.     │
├─────────────────────────────────────┤
│ MÉTHODE DE PAIEMENT                 │
│ [💳 Visa ••••4242      Modifier]    │
├─────────────────────────────────────┤
│ CONTRAT DE SERVICE                  │
│ [Voir le contrat standard →]        │
│ ☑ J'accepte les conditions         │
├─────────────────────────────────────┤
│ [  Confirmer et déposer 267,75$  ]  │
│    🔒 Paiement sécurisé par Stripe  │
└─────────────────────────────────────┘
```

**Flux post-confirmation**
1. Confirmation → notification à Marco + dépôt Stripe
2. Jour J : Rappel aux deux parties
3. Fin de mission : Client confirme → libération du paiement
4. Litige possible sous 48h → médiation WorkOn
5. Avis des deux parties demandé automatiquement

---

### ÉCRAN 10 — CONFORMITÉ / IDENTITÉ / PARAMÈTRES

**Concept** : L'écran le plus important pour la confiance. Il doit être clair, rassurant, sans jargon légal inutile.

```
SECTION : MON IDENTITÉ
├── Photo de pièce d'identité (vérification)
├── Numéro NAS (optionnel, chiffré)
├── Statut de vérification : ✓ Vérifié / ⏳ En attente

SECTION : MON ENTREPRISE (si applicable)
├── Numéro d'entreprise / NEQ
├── Enregistrement REQ
├── Statut fiscal

SECTION : CONFORMITÉ MÉTIER
├── [Métier sélectionné] → checklist spécifique
│   Exemple Électricien :
│   ✓ Licence RBQ — Obligatoire
│   ✓ Assurance responsabilité — Obligatoire
│   ○ Certification ASP Construction — Recommandée
│   ─ Permis municipal — Non requis généralement
├── Télécharger document
├── Date d'expiration (avec rappel automatique)

SECTION : DOCUMENTS FISCAUX
├── Relevés de paiements WorkOn (T4A équivalent)
├── Historique des transactions
├── Export CSV pour comptable

SECTION : RESSOURCES LÉGALES
├── Liens REQ, CNESST, RBQ selon métier
├── Guide simplifié "Vos droits et obligations"
├── FAQ légale par province
```

---

# PARTIE 4 — MÉCANIQUES UX DIFFÉRENCIANTES

---

## 8. MÉCANIQUES DE RÉTENTION

### 8.1 — Le Cycle de Valeur Quotidien

WorkOn doit créer une raison de revenir chaque jour. Non par addiction, mais par **utilité réelle**.

```
MATIN (7h–9h)
└── Notification : "2 nouvelles missions dans ta zone aujourd'hui"
    → Ouvre l'app → Voit des opportunités pertinentes → Action possible

JOURNÉE (active)
└── Notification : "Marco a vu votre profil" / "Nouvelle demande reçue"
    → Ouvre l'app → Répond → Confirme → Valeur créée

SOIR (17h–20h)
└── Notification : "Votre profil a été vu 12 fois cette semaine"
    → Ouvre l'app → Voit la progression → Complète une info → Boost de visibilité

HEBDOMADAIRE
└── Résumé : "Cette semaine : 8 vues, 3 demandes, 1 mission confirmée"
    → Rapport de performance → Nudge d'amélioration → Motivation
```

### 8.2 — Progression et Niveaux

| Niveau | Seuil | Badge | Avantages |
|---|---|---|---|
| Nouveau | 0–2 missions | — | Accès de base |
| Actif | 3–10 missions | 🌟 Actif | Meilleur ranking |
| Fiable | 11–30 missions + note 4.5+ | ✅ Fiable | Badge visible + priorité |
| Pro | 31–100 missions + note 4.7+ | 💼 Pro | Mise en avant locale |
| Top | 100+ missions + note 4.8+ | 🏆 Top Performer | Page featured + analytics |

### 8.3 — Boucle de Preuve Sociale

```
Mission complétée
→ Demande d'avis automatique (client ET travailleur)
→ Avis publié sur profil
→ Augmentation du score de fiabilité
→ Meilleur ranking dans les résultats
→ Plus de vues → Plus de demandes
→ Motivation à revenir et à compléter des missions
```

---

## 9. SYSTÈME DE CONFIANCE

### 9.1 — Les 5 Couches de Confiance WorkOn

**Couche 1 : Identité**
- Email/téléphone vérifié (obligatoire)
- Pièce d'identité vérifiée (optionnel, mais badge "Vérifié" si fait)
- Photo de profil réelle (guideline claire)

**Couche 2 : Conformité métier**
- Licences professionnelles uploadées et vérifiées
- Assurances actives
- Enregistrement business si applicable
- Badge "Conforme" avec expiration visible

**Couche 3 : Réputation**
- Note agrégée (visible et calculée de façon transparente)
- Nombre de missions complétées
- Taux de réponse
- Taux de complétion des missions
- Fiabilité (ponctualité, conformité au devis)

**Couche 4 : Transactions sécurisées**
- Paiement en dépôt (escrow Stripe)
- Libération après confirmation
- Politique de litige claire et visible
- Aucun paiement en dehors de la plateforme encouragé

**Couche 5 : Transparence légale**
- Statut marketplace affiché clairement
- Contrat de service standard disponible
- Neutralité de la plateforme expliquée simplement

### 9.2 — Signaux de Confiance Visibles sur les Cartes

Chaque carte profil ou carte mission doit afficher au minimum :
- Étoile + note (si disponible)
- Badge de vérification (si vérifié)
- Nombre de missions (social proof)
- Indicateur de disponibilité (temps réel)

---

## 10. MÉCANIQUES DE MATCHING

### 10.1 — Score de Matching WorkOn

Le score de matching est calculé en temps réel sur plusieurs dimensions :

```
SCORE MATCHING (0–100)
│
├── Pertinence métier (0–30 pts)
│   └── Correspondance métier demandé / métiers offerts
│
├── Proximité géographique (0–25 pts)
│   └── Distance < 5km = 25pts, < 15km = 15pts, < 30km = 5pts
│
├── Disponibilité (0–20 pts)
│   └── Disponible maintenant = 20pts, cette semaine = 10pts
│
├── Fiabilité (0–15 pts)
│   └── Note × taux de complétion × taux de réponse
│
└── Compatibilité budget (0–10 pts)
    └── Tarif dans la fourchette budget du client
```

### 10.2 — Suggestions Automatiques

- "Travailleurs similaires à ceux que vous avez contactés"
- "Missions dans votre zone publiées dans les 24 dernières heures"
- "Prestataires disponibles maintenant pour ce type de mission"
- "Clients qui ont fait des missions similaires à la vôtre"

---

# PARTIE 5 — MONÉTISATION

---

## 11. STRUCTURE DE MONÉTISATION

### 11.1 — Le Principe de Base

> **Le gratuit crée le réseau. Le premium crée le business.**

WorkOn est plus puissant avec le maximum d'utilisateurs actifs. Le gratuit doit donc être suffisamment généreux pour atteindre la masse critique. Le premium doit être suffisamment désirable pour convertir les utilisateurs actifs.

### 11.2 — Plan Gratuit (Essentiel)

**Pour tous les utilisateurs**
- Profil de base actif
- Apparition dans les recherches (ranking standard)
- 5 contacts / candidatures par mois
- Messagerie illimitée avec les contacts établis
- 1 mission publiée active à la fois (client)
- Paiement sécurisé via escrow (frais de service standard 5%)
- Badge "Nouveau" et "Actif"
- Accès à la map et au feed explorer

### 11.3 — Plan Pro (9,99$/mois ou 79$/an)

**Pour les travailleurs autonomes actifs**
- Contacts illimités et candidatures illimitées
- Profil mis en avant localement (position 1–5 dans les résultats)
- Badge "Pro" visible sur toutes les cartes
- Statistiques de profil (vues, clics, conversions)
- Partage de profil avec lien public personnalisé
- 3 missions actives simultanées (si rôle client aussi)
- Réponse prioritaire aux demandes urgentes
- Frais de service réduits : 4% (vs 5%)
- Disponibilité en temps réel sur la map (actualisation plus fréquente)
- Notifications push prioritaires pour les missions correspondantes

### 11.4 — Plan Premium (24,99$/mois ou 199$/an)

**Pour les travailleurs top performers et les clients fréquents**
- Tout ce qui est dans Pro
- **Boost profil** : apparition dans les 3 premiers résultats pour son métier + zone
- **Page publique personnalisée** : lien partageable hors app
- **Analytics avancés** : taux de conversion, comparaison secteur, tendances
- **CRM léger** : gestion des clients réguliers, relances, historique complet
- **Automation** : réponse automatique aux demandes hors disponibilité
- Badge "Premium" gradient WorkOn + position hero dans les résultats
- Frais de service réduits : 3%
- Support prioritaire
- Certifications premium mises en avant

### 11.5 — Plan Entreprise (Sur devis, à partir de 99$/mois)

**Pour les PME, gestionnaires, donneurs d'ordre fréquents**
- Multi-utilisateurs (gestionnaire + équipe)
- Publication illimitée d'appels d'offre
- Accès à la base de travailleurs filtrée et certifiée
- **Lead routing** : distribuer les demandes à des prestataires pré-qualifiés
- Dashboard entreprise avec métriques de dépenses et performance
- Facturation centralisée
- Contrats de service personnalisables
- Support dédié
- Badge "Client Entreprise Certifié" visible par les travailleurs (signal de sérieux)

### 11.6 — Achats à l'unité (Microtransactions)

| Feature | Prix | Description |
|---|---|---|
| Boost ponctuel | 4,99$ | 7 jours de mise en avant locale |
| Super Contact | 1,99$ | Contacter en dehors du quota mensuel |
| Profil Urgent | 2,99$ | Apparaître dans les résultats "Urgent" pendant 24h |
| Rapport de réputation | 0,99$ | Export PDF de votre réputation WorkOn |

---

# PARTIE 6 — GARDE-FOUS PRODUIT & LÉGAUX

---

## 12. CONFORMITÉ UX BY DESIGN

### 12.1 — Ce qu'il ne faut jamais montrer

| ❌ À éviter | ✅ Alternative |
|---|---|
| "Votre employeur" / "Votre patron" | "Votre client" / "Donneur d'ordre" |
| "Travailleur de plateforme" | "Prestataire de services" / "Travailleur autonome" |
| "Assigné à cette mission" | "A accepté cette mission" / "Confirmation de prestation" |
| "Salaire" / "Paie" | "Rémunération" / "Montant de la prestation" |
| "Vous devez être disponible" | "Gérez votre disponibilité librement" |
| "Quota de missions imposé" | Aucun quota imposé — liberté totale |
| "WorkOn vous place" | "WorkOn vous met en relation" |

### 12.2 — Vocabulaire approuvé WorkOn

```
VOCABULAIRE APPROUVÉ
━━━━━━━━━━━━━━━━━━━
Mission / Prestation / Contrat de service
Travailleur autonome / Prestataire / Professionnel
Client / Donneur d'ordre / Demandeur
Matching / Mise en relation / Connexion
Accord / Confirmation / Convention
Rémunération / Montant convenu / Paiement de prestation
Plateforme / Marketplace / Infrastructure neutre
```

### 12.3 — Clarifications légales visibles dans l'UX

**Points de clarification obligatoires** (à montrer dans l'onboarding + settings) :

1. **Statut de la plateforme** : "WorkOn est une plateforme de mise en relation, pas un employeur. Chaque prestation est réalisée dans le cadre d'un contrat de service entre professionnels indépendants."

2. **Responsabilité des parties** : "Chaque travailleur autonome est responsable de sa propre conformité fiscale, de ses assurances et de ses licences professionnelles."

3. **Neutralité** : "WorkOn ne choisit pas qui réalise une mission. La sélection est faite par les parties elles-mêmes."

4. **Paiements** : "Les fonds sont détenus en dépôt sécurisé jusqu'à confirmation de complétion. WorkOn n'est pas une banque."

### 12.4 — Conformité par métier (catalogue 90 métiers)

Chaque métier du catalogue possède une fiche de conformité :

```
Métier : Électricien résidentiel
─────────────────────────────────
✅ OBLIGATOIRE
  • Licence RBQ valide (Québec)
  • Assurance responsabilité civile (min. 1M$)
  • Enregistrement entreprise si plus de X$/an

📋 RECOMMANDÉ
  • Certification ASP Construction
  • Formation continue RBQ à jour
  • Assurance erreurs et omissions

ℹ️ NON REQUIS
  • Carte de compétence syndicale (sauf chantier syndiqué)
  • Permis municipal (dans la plupart des cas)
  • NEQ si travail sous son propre nom
```

---

# PARTIE 7 — ROADMAP DESIGN

---

## 13. ROADMAP PAR ÉTAPES

### V1 — LANÇABLE (Mois 1–3)

**Objectif** : Une version propre, cohérente et fonctionnelle qui ne fait pas honte.

**Ce qu'on garde** (amélioration uniquement) :
- Tous les flux existants (profil, mission, paiement, messages)
- Logique de rôles (travailleur / client)
- Intégration Stripe existante
- Base de données des métiers

**Ce qu'on améliore** :
- Appliquer le système visuel premium (palette, typo, composants)
- Simplifier la navigation vers le bottom tab bar
- Retravailler les cartes profil et mission pour la confiance
- Nettoyer les écrans de densité excessive
- Améliorer l'onboarding (score de complétion visible dès le départ)

**Ce qu'on ajoute** :
- Badge "Disponible maintenant" sur les profils
- Score de complétion de profil visible
- CTA flottant sur le profil public
- Section conformité/badges visible sur les profils

**Ce qu'on reporte** :
- Matching algorithmique avancé
- CRM et analytics
- Plan premium complet
- Auto-leadgen

---

### V1 PREMIUM (Mois 3–6)

**Objectif** : Activer la première couche de monétisation et de différenciation.

**Ce qu'on garde** de V1 + :

**Ce qu'on améliore** :
- Profil scrollable vertical (refonte complète)
- Map avec pins de disponibilité temps réel
- Messagerie avec module de proposition de mission intégré
- Onboarding branché sur les rôles (flux différenciés)

**Ce qu'on ajoute** :
- Plans Pro et Premium (Stripe subscription)
- Boost de profil ponctuel
- Statistiques de profil (vues, conversions)
- Partage de profil public (lien externe)
- Notifications intelligentes et personnalisées
- Score de matching visible dans l'Explorer

**Ce qu'on reporte** :
- CRM avancé
- Plan entreprise complet
- Analytics sectoriels

---

### V2 AVANCÉE (Mois 6–12)

**Objectif** : Construire les mécaniques de rétention et de croissance.

**Ce qu'on ajoute** :
- CRM léger pour abonnés premium (historique clients, relances)
- Matching algorithmique (score visible dans les résultats)
- Gamification : niveaux, badges, progression visible
- Auto-leadgen : profil partageable avec landing page publique
- Plan Entreprise (multi-utilisateurs, dashboard)
- Analytics avancés (comparaison secteur, tendances de la demande)
- Rapport de réputation exportable
- Intégration calendrier (disponibilités synchronisées)
- Certifications partenaires intégrées

---

### V3 PLATEFORME MONDIALE (Mois 12–24)

**Objectif** : Devenir l'infrastructure neutre de référence pour le travail autonome.

**Ce qu'on ajoute** :
- Multi-langue / Multi-région
- API publique pour intégration partenaires
- Programme de référencement (travailleur invite travailleur)
- WorkOn Business : plateforme web dédiée aux entreprises
- Marketplace de formations et certifications partenaires
- Assurance intégrée (partenariat assureur)
- Score WorkOn exportable (référence externe)
- Système de contrats personnalisables avancés
- IA de recommandation de prix par marché
- WorkOn Pro App (version desktop / tablet pour power users)

---

# PARTIE 8 — DESIGN SYSTEM & FIGMA DELIVERABLES

---

## 14. LIVRABLES FIGMA PRÉCIS

### 14.1 — Foundations (Fichier 1)

```
🎨 WORKON FOUNDATIONS
│
├── COLOR STYLES
│   ├── Background (Deep, Surface, Elevated, Border)
│   ├── Brand (Primary, Secondary, Gradient)
│   ├── Text (Primary, Secondary, Disabled, Inverse)
│   ├── Semantic (Success, Warning, Error, Info)
│   └── Premium (Gold, Verified Blue, Glow)
│
├── TEXT STYLES
│   ├── Display (XL, LG)
│   ├── Heading (MD, SM)
│   ├── Body (LG, MD, SM)
│   └── Caption
│
├── SPACING SCALE
│   └── space-1 à space-16 (4px base)
│
├── RADIUS SCALE
│   └── xs à full
│
├── SHADOW STYLES
│   └── sm, md, lg, glow, card
│
└── DESIGN TOKENS
    └── Export JSON pour React Native / iOS / Android
```

### 14.2 — Component Library (Fichier 2)

```
🧩 WORKON COMPONENTS
│
├── ATOMS
│   ├── Button (Primary, Secondary, Ghost, Destructive, Loading)
│   ├── Input (Default, Focus, Error, Disabled, With Icon)
│   ├── Avatar (XS, SM, MD, LG, XL + badge overlay)
│   ├── Badge (Verified, Premium, Pro, Top, Conforme, Urgence)
│   ├── Tag / Chip (Active, Inactive, Removable)
│   ├── Rating (Stars complets + demi)
│   ├── Indicator (Disponible, Hors ligne, Busy)
│   └── Icon set (Phosphor / SF adaptés WorkOn)
│
├── MOLECULES
│   ├── Search Bar (Default + avec filtres)
│   ├── Progress Bar (Linéaire + Circulaire)
│   ├── Notification Item
│   ├── Message Bubble (Sent, Received, System)
│   ├── Review Item
│   └── Certification Item (Avec statut)
│
├── CARDS
│   ├── Profile Card (Compact / Standard / Expanded)
│   ├── Mission Card (Compact / Standard / Urgent)
│   ├── Swipe Card (Full screen avec overlay)
│   ├── Map Pin Preview Card
│   ├── Message Preview Card
│   └── Notification Card
│
├── NAVIGATION
│   ├── Bottom Tab Bar (5 états actifs/inactifs)
│   ├── Top Navigation Bar (variants)
│   ├── Back Button
│   └── Section Header
│
├── ORGANISMS
│   ├── Profile Hero Module
│   ├── Badge Row
│   ├── Services Tags Row
│   ├── Portfolio Grid
│   ├── Reviews Section
│   ├── Conformité Section
│   ├── Mission Proposal Card (in-chat)
│   ├── Payment Summary Card
│   └── Onboarding Step Card
│
└── OVERLAYS & SHEETS
    ├── Bottom Sheet (Compact / Mid / Full)
    ├── Modal (Alert / Confirm / Info)
    ├── Toast Notification
    └── Loading States (Skeleton screens)
```

### 14.3 — Screen Flows (Fichier 3)

```
📱 WORKON SCREEN FLOWS
│
├── ONBOARDING KIT
│   ├── Splash / Welcome
│   ├── Choix de rôle
│   ├── Sélection métier
│   ├── Photo de profil
│   └── Activation + premier feed
│
├── CORE SCREENS
│   ├── Home / Dashboard
│   ├── Explorer (Feed + Swipe)
│   ├── Map + Pins + Preview
│   ├── Profil Public
│   ├── Profil Personnel Scrollable
│   ├── Édition Profil
│   ├── Publication Mission
│   ├── Messagerie Liste
│   ├── Fil de Conversation
│   ├── Réservation / Confirmation
│   ├── Paiement / Escrow
│   └── Conformité / Paramètres
│
└── PROTOTYPES INTERACTIFS
    ├── Prototype Onboarding (Figma interactive)
    ├── Prototype Swipe + Contact
    ├── Prototype Publication Mission
    └── Prototype Paiement Complet
```

### 14.4 — Priorité d'exécution Design/Dev

```
ORDRE DE PRODUCTION RECOMMANDÉ

SEMAINE 1–2 : FOUNDATIONS
├── Palette couleurs + tokens
├── Typographie + échelle
├── Spacing + radius + shadows
└── Icônes de base

SEMAINE 3–4 : ATOMS & MOLECULES
├── Boutons (tous états)
├── Inputs (tous états)
├── Avatars + badges
├── Tags + chips
└── Cards (profil + mission)

SEMAINE 5–6 : NAVIGATION & SHELLS
├── Bottom Tab Bar
├── Top Nav Bar variants
├── Bottom Sheet
└── Modal + Toast

SEMAINE 7–8 : ÉCRANS CORE (priorité V1)
├── Home / Dashboard
├── Profil Public
├── Explorer / Swipe
└── Map + Pins

SEMAINE 9–10 : ÉCRANS TRANSACTIONNELS
├── Messagerie
├── Publication Mission
├── Paiement / Escrow
└── Conformité / Paramètres

SEMAINE 11–12 : ONBOARDING + PROTOTYPES
├── Kit Onboarding complet
├── Prototype Figma interactif
├── Tests utilisateurs
└── Itération V1 final

APRÈS V1 VALIDÉE :
├── Composants Premium (plans, boosts)
├── Écrans V1 Premium
├── Map avancée
└── CRM / Analytics (V2)
```

---

# PARTIE 9 — SORTIE FINALE

---

## A. RÉSUMÉ EXÉCUTIF

WorkOn a le potentiel de devenir la plateforme de référence mondiale pour la mise en relation de services autonomes. Le produit possède déjà les fondations essentielles : flux transactionnel complet, intégration Stripe, catalogue de métiers, profils, map, messagerie.

Ce PRD définit la transformation de ces fondations en une expérience mobile native de niveau mondial, en appliquant 4 leviers stratégiques :

1. **Confiance systémique** : Chaque interaction renforce la confiance, dès le premier écran jusqu'au paiement final
2. **Utilité immédiate** : Chaque utilisateur crée de la valeur dans ses 5 premières minutes
3. **Rétention par pertinence** : WorkOn revient dans la vie des utilisateurs parce qu'il est utile, pas parce qu'il est addictif
4. **Monétisation juste** : Le gratuit crée le réseau, le premium crée le business

La transformation se fait en 3 vagues progressives (V1 → V1 Premium → V2), sans jamais détruire les fonctionnalités existantes ni diluer la promesse centrale.

---

## B. DESIGN NORTH STAR

> **WorkOn est le professionnel de confiance dans ta poche.**
> Où que tu sois, quoi que tu fasses, WorkOn te connecte instantanément avec les bonnes personnes, dans le respect total de ton autonomie.

**En une image mentale** : Imagine Uber pour l'expertise professionnelle. La même vitesse. La même confiance. Mais pour tout ce qui demande un vrai savoir-faire.

**En une direction visuelle** : Noir cinématique profond. Gradient rouge-orange comme signal d'énergie et d'action. Typographie nette et lisible. Cartes qui respirent. Chaque pixel au service de la décision.

---

## C. TOP 10 ÉCRANS CRITIQUES À TRANSFORMER

| Priorité | Écran | Raison | Impact |
|---|---|---|---|
| 1 | **Onboarding (Choix de rôle)** | Premier contact avec le produit | Activation |
| 2 | **Profil Public** | Carte de visite n°1 pour la confiance | Confiance |
| 3 | **Home / Dashboard** | Écran de retour quotidien | Rétention |
| 4 | **Explorer / Swipe** | Mécanique de découverte principale | Engagement |
| 5 | **Map + Pins** | Différenciateur compétitif majeur | Acquisition |
| 6 | **Publication de mission** | Action clé du client — doit être < 2min | Conversion |
| 7 | **Messagerie + Proposition** | Lieu de finalisation de l'accord | Transaction |
| 8 | **Paiement / Escrow** | Écran de confiance maximale | Conversion |
| 9 | **Conformité / Identité** | Différenciateur légal et confiance | Différenciation |
| 10 | **Profil Personnel Scrollable** | Hub de rétention et de progression | Rétention |

---

## D. SYSTÈME PREMIUM SIMPLE MAIS SCALABLE

WorkOn Premium repose sur **3 principes** :

**1. Le gratuit est généreux, mais limité**
Les utilisateurs gratuits peuvent tout faire — mais en quantité limitée. Ils voient la valeur et veulent plus.

**2. Le premium est évident, pas caché**
Les fonctionnalités premium sont visibles et désirables. Les utilisateurs savent exactement ce qu'ils manquent.

**3. La monétisation renforce la plateforme**
Chaque euro de premium payé améliore la qualité des matchings, la visibilité des meilleurs profils, et la confiance globale du réseau.

**Modèle de valeur simplifié**

```
GRATUIT        PRO (9,99$/m)    PREMIUM (24,99$/m)    ENTREPRISE
────────       ─────────────    ──────────────────    ──────────
Profil de base → Boost local  → Analytics + CRM    → Multi-users
5 contacts/mois → Illimité    → Page publique      → Dashboard
1 mission active→ 3 actives   → Automation         → Lead routing
Frais 5%       → Frais 4%     → Frais 3%           → Sur devis
Ranking std    → Top 5        → Top 3 garanti      → Featured
```

---

## ANNEXE — MÉTRIQUES DE SUCCÈS UX

Pour valider que ce PRD produit les résultats attendus, mesurer :

| Métrique | Cible V1 | Cible V2 |
|---|---|---|
| Taux de complétion onboarding | > 70% | > 80% |
| Profil complet (> 70%) | > 40% utilisateurs actifs | > 60% |
| Retour J1 | > 35% | > 50% |
| Retour J7 | > 20% | > 35% |
| Taux de conversion Gratuit → Pro | > 3% | > 8% |
| Note app store | > 4.2 | > 4.5 |
| NPS | > 30 | > 50 |
| Temps moyen entre inscription et 1ère action | < 5 min | < 3 min |
| Taux de complétion de mission | > 85% | > 92% |

---

*Document produit par l'équipe Design Stratégique WorkOn.*
*Version 1.0 — Mars 2026*
*Classification : Usage interne — Confidentiel*
