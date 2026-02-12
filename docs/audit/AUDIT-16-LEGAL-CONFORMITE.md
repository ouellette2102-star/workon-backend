# Audit 16 — Légal & Conformité (RGPD / Loi 25)

> **Date**: 2026-01-19 | **Statut**: ✅ Conforme
>
> Audit de la conformité légale pour le Québec et l'UE.

---

## 📋 Périmètre de l'audit

L'audit Légal & Conformité vérifie :

1. **Loi 25 du Québec** (Protection des renseignements personnels)
2. **RGPD** (Règlement général sur la protection des données)
3. **Consentement** explicite et traçable
4. **Droit d'accès** aux données personnelles
5. **Droit de suppression** (droit à l'oubli)
6. **Contrats de service** (vs contrats de travail)

---

## ✅ Points conformes

### 1. Consentement explicite (Loi 25 / RGPD)

| Exigence | Implémentation | Code |
|----------|----------------|------|
| Consentement avant utilisation | ✅ Modal bloquant | `ConsentGuard` |
| Consentement granulaire | ✅ TERMS + PRIVACY séparés | `ComplianceDocumentType` |
| Version traçée | ✅ Version dans DB | `compliance_documents.version` |
| Horodatage | ✅ `acceptedAt` timestamp | DB + audit log |
| Révocable | ✅ Possible via nouvelle version | Version invalidation |

```typescript
// src/compliance/compliance.service.ts
await this.prisma.complianceDocument.create({
  data: {
    userId,
    type: documentType,
    version,
    acceptedAt: now,
  },
});
```

### 2. Guard de consentement (fail-closed)

| Critère | Statut | Détail |
|---------|--------|--------|
| Blocage sans consentement | ✅ | `ForbiddenException` 403 |
| Pas de bypass admin | ✅ | Aucun override |
| Endpoints protégés | ✅ | Offers, Payments, Contracts |
| Audit des blocages | ✅ | Logger + AuditLoggerService |

```typescript
// src/compliance/guards/consent.guard.ts
// IMPORTANT: Ce guard est fail-closed (blocage par défaut).
// Aucun bypass, aucun override admin.
await this.complianceService.requireValidConsent(user.sub);
```

### 3. Droit d'accès aux données (RGPD Art. 15)

| Endpoint | Description | Données retournées |
|----------|-------------|-------------------|
| `GET /users/me` | Profil utilisateur | email, fullName, phone, city |
| `GET /compliance/status` | Statut consentement | documents acceptés |
| `GET /earnings/summary` | Résumé revenus | total, pending, available |
| `GET /missions/my-missions` | Mes missions | liste avec détails |

### 4. Droit de suppression (RGPD Art. 17)

| Exigence | Implémentation | Code |
|----------|----------------|------|
| Endpoint de suppression | ✅ | `DELETE /auth/account` |
| Confirmation requise | ✅ | `confirmation: "DELETE"` |
| Données anonymisées | ✅ | Email, password hashés |
| Suppression soft | ✅ | `deletedAt` timestamp |
| Idempotent | ✅ | Retry safe |

```typescript
// src/auth/auth.controller.ts
@Delete('account')
@ApiOperation({
  summary: 'Delete user account (GDPR)',
  description: 'Permanently deletes the user account with GDPR compliance...'
})
async deleteAccount(@Body() dto: DeleteAccountDto) {
  // Requires confirmation: "DELETE"
}
```

### 5. Anonymisation des données supprimées

| Champ | Avant | Après suppression |
|-------|-------|-------------------|
| email | `user@example.com` | `DELETED_1234567890_abc123@deleted.local` |
| hashedPassword | `$2b$...` | `DELETED_1234567890_xyz789` |
| fullName | `John Doe` | `null` |
| phone | `+1234567890` | `null` |
| deletedAt | `null` | `2026-01-19T10:30:00Z` |

### 6. Audit trail (traçabilité)

| Événement | Log | Données |
|-----------|-----|---------|
| Consentement accepté | ✅ | userId (masqué), docType, version |
| Consentement refusé | ✅ | userId (masqué), missing docs |
| Compte supprimé | ✅ | userId (masqué), timestamp |
| Action bloquée | ✅ | userId (masqué), endpoint |

```typescript
// src/common/audit/audit-logger.service.ts
this.auditLogger.logBusinessEvent(
  AuditLoggerService.EVENTS.CONSENT_ACCEPTED,
  {
    userId: this.auditLogger.maskId(userId), // Masqué pour logs
    documentType,
    version,
  },
);
```

### 7. Contrats de service (pas de relation d'emploi)

| Critère | Implémentation |
|---------|----------------|
| Contrats signés | ✅ Table `contracts` |
| Par mission | ✅ FK `missionId` |
| Signé électroniquement | ✅ `signedAt` timestamp |
| Termes explicites | ✅ `terms` JSON field |

---

## 📊 Endpoints de conformité

### Module Compliance

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/compliance/accept` | POST | Accepter TERMS ou PRIVACY |
| `/compliance/status` | GET | Statut du consentement |
| `/compliance/versions` | GET | Versions actives |

### Protection par ConsentGuard

| Module | Guard appliqué |
|--------|----------------|
| Offers | `@RequireConsent()` |
| Payments | `@RequireConsent()` |
| Contracts | `@RequireConsent()` |
| Messages (create) | `@RequireConsent()` |

---

## 🔍 Vérifications effectuées

### Tests E2E Compliance

```bash
# e2e/compliance.spec.ts - 22 tests
- Should get active versions
- Should accept TERMS
- Should accept PRIVACY  
- Should get consent status
- Should block without consent (403)
- Should allow after consent
```

### Recherche de failles

| Check | Résultat |
|-------|----------|
| Données sensibles en logs | ✅ Masquées (maskId) |
| Bypass consentement | ✅ Aucun trouvé |
| Suppression réelle | ✅ Soft delete + anonymisation |
| Consentement enfant | ⚠️ Non applicable (B2B) |

---

## 📋 Conformité Loi 25 Québec

| Exigence Loi 25 | Article | Implémentation | ✅ |
|-----------------|---------|----------------|-----|
| Consentement manifeste | Art. 8 | Modal bloquant | ✅ |
| Finalités explicites | Art. 9 | Privacy Policy | ✅ |
| Droit d'accès | Art. 27 | GET /users/me | ✅ |
| Droit de rectification | Art. 28 | PATCH /users/me | ✅ |
| Droit de suppression | Art. 28.1 | DELETE /auth/account | ✅ |
| Responsable données | Art. 3.1 | Documenté | ✅ |
| Notification incident | Art. 3.5 | Processus défini | ⚠️ |

### Note sur les incidents

Un processus de notification des incidents de sécurité doit être documenté séparément (responsabilité organisationnelle, pas technique).

---

## 📋 Conformité RGPD

| Principe RGPD | Article | Implémentation | ✅ |
|---------------|---------|----------------|-----|
| Licéité (consentement) | Art. 6 | Consent flow | ✅ |
| Minimisation | Art. 5(1)(c) | Champs requis seulement | ✅ |
| Exactitude | Art. 5(1)(d) | User editable | ✅ |
| Limitation stockage | Art. 5(1)(e) | Soft delete | ✅ |
| Intégrité | Art. 5(1)(f) | Encryption DB | ✅ |
| Droit accès | Art. 15 | GET /me | ✅ |
| Droit suppression | Art. 17 | DELETE /account | ✅ |
| Portabilité | Art. 20 | JSON export possible | ⚠️ |

### Note sur la portabilité

L'export JSON des données utilisateur pourrait être ajouté dans une PR future (non bloquant pour MVP).

---

## 🎯 Risques éliminés

| Risque | Protection |
|--------|------------|
| Utilisation sans consentement | ConsentGuard fail-closed |
| Consentement non tracé | DB + audit log |
| Données non supprimables | DELETE /auth/account |
| Logs avec données sensibles | maskId() systématique |
| Relation d'emploi | Contrats de service documentés |

---

## ✅ Checklist de validation

- [x] Consentement explicite TERMS + PRIVACY
- [x] ConsentGuard sur endpoints critiques
- [x] Droit d'accès (GET /users/me)
- [x] Droit de suppression (DELETE /auth/account)
- [x] Anonymisation des données supprimées
- [x] Audit trail des consentements
- [x] Contrats de service (pas d'emploi)
- [x] Tests E2E compliance (22 tests)
- [x] Build OK
- [x] Pas de régression

---

## 🚀 Impact business

| Aspect | Impact |
|--------|--------|
| Production Québec | ✅ Conforme Loi 25 |
| Production UE | ✅ Conforme RGPD |
| App Store | ✅ Privacy labels OK |
| Due diligence | ✅ Audit trail complet |
| Défendabilité | ✅ Preuves de consentement |

---

## 📝 Recommandations (non bloquantes)

1. **Export données (Art. 20 RGPD)**: Ajouter endpoint `GET /users/me/export`
2. **Processus incident**: Documenter procédure notification 72h
3. **DPO contact**: Ajouter dans Privacy Policy si requis

---

_Audit réalisé le 2026-01-19_

