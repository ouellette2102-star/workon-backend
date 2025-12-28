# WorkOn Catalogue Data

Ce dossier contient les données de référence du catalogue WorkOn.

## Fichiers

### `categories.json`
Les 10 catégories officielles WorkOn. **NE PAS MODIFIER** sans validation métier.

### `skills.json`
Les 90 métiers/skills officiels WorkOn.

**⚠️ FICHIER À COMPLÉTER**

Le fichier est actuellement vide. Pour terminer PR#1, fournir la liste des 90 métiers au format suivant :

```json
[
  {
    "name": "Nom du métier (FR)",
    "nameEn": "Job name (EN)",
    "categoryName": "Nom exact de la catégorie (doit correspondre à categories.json)",
    "requiresPermit": true | false,
    "proofType": "Type de preuve requis (ex: 'Licence RBQ', 'Carte ASP', 'Formation MAPAQ')" | null
  }
]
```

### Catégories disponibles (categoryName)
- Entretien
- Réparation
- Commerce
- Restauration
- Construction légère
- Éducation
- Numérique
- Beauté
- Culture
- Services à la personne

### Exemple de skill
```json
{
  "name": "Électricien résidentiel",
  "nameEn": "Residential Electrician",
  "categoryName": "Réparation",
  "requiresPermit": true,
  "proofType": "Licence RBQ"
}
```

## Seed

Exécuter le seed :
```bash
npm run seed
```

Le seed :
1. Crée/met à jour les 10 catégories
2. Crée/met à jour les skills (si `skills.json` n'est pas vide)
3. **Bloque avec erreur explicite** si `skills.json` est vide

## Validation

Vérifier les données après seed :
```bash
npx prisma studio
```

