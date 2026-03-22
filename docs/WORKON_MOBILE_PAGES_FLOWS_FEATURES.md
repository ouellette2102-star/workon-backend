# 📋 WorkOn Mobile — Pages, Flux et Fonctionnalités

> **Date**: 6 février 2026  
> **Statut**: En validation  
> **Vocabulaire**: Contrats de service, appels de services (pas "missions")

---

## 📖 Vocabulaire UI retenu

| À éviter | À utiliser |
|----------|------------|
| Missions | **Appels de services** (pour les demandes disponibles) |
| Missions | **Contrats de service** (quand un accord est établi) |
| Employer, Worker, Job, Booking | Client, Travailleur, Offre |

---

## 🏠 ARCHITECTURE PAGES

### 1. Home (Landing — utilisateur non connecté)

**Layout**
- **Header** : Menu hamburger (gauche) | Logo WorkOn (centre)
- **Titre + slogan**
- **Stats** : Nombre de contrats complétés | Nombre de candidats | Nombre d'appels de services
- **Feed** : Photos des publications utilisateurs (style feed)
- **Interaction** : Like uniquement → pousse dans le feed pour visibilité
- **Barre du bas** :
  - Home
  - Recherche candidat (swipe)
  - Téléphone rouge (publier offre ou demande)
  - Recherche appel de service (map)
  - Bouton Messages (droite)

**Comportement** : Tout clic sur une action → ouverture page inscription.

---

### 2. Inscription / M'inscrire

**Flow**
1. Landing inscription avec bouton **"Commencer"**
2. → Création profil (prêt à éditer)
3. Utilisateur complète → **"Compléter"**
4. Popup **Conditions d'utilisation** → acceptation obligatoire
5. → Home accessible (connecté)

**Champs profil** (inspiration mockups) : Prénom, Nom, Email, Téléphone, Ville, Métier, Photo, À propos.

---

### 3. Connexion

Page dédiée avec les champs nécessaires (email, mot de passe).

---

### 4. Menu hamburger

| Option | Destination |
|--------|-------------|
| M'inscrire / Connexion | Même flow que inscription ou page connexion |
| Mon profil | Mon profil |
| Mon dashboard | Mon dashboard |

---

### 5. Mon profil

**Contenu**
- Tableau de bord partiel
- Profil à éditer
- **Demandes** : À confirmer | Actives | Complétées

**Inspiration** : "Éditer mon profil" + "Mes demandes" (onglets).

---

### 6. Mon dashboard

**Contenu**
- Profil global
- Stats (activité, en cours, gains, etc.)

**Inspiration** : "Tableau de bord" avec stats, badge, bouton "Partager mon profil".

---

### 7. Trouver votre talent (swipe)

**Accès** : Barre du bas → icône swipe.

**Contenu**
- Cartes candidats (style swipe)
- Infos : nom, métier, ville, rating, badges (Fiable, Ponctuel, Top performer)
- Bouton principal : **Réserver**

**Inspiration** : "Trouvez votre talent" avec profil Marc Dubois.

---

### 8. Carte — recherche appel de service

**Accès** : Barre du bas → icône map.

**Contenu**
- Carte avec pins des appels de services
- Filtres possibles (catégorie, rayon, etc.)

---

### 9. Téléphone rouge (publier)

**Accès** : Barre du bas → bouton central.

**Contenu**
- Choix : **Publier une offre de service** (travailleur) ou **Publier une demande** (client)
- Formulaire adapté au type

---

### 10. Réservez en 1 tap

**Accès** : Depuis "Trouver votre talent" après sélection d'un candidat.

**Contenu**
- Détails du contrat
- Service, lieu, durée, coût
- Bouton **Payer le dépôt sécurisé (Stripe)**

**Inspiration** : "Réservez en 1 tap" avec "Entretien paysager".

---

### 11. Messages

**Accès** : Bouton Messages (droite de la barre du bas).

---

## 🔄 FLUX PRINCIPAUX

### Flux A : Première visite → Inscription

```
Home (non connecté)
  → Clic sur action (swipe, map, téléphone, etc.)
  → Landing inscription "Commencer"
  → Création profil (éditable)
  → "Compléter"
  → Popup Conditions d'utilisation
  → Accepte
  → Home accessible (connecté)
```

### Flux B : Trouver un talent

```
Home
  → Barre bas : Swipe
  → "Trouver votre talent"
  → Swipe cartes candidats
  → Sélection → "Réserver"
  → "Réservez en 1 tap"
  → Détails contrat
  → Payer dépôt (Stripe)
  → Confirmation
```

### Flux C : Publier (téléphone rouge)

```
Home
  → Barre bas : Téléphone rouge
  → Choix : Offre de service OU Demande
  → Formulaire
  → Publication
```

### Flux D : Rechercher sur la carte

```
Home
  → Barre bas : Map
  → Carte avec appels de services
  → Clic pin → Détail
```

### Flux E : Gérer mes demandes

```
Menu hamburger → Mon profil
  → Onglets : À confirmer | Actives | Complétées
  → Actions : Confirmer, Refuser
```

---

## 📱 PAGES (récapitulatif)

| # | Page | Accès | Notes |
|---|------|-------|-------|
| 1 | Home (landing) | Après téléchargement | Non connecté, stats, feed, barre navigation |
| 2 | Inscription / M'inscrire | Clic action ou menu | Commencer → Profil → Conditions |
| 3 | Connexion | Menu hamburger | Email, mot de passe |
| 4 | Mon profil | Menu hamburger | Profil + demandes (à confirmer, actives, complétées) |
| 5 | Mon dashboard | Menu hamburger | Stats globales, profil |
| 6 | Trouver votre talent | Barre bas (swipe) | Swipe candidats |
| 7 | Carte appels de services | Barre bas (map) | Pins sur carte |
| 8 | Téléphone rouge (publier) | Barre bas (centre) | Choix offre / demande |
| 9 | Réservez en 1 tap | Depuis swipe | Détails contrat + paiement |
| 10 | Messages | Barre bas (droite) | Liste conversations |
| 11 | Éditer profil | Depuis Mon profil | Champs éditables |

---

## ✨ FONCTIONNALITÉS

### Home & Feed
- [ ] Affichage stats (contrats complétés, candidats, appels)
- [ ] Feed photos publications (like uniquement)
- [ ] Algorithme : like → visibilité dans le feed
- [ ] Barre navigation 5 entrées

### Auth & Onboarding
- [ ] Inscription avec profil complet
- [ ] Connexion
- [ ] Popup Conditions d'utilisation obligatoire
- [ ] Gate : connexion requise pour actions

### Profil & Dashboard
- [ ] Profil éditable (prénom, nom, métier, ville, etc.)
- [ ] Tableau de bord partiel (Mon profil)
- [ ] Tableau de bord global (Mon dashboard)
- [ ] Partage lien profil (workon.app/u/xxx)

### Demandes / Contrats
- [ ] Onglets : À confirmer | Actives | Complétées
- [ ] Actions : Confirmer, Refuser
- [ ] Détails contrat (service, lieu, durée, coût)
- [ ] Statut escrow

### Recherche talent
- [ ] Swipe cartes candidats
- [ ] Filtres (métier, ville, rating)
- [ ] Profil candidat (badges, avis)
- [ ] Bouton Réserver

### Recherche appels
- [ ] Carte avec pins
- [ ] Filtres (catégorie, rayon)
- [ ] Détail appel au clic

### Publication
- [ ] Type : Offre de service (travailleur) ou Demande (client)
- [ ] Formulaire selon type

### Paiement
- [ ] Dépôt sécurisé Stripe
- [ ] Intégration Stripe

### Messages
- [ ] Liste conversations
- [ ] Thread par contrat / appel

---

## 🎨 DESIGN UI (inspiration mockups)

- **Thème** : Foncé (dark) avec accents rouges
- **Header** : Hamburger | Logo WorkOn | Icônes
- **Type de contenu** : Cartes (profil, demande, candidat)
- **Boutons principaux** : Rouge
- **Badges** : Top performer, Fiable, Ponctuel
- **Stats** : Icônes + chiffres
- **Footer** : Paiement Stripe, Conditions, Confidentialité, Support

---

## ⏳ À VALIDER

1. **Vocabulaire** : "Appels de services" / "Contrats de service" — OK partout ?
2. **Barre du bas** : 5 éléments (Home, Swipe, Téléphone, Map, Messages) — ordre et libellés ?
3. **Gate inscription** : Toute action non connectée mène à inscription — compris ?
4. **Choix compte** : "Trouver des contrats" vs "Publier des demandes" — à inclure dans l'onboarding ?
5. **Pages manquantes** : Détail d'un appel sur la carte, Chat, Profil public partagé ?

---

*Document à valider avant mise à jour du plan de conversion FlutterFlow.*
