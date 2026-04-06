# Swipe Discovery System — Backend Design

**Statut** : DESIGN ONLY — pas implémenté
**Auteur** : Architecture
**Date** : 2026-04-06

---

## 1. Objectif

Le système Swipe permet de **découvrir des personnes ou entreprises** pour répondre à un besoin de travail.

**Map = trouver du travail** (missions géolocalisées)
**Swipe = trouver du talent** (workers, entreprises, équipes)

Les deux systèmes sont complémentaires.

---

## 2. Participants

Le Swipe connecte :
- **Clients résidentiels** cherchant un worker ou une entreprise
- **Entreprises** cherchant des workers temporaires
- **Workers** découvrant des clients potentiels
- **Entreprises** découvrant d'autres entreprises (sous-traitance)

---

## 3. Architecture API proposée

### Endpoints

```
GET  /api/v1/swipe/candidates
     ?role=worker|company
     &category=plumbing,cleaning
     &lat=45.5017&lng=-73.5673&radiusKm=25
     &minRating=4
     &verified=true
     &page=1&limit=20

POST /api/v1/swipe/action
     { candidateId, action: "like" | "pass" | "superlike" }

GET  /api/v1/swipe/matches
     (liste des matches mutuels)

POST /api/v1/swipe/matches/:matchId/message
     (initier une conversation depuis un match)
```

### Modèle de données proposé

```prisma
model SwipeAction {
  id          String   @id @default(cuid())
  swiperId    String   // qui swipe
  candidateId String   // qui est swipé
  action      SwipeActionType // LIKE, PASS, SUPERLIKE
  createdAt   DateTime @default(now())

  @@unique([swiperId, candidateId])
  @@index([swiperId])
  @@index([candidateId])
  @@map("swipe_actions")
}

model SwipeMatch {
  id          String   @id @default(cuid())
  userId1     String
  userId2     String
  matchedAt   DateTime @default(now())
  status      SwipeMatchStatus // ACTIVE, EXPIRED, CONVERTED

  @@unique([userId1, userId2])
  @@map("swipe_matches")
}

enum SwipeActionType {
  LIKE
  PASS
  SUPERLIKE
}

enum SwipeMatchStatus {
  ACTIVE
  EXPIRED
  CONVERTED // converti en mission ou contrat
}
```

---

## 4. Logique de ranking des candidats

### Facteurs de scoring (par ordre de poids)

| Facteur | Poids | Source |
|---------|-------|--------|
| Distance géographique | 30% | `LocalUser.city` + géolocalisation |
| Rating moyen | 25% | `Review.rating` agrégé |
| Trust Tier | 20% | `LocalUser.trustTier` (BASIC=1, VERIFIED=2, TRUSTED=3) |
| Catégorie match | 15% | `LocalUser.category` vs recherche |
| Activité récente | 10% | Dernière mission complétée |

### Algorithme simplifié

```
score = (distanceScore * 0.30)
      + (ratingScore * 0.25)
      + (trustScore * 0.20)
      + (categoryMatch * 0.15)
      + (activityScore * 0.10)

ORDER BY score DESC
LIMIT 20
```

### Filtres disponibles

- **Rôle** : worker, company
- **Catégorie** : plumbing, cleaning, moving, etc.
- **Géolocalisation** : lat/lng + rayon en km
- **Rating minimum** : 1-5
- **Vérifié** : identité vérifiée ou non
- **Disponibilité** : slots disponibles (via AvailabilitySlot)

---

## 5. Match bidirectionnel

Un **match** se produit quand :
1. User A fait LIKE sur User B
2. User B fait LIKE sur User A

Le match débloque :
- La possibilité de démarrer une conversation
- La suggestion de créer une mission
- L'affichage des coordonnées complètes

---

## 6. Connexion avec le pipeline existant

```
Swipe Match
  → Conversation (via messages-local)
  → Mission creation (employer crée une mission pour le worker matché)
  → Proposal (automatique ou manuelle)
  → Contract → Booking → Invoice → Payment
```

---

## 7. Anti-patterns à éviter

- Ne pas montrer les mêmes candidats déjà passés (sauf reset)
- Ne pas exposer les coordonnées avant match
- Limiter les superlikes (5/jour par exemple)
- Rate limiter les actions swipe (prévention bot)

---

## 8. Prérequis avant implémentation

1. ✅ LocalUser avec `city`, `category`, `trustTier` — existe
2. ✅ Review system avec ratings — existe
3. ✅ AvailabilitySlot — existe
4. ❌ ProMedia (portfolio photos) — existe dans le schema mais UI non connectée
5. ❌ Géolocalisation précise des workers — seul `city` existe (pas lat/lng sur LocalUser)

---

## 9. Estimation d'effort

| Composant | Effort |
|-----------|--------|
| Schema (SwipeAction, SwipeMatch) | Small |
| Service (ranking, matching, actions) | Medium |
| Controller (endpoints) | Small |
| Tests | Medium |
| **Total** | **~3-5 jours développeur** |

---

*Ce document est une spécification de design. Aucun code n'a été implémenté.*
*Implémentation soumise à validation produit.*
