# Audit 02 — UX/UI (Backend API)

> **Date**: 2026-01-19 | **Statut**: ✅ Complété
>
> Audit de la qualité UX des réponses API pour le frontend.

---

## 📋 Périmètre de l'audit

L'audit UX/UI côté backend couvre :

1. **Structure des réponses API** (cohérence, pagination)
2. **Messages d'erreur** (clarté, langue, codes)
3. **Codes HTTP** (appropriés, standardisés)
4. **Validation** (messages explicites)

---

## ✅ Points conformes

### 1. Structure des réponses d'erreur

Le `GlobalHttpExceptionFilter` standardise toutes les erreurs avec le format :

```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Mission introuvable",
    "status": 404,
    "requestId": "uuid-...",
    "timestamp": "2026-01-19T10:30:00.000Z"
  }
}
```

**Avantages:**
- Code machine-readable pour le frontend
- Message human-readable pour l'utilisateur
- RequestId pour le debug
- Timestamp pour le logging

### 2. Pagination standardisée

DTO `PaginatedResponseDto` conforme aux bonnes pratiques :

```json
{
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrevious": false
  }
}
```

### 3. Codes HTTP corrects

| Situation | Code | ✅ |
|-----------|------|-----|
| Succès création | 201 | ✅ |
| Succès lecture | 200 | ✅ |
| Validation error | 400 | ✅ |
| Non authentifié | 401 | ✅ |
| Non autorisé | 403 | ✅ |
| Ressource inexistante | 404 | ✅ |
| Conflit (duplicate) | 409 | ✅ |
| Rate limit | 429 | ✅ |
| Erreur serveur | 500 | ✅ |

### 4. ErrorCodes enum

Codes d'erreur standardisés pour le parsing frontend :

```typescript
enum ErrorCode {
  UNAUTHORIZED,
  FORBIDDEN,
  INVALID_CREDENTIALS,
  TOKEN_EXPIRED,
  VALIDATION_ERROR,
  RESOURCE_NOT_FOUND,
  USER_NOT_FOUND,
  MISSION_NOT_FOUND,
  // ...
}
```

---

## ⚠️ Points à améliorer

### 1. Incohérence linguistique des messages d'erreur

**Constat:** Mélange de français et d'anglais dans les messages d'erreur.

| Service | Langue | Exemples |
|---------|--------|----------|
| messages.service.ts | 🇫🇷 FR | "Mission introuvable", "Le message ne peut pas être vide" |
| offers.service.ts | 🇬🇧 EN | "Mission not found", "Cannot make an offer on your own mission" |
| devices.service.ts | 🇬🇧 EN | "Device not found" |
| reviews.service.ts | 🇫🇷 FR | "Avis non trouvé" |

**Impact UX:** Confusion utilisateur, impression de produit non fini.

**Correction apportée:** Création du fichier `src/common/constants/error-messages.ts` avec tous les messages standardisés en français.

**Migration recommandée (PR future):**
1. Importer `ERROR_MESSAGES` dans chaque service
2. Remplacer les messages hardcodés
3. Tester que le frontend gère les nouveaux messages

### 2. Messages de validation class-validator

**Constat:** Les messages de validation par défaut sont en anglais.

**Exemple:**
```
"email must be an email"
"password must be longer than or equal to 8 characters"
```

**Recommandation (PR future):**
Ajouter des messages personnalisés dans les DTOs :

```typescript
@IsEmail({}, { message: 'Adresse email invalide' })
email: string;

@MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères' })
password: string;
```

---

## 📁 Fichiers créés

| Fichier | Description |
|---------|-------------|
| `src/common/constants/error-messages.ts` | Messages d'erreur standardisés FR |
| `src/common/constants/index.ts` | Export des constantes |
| `docs/audit/AUDIT-02-UX-UI.md` | Ce document |

---

## 📊 Résumé

| Critère | Statut | Commentaire |
|---------|--------|-------------|
| Structure réponses | ✅ Conforme | Format standardisé |
| Pagination | ✅ Conforme | Meta complète |
| Codes HTTP | ✅ Conforme | Standards respectés |
| ErrorCodes | ✅ Conforme | Enum centralisé |
| Messages FR | ⚠️ Partiel | Constantes créées, migration à faire |
| Validation FR | ⚠️ À faire | PR future recommandée |

---

## 🎯 Actions recommandées (PRs futures)

1. **PR-UX-MESSAGES:** Migrer les services vers `ERROR_MESSAGES`
2. **PR-UX-VALIDATION:** Ajouter messages FR dans les DTOs validation

---

## ✅ Checklist de validation

- [x] Build OK
- [x] Tests OK (235/235)
- [x] Pas de régression
- [x] Documentation créée
- [x] Constantes exportables

---

_Audit réalisé le 2026-01-19_

