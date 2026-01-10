# ESLint Warning Budget

> **Objectif**: Réduire les warnings de manière incrémentale sans refactor massif.

---

## Historique

| Date | Warnings | Delta | PR |
|------|----------|-------|-----|
| 2026-01-08 | 120 | - | Baseline |
| 2026-01-08 | 110 | -10 | PR-05 (batch 1) |

---

## Budget actuel

```
Target: < 50 warnings
Current: 110 warnings
Remaining to fix: 60+
```

---

## Types de warnings

| Type | Count (approx) | Priorité |
|------|----------------|----------|
| `@typescript-eslint/no-explicit-any` | ~90 | P2 (difficile) |
| `@typescript-eslint/no-unused-vars` | ~10 | P1 (facile) ✅ DONE |
| Autres | ~10 | P3 |

---

## Règles de contribution

### ✅ Ce qui est OK

- Corriger les warnings dans les fichiers que vous touchez déjà
- PRs dédiées de 20-30 fixes max
- Préfixer les paramètres non utilisés avec `_`
- Supprimer les imports non utilisés

### ⛔ Ce qui est interdit

- Refactor massif cross-module
- Désactiver les règles ESLint globalement
- Ignorer les warnings avec `// eslint-disable`
- Changer le comportement du code

---

## Comment réduire les warnings

### 1. Imports non utilisés

```typescript
// ❌ Avant
import { Foo, Bar, Unused } from 'module';

// ✅ Après
import { Foo, Bar } from 'module';
```

### 2. Paramètres non utilisés

```typescript
// ❌ Avant
async function example(param: string, unused: number) {
  return param;
}

// ✅ Après (préfixer avec _)
async function example(param: string, _unused: number) {
  return param;
}
```

### 3. `any` types (plus complexe)

```typescript
// ❌ Avant
function handle(data: any) { ... }

// ✅ Après (créer un type)
interface DataPayload { ... }
function handle(data: DataPayload) { ... }
```

---

## Prochains batches suggérés

| Batch | Cible | Fichiers | Effort |
|-------|-------|----------|--------|
| 2 | `any` dans controllers | 5-10 fichiers | Moyen |
| 3 | `any` dans services | 10-15 fichiers | Élevé |
| 4 | `any` dans specs | 5 fichiers | Faible |

---

## Commandes utiles

```bash
# Compter les warnings
npm run lint 2>&1 | Select-String "warning" | Measure-Object

# Voir tous les warnings
npm run lint

# Filtrer par type
npm run lint 2>&1 | Select-String "no-explicit-any"
npm run lint 2>&1 | Select-String "no-unused-vars"
```

