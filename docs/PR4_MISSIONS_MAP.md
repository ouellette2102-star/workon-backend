# PR4: Missions Map Feed

## Résumé

Cette PR ajoute un endpoint optimisé pour afficher les missions sur une carte (pins).
Utilise un bounding box (bbox) plutôt qu'un radius pour de meilleures performances.

## Endpoints

### GET /api/v1/missions/map

Retourne une liste légère de missions pour le rendu de la carte.

**Query Parameters:**

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `north` | float | ✅ | - | Latitude nord du bbox (max 90) |
| `south` | float | ✅ | - | Latitude sud du bbox (min -90) |
| `east` | float | ✅ | - | Longitude est du bbox (max 180) |
| `west` | float | ✅ | - | Longitude ouest du bbox (min -180) |
| `status` | string | ❌ | `open` | Filtre par statut |
| `category` | string | ❌ | - | Filtre par catégorie |
| `limit` | int | ❌ | 200 | Max résultats (max 500) |

**Exemple Request:**

```bash
curl -X GET "http://localhost:8080/api/v1/missions/map?north=45.55&south=45.45&east=-73.5&west=-73.7" \
  -H "Authorization: Bearer <token>"
```

**Response 200:**

```json
{
  "missions": [
    {
      "id": "lm_1234567890_abc123",
      "title": "Fix leaking faucet",
      "category": "plumbing",
      "latitude": 45.5017,
      "longitude": -73.5673,
      "status": "open",
      "price": 150.0,
      "city": "Montreal",
      "createdAt": "2024-12-26T12:00:00.000Z"
    }
  ],
  "count": 1,
  "bbox": {
    "north": 45.55,
    "south": 45.45,
    "east": -73.5,
    "west": -73.7
  }
}
```

**Response 400 (Invalid bbox):**

```json
{
  "statusCode": 400,
  "message": "Invalid bounding box: north must be greater than south",
  "path": "/api/v1/missions/map",
  "requestId": "...",
  "timestamp": "..."
}
```

### GET /api/v1/missions/:id

Retourne les détails complets d'une mission (existait déjà).

## Validation

- `north` doit être > `south`
- `east` doit être > `west`
- Latitude: -90 à 90
- Longitude: -180 à 180
- `limit`: 1 à 500 (hard cap)

## Performance

- Utilise un **bounding box** (plus efficace que radius pour cartes)
- Index Prisma sur `(latitude, longitude)` et `status`
- Limite hard-coded à 500 résultats max
- Payload léger (seulement les champs nécessaires aux pins)

## Limites Connues

- **Pas de PostGIS** : Filtre bbox simple sans calcul de distance
- **Pas d'antimeridian** : Le bbox ne gère pas le passage 180°/-180°
- **Pas de clustering** : Retourne tous les points individuels

## Swagger

Documentation disponible sur `/api/docs` avec :
- Paramètres documentés
- Exemples de réponses
- Validation des types

## Tests

```bash
# Exécuter les tests
npm test

# Tests spécifiques au map
npm test -- --testPathPattern=missions-local-map
```

**Cas testés:**
- ✅ bbox valide → retourne missions
- ✅ bbox invalide (north <= south) → 400
- ✅ bbox invalide (east <= west) → 400
- ✅ bbox vide → retourne []
- ✅ filtre par category
- ✅ respect du limit

## Fichiers Modifiés

**Nouveaux:**
- `src/missions-local/dto/missions-map-query.dto.ts`
- `src/missions-local/dto/mission-map-item.dto.ts`
- `src/missions-local/missions-local-map.service.spec.ts`
- `docs/PR4_MISSIONS_MAP.md`

**Modifiés:**
- `src/missions-local/missions-local.controller.ts`
- `src/missions-local/missions-local.service.ts`
- `src/missions-local/missions-local.repository.ts`

## Rollback

```bash
git revert <commit-hash>
```

100% backward compatible - aucun changement de schema Prisma.

## Prochaines Étapes

- PR5: Swipe des candidats (workers)
- PR6: Clustering pour grandes zones
- PR7: PostGIS pour calculs de distance précis

