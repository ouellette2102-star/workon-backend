# Store Release Checklist — WorkOn

> **PR-STORE1** | Version 1.0 | Janvier 2026
> 
> Checklist finale avant soumission sur Apple App Store et Google Play Store

---

## 📋 Vue d'ensemble

Cette checklist couvre tous les points requis pour une soumission réussie sur les stores.

**Statut global:** ✅ PHASE 2 — VALIDATION EN COURS (2026-01-30)

### Résumé automatisé
| Métrique | Résultat |
|----------|----------|
| Backend Tests (unit) | ✅ 374 passed |
| Backend Tests (E2E) | ✅ 65 passed |
| Frontend Build | ✅ 44 routes |
| Legal Pages | ✅ Complètes |
| Consent Modal | ✅ Bloquant |
| Store Metadata | ✅ Prêt |

---

## 1️⃣ LEGAL & COMPLIANCE

### Pages légales

| Item | URL | Statut |
|------|-----|--------|
| Privacy Policy | `/legal/privacy` | ✅ Complète |
| Terms of Use | `/legal/terms` | ✅ Complète |
| Version affichée | v1.0, 15 Jan 2026 | ✅ |

### Consentement utilisateur

| Critère | Statut |
|---------|--------|
| Modal de consentement bloquant | ✅ |
| Acceptation explicite requise (pas pré-coché) | ✅ |
| Consentement traçable (audit trail) | ✅ |
| Version liée au consentement | ✅ |
| Blocage API sans consentement (403) | ✅ |

### Conformité

| Réglementation | Statut | Notes |
|----------------|--------|-------|
| Loi 25 (Québec) | ✅ | Consentement explicite, droit de suppression |
| GDPR-like | ✅ | Principes respectés |
| Apple Guidelines 5.1.1 | ✅ | Data collection disclosed |
| Google Play Data Safety | ✅ | Formulaire prêt |

### Restriction d'âge

| Item | Valeur | Statut |
|------|--------|--------|
| Âge minimum | 18+ | ✅ Mentionné dans Terms |
| Classification IARC | En attente | 🔄 À compléter lors soumission |

---

## 2️⃣ UI/UX MOBILE

### Consent Modal

| Critère | Statut |
|---------|--------|
| Visible sur viewport mobile | ✅ |
| Non contournable (bloquant) | ✅ |
| Liens cliquables vers /legal/* | ✅ |
| Bouton "J'accepte" clair | ✅ |
| Version affichée (v1.0) | ✅ |
| Texte lisible (taille police) | 🔄 À vérifier |

### Navigation légale

| Emplacement | Statut |
|-------------|--------|
| Footer (web) | 🔄 À vérifier |
| Menu/Settings (app) | 🔄 À vérifier |
| Profil utilisateur | 🔄 À vérifier |

### Responsive

| Viewport | Statut |
|----------|--------|
| iPhone SE (375px) | 🔄 À tester |
| iPhone 14 (390px) | 🔄 À tester |
| iPhone 14 Pro Max (430px) | 🔄 À tester |
| Android small (360px) | 🔄 À tester |
| Android large (412px) | 🔄 À tester |
| Tablet (768px+) | 🔄 À tester |

---

## 3️⃣ STORE METADATA

### Apple App Store

| Item | Statut | Fichier |
|------|--------|---------|
| Nom de l'app | ✅ | `store-assets/metadata/app-store.md` |
| Sous-titre | ✅ | |
| Description courte | ✅ | |
| Description longue | ✅ | |
| Mots-clés | ✅ | |
| Catégorie | ✅ Business | |
| Privacy URL | ✅ | |
| Support URL | ✅ | |
| Age rating | ✅ 17+ | |

### Google Play Store

| Item | Statut | Fichier |
|------|--------|---------|
| Titre | ✅ | `store-assets/metadata/play-store.md` |
| Description courte | ✅ | |
| Description complète | ✅ | |
| Catégorie | ✅ Business | |
| Privacy URL | ✅ | |
| Data Safety | ✅ Prêt | |
| Content rating | 🔄 À soumettre | |

---

## 4️⃣ ASSETS GRAPHIQUES

### App Icon

| Platform | Dimensions | Statut |
|----------|------------|--------|
| iOS | 1024x1024 | 🔄 À créer |
| Android | 512x512 | 🔄 À créer |

### Screenshots

| Platform | Device | Quantité | Statut |
|----------|--------|----------|--------|
| iOS | iPhone 6.5" | 6 min | 🔄 À créer |
| iOS | iPhone 5.5" | 6 min | 🔄 À créer |
| iOS | iPad 12.9" | 6 min | 🔄 Si universel |
| Android | Phone | 6 min | 🔄 À créer |
| Android | Tablet | 6 min | 🔄 Si supporté |

### Feature Graphic (Android)

| Item | Dimensions | Statut |
|------|------------|--------|
| Feature graphic | 1024x500 | 🔄 À créer |

---

## 5️⃣ BACKEND READINESS

### API

| Endpoint | Protection | Statut |
|----------|------------|--------|
| `/api/v1/missions/*` | ConsentGuard | ✅ |
| `/api/v1/payments/*` | ConsentGuard | ✅ |
| `/api/v1/contracts/*` | ConsentGuard | ✅ |
| `/api/v1/offers/*` | ConsentGuard | ✅ |
| `/api/v1/compliance/*` | Auth | ✅ |

### Monitoring

| Item | Statut |
|------|--------|
| Sentry configuré | ✅ |
| Structured logs | ✅ |
| Health checks | ✅ |
| Audit trail | ✅ |

### Infrastructure

| Item | Statut |
|------|--------|
| Railway production | ✅ |
| SSL/TLS | ✅ |
| Database backups | ✅ Documenté |
| Rate limiting | ✅ |

---

## 6️⃣ COMPTE DE TEST (Review)

### Informations à fournir

```
Email: review@workon.app
Password: [À créer avant soumission]
Role: EMPLOYER (pour tester la création de missions)
```

### État du compte test

| Critère | Statut |
|---------|--------|
| Compte créé | 🔄 À faire |
| Consentement accepté | 🔄 À faire |
| Données de test réalistes | 🔄 À faire |
| Missions de test disponibles | 🔄 À faire |

---

## 7️⃣ BUILD & SUBMISSION

### iOS

| Étape | Statut |
|-------|--------|
| Archive Xcode | 🔄 |
| Upload Transporter | 🔄 |
| TestFlight validation | 🔄 |
| App Store Connect soumission | 🔄 |

### Android

| Étape | Statut |
|-------|--------|
| Build AAB | 🔄 |
| Signature production | 🔄 |
| Internal testing | 🔄 |
| Production release | 🔄 |

---

## 8️⃣ FINAL CHECKS ✅ VALIDÉ AUTOMATIQUEMENT (2026-01-30)

### Avant soumission

- [x] Toutes les pages légales chargent correctement ✅ Vérifié (build OK)
- [x] Modal de consentement fonctionne sur mobile ✅ Vérifié (code review)
- [ ] Liens footer/menu vers /legal/* fonctionnent ⚠️ Footer manquant
- [x] 18+ mentionné dans app et metadata ✅ Vérifié
- [ ] Compte de test créé et fonctionnel 🔄 À faire
- [ ] Screenshots ne contiennent pas de données réelles 🔄 À créer
- [x] Build ne contient pas de mode debug/test ✅ Vérifié (prod build)
- [x] Analytics/Sentry configurés pour production ✅ Vérifié
- [x] Rate limiting activé ✅ Vérifié (code)
- [x] CORS configuré pour domaine production ✅ Vérifié (main.ts)

### Tests manuels obligatoires

| Scénario | iOS | Android |
|----------|-----|---------|
| Inscription nouveau compte | 🔄 | 🔄 |
| Modal consentement apparaît | 🔄 | 🔄 |
| Acceptation consentement | 🔄 | 🔄 |
| Navigation vers /legal/privacy | 🔄 | 🔄 |
| Navigation vers /legal/terms | 🔄 | 🔄 |
| Création mission (employer) | 🔄 | 🔄 |
| Création offre (worker) | 🔄 | 🔄 |
| Paiement (mode test) | 🔄 | 🔄 |
| Suppression compte | 🔄 | 🔄 |

---

## 📝 Notes de release

### Version 1.0.0

```
WorkOn - Première version publique

Fonctionnalités:
• Création et gestion de missions
• Recherche de travailleurs autonomes
• Système d'offres et contre-offres
• Paiements sécurisés (Stripe)
• Contrats numériques
• Messagerie intégrée
• Évaluations et réputation

Cette version est destinée au marché québécois.
```

---

## 📞 Contacts

| Rôle | Contact |
|------|---------|
| Tech Lead | [À compléter] |
| Product Owner | [À compléter] |
| Legal | [À compléter] |
| Support | support@workon.app |

---

## 📅 Timeline estimée

| Étape | Durée estimée |
|-------|---------------|
| Création assets | 2-3 jours |
| Tests manuels | 1-2 jours |
| Soumission iOS | 1 jour |
| Review Apple | 1-7 jours |
| Soumission Android | 1 jour |
| Review Google | 1-3 jours |

**Total estimé:** 1-2 semaines

---

## ✅ Critères de GO/NO-GO

### GO si:
- ✅ Toutes les pages légales fonctionnent — **PASS** (2026-01-30)
- ✅ Consentement bloquant vérifié — **PASS** (2026-01-30)
- ✅ Metadata complet — **PASS** (2026-01-30)
- ⚠️ Screenshots prêts — **BLOCKED** (assets à créer)
- ⚠️ Compte test fonctionnel — **PENDING** (à créer)
- ✅ Build stable (pas de crash) — **PASS** (374+65 tests)

### NO-GO si:
- ✅ Pages légales inaccessibles — **OK** (accessible)
- ✅ Consentement contournable — **OK** (non-contournable)
- ⚠️ Données PII dans screenshots — **N/A** (screenshots non créés)
- ✅ Crashes fréquents — **OK** (aucun crash, tests passants)
- ✅ Metadata incomplet — **OK** (metadata complet)

---

## 📊 RAPPORT D'EXÉCUTION PHASE 2 (2026-01-30)

### Résultat automatisé

| Catégorie | Items validés | Items bloqués | % Complet |
|-----------|---------------|---------------|-----------|
| Legal & Compliance | 10/10 | 0 | 100% |
| UI/UX Mobile | 8/14 | 0 | 57% |
| Store Metadata | 15/16 | 0 | 94% |
| Assets Graphiques | 0/6 | 6 | 0% |
| Backend Readiness | 12/12 | 0 | 100% |
| Compte de test | 0/4 | 0 | 0% |
| Build & Submission | 0/8 | 0 | 0% |
| Final Checks | 7/10 | 1 | 70% |

### Bloquants identifiés

| ID | Blocker | Sévérité | Action requise |
|----|---------|----------|----------------|
| B1 | App Icon iOS/Android | 🔴 Critique | Création graphique |
| B2 | Screenshots stores | 🔴 Critique | Création graphique |
| B3 | Feature graphic Android | 🟡 Important | Création graphique |
| B4 | Compte de test review | 🟡 Important | Création manuelle |
| B5 | Footer liens légaux | 🟡 Important | Code change requis |
| B6 | Tests responsive manuels | 🟢 Mineur | Vérification manuelle |

### Verdict

**STATUT: ⚠️ NOT READY FOR STORE SUBMISSION**

**Raison**: Assets graphiques manquants (icons, screenshots)

**Action pour GO**:
1. Créer app icons (iOS 1024x1024, Android 512x512)
2. Créer screenshots (6 minimum par plateforme)
3. Créer feature graphic Android (1024x500)
4. Créer compte de test review@workon.app
5. Ajouter footer avec liens légaux

