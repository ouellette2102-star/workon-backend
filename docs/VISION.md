# WorkOn — Vision & Modèle Produit

> **Document de référence** pour investisseurs, acquéreurs, développeurs et juristes.
>
> Version: 1.0 | Dernière mise à jour: 2026-01-19

---

## 📌 Résumé exécutif

**WorkOn est une marketplace de services** qui connecte des **travailleurs autonomes** avec des **clients** (particuliers ou entreprises) pour des missions ponctuelles.

WorkOn **n'est pas** une agence de placement, un employeur, ni un intermédiaire de travail temporaire.

---

## 🎯 Ce que WorkOn EST

| Aspect | Description |
|--------|-------------|
| **Modèle** | Marketplace bilatérale (two-sided marketplace) |
| **Rôle** | Plateforme de mise en relation entre offre et demande |
| **Utilisateurs** | Travailleurs autonomes (indépendants) et clients (particuliers/entreprises) |
| **Transactions** | Contrats de service par mission, signés électroniquement |
| **Paiements** | Escrow via Stripe, libérés à la complétion de la mission |
| **Matching** | Opt-in bilatéral (le travailleur postule, le client accepte) |
| **Revenus** | Commission sur transactions réussies (15%) |

---

## 🚫 Ce que WorkOn N'EST PAS

| WorkOn n'est pas | Explication |
|------------------|-------------|
| **Une agence de placement** | WorkOn ne recrute pas, n'emploie pas, ne dirige pas les travailleurs |
| **Un employeur** | Aucun lien de subordination. Les travailleurs sont autonomes. |
| **Un intermédiaire d'emploi** | Pas de relation d'emploi créée entre le client et le travailleur via WorkOn |
| **Un donneur d'ordres** | WorkOn ne donne pas d'instructions sur l'exécution des missions |
| **Un gestionnaire RH** | Pas de gestion de paie, congés, horaires, évaluations d'employés |

---

## ⚖️ Principes juridiques fondamentaux

### 1. Autonomie des travailleurs

- Les travailleurs inscrits sur WorkOn sont des **travailleurs autonomes** au sens du Code civil du Québec
- Ils choisissent librement leurs missions, tarifs, horaires et méthodes de travail
- Ils ne sont pas soumis à un lien de subordination avec WorkOn ni avec les clients

### 2. Contrat de service (et non contrat de travail)

- Chaque mission fait l'objet d'un **contrat de service** entre le client et le travailleur
- Le contrat précise : la mission, le prix, les conditions, les responsabilités
- WorkOn agit comme **facilitateur** et non comme partie prenante au contrat de service

### 3. Matching opt-in bilatéral

- Le travailleur **choisit** de postuler à une mission (pas d'assignation)
- Le client **choisit** d'accepter ou refuser l'offre du travailleur
- Aucune obligation de travailler ou d'embaucher n'est imposée par la plateforme

### 4. Absence de direction et contrôle

- WorkOn ne donne **aucune instruction** sur la manière d'exécuter les missions
- Pas de supervision, pas de pointage, pas de présence imposée
- Le travailleur est responsable de ses outils, méthodes et organisation

### 5. Rémunération à la mission

- Les travailleurs sont payés **par mission complétée**, pas au temps
- Pas de salaire fixe, pas de minimum garanti
- Les revenus sont des **honoraires de prestataire**, pas un salaire

---

## 🔒 Conformité légale

### Loi 25 du Québec (Protection des renseignements personnels)

| Exigence | Implémentation |
|----------|----------------|
| Consentement explicite | Modal bloquant avant utilisation |
| Droit d'accès aux données | Endpoint `/api/v1/users/me` |
| Droit de suppression (GDPR-like) | Endpoint `DELETE /api/v1/auth/account` |
| Traçabilité du consentement | Table `compliance_documents` avec audit trail |
| Responsable des données | Documenté dans Privacy Policy |

### Code civil du Québec — Contrat de service vs Contrat de travail

WorkOn respecte les critères distinctifs du **contrat de service** (art. 2098-2100 C.c.Q.):

| Critère | Contrat de travail | Contrat de service (WorkOn) |
|---------|-------------------|------------------------------|
| Subordination | Oui | **Non** |
| Contrôle du travail | Par l'employeur | **Par le prestataire** |
| Outils de travail | Fournis par l'employeur | **Fournis par le prestataire** |
| Risque économique | Employeur | **Prestataire** |
| Intégration | Dans l'entreprise | **Indépendant** |

### Normes fiscales

- Les travailleurs sont responsables de leurs **déclarations fiscales**
- WorkOn émet des relevés de paiement (non des T4/Relevé 1 d'employeur)
- Les clients peuvent obtenir des factures pour déduction fiscale

---

## 📋 Vocabulaire produit

| Terme utilisé | Signification | Terme évité |
|---------------|---------------|-------------|
| **Worker** (travailleur) | Prestataire de service autonome | Employé, salarié |
| **Client / Employer** | Donneur d'ouvrage (au sens contrat de service) | Employeur (au sens droit du travail) |
| **Mission** | Contrat de service ponctuel | Emploi, poste, job |
| **Offer** | Proposition de service du travailleur | Candidature à un emploi |
| **Earnings** | Honoraires du prestataire | Salaire, paie |
| **Commission** | Frais de plateforme | Retenue salariale |

> **Note technique**: Le terme "EMPLOYER" dans le code désigne le **donneur d'ouvrage** (client qui publie des missions), pas un employeur au sens du droit du travail.

---

## 🏗️ Architecture produit alignée sur la vision

### Flux utilisateur (Worker)

```
1. Inscription → Acceptation Terms & Privacy
2. Parcours missions disponibles (Discovery)
3. Postule à une mission (Offer)
4. Client accepte → Contrat de service créé
5. Exécute la mission (autonomie totale)
6. Marque "complété" → Paiement libéré
7. Reçoit ses honoraires (moins commission 15%)
```

### Flux utilisateur (Client)

```
1. Inscription → Acceptation Terms & Privacy
2. Crée une mission (description, prix, lieu)
3. Reçoit des offres de travailleurs
4. Choisit un travailleur (matching opt-in)
5. Paie via Stripe (escrow)
6. Travailleur exécute la mission
7. Confirme complétion → Fonds libérés
```

### Aucune fonctionnalité de type "employeur"

WorkOn ne propose **pas**:
- ❌ Gestion de planning/horaires imposés
- ❌ Pointage ou tracking GPS obligatoire
- ❌ Évaluations de performance type RH
- ❌ Salaire fixe ou minimum
- ❌ Congés payés / avantages sociaux
- ❌ Assignation unilatérale de missions

---

## 📊 Métriques produit

| Métrique | Description | Alignement vision |
|----------|-------------|-------------------|
| GMV | Volume brut des transactions | Indicateur marketplace |
| Take rate | Commission moyenne | 15% standard |
| Missions complétées | Contrats de service menés à terme | Succès du matching |
| NPS workers | Satisfaction des travailleurs | Valeur pour l'offre |
| NPS clients | Satisfaction des clients | Valeur pour la demande |
| Time to first mission | Temps entre inscription et première mission | Efficacité du matching |

---

## 🎯 Roadmap produit (vision long terme)

### Phase actuelle (MVP)

- ✅ Matching missions-travailleurs
- ✅ Paiements escrow Stripe
- ✅ Messagerie intégrée
- ✅ Contrats numériques
- ✅ Évaluations bidirectionnelles
- ✅ Compliance Loi 25

### Phase suivante (2026 H2)

- 📋 Vérification d'identité avancée
- 📋 Assurance mission optionnelle
- 📋 Catégories spécialisées avec certifications
- 📋 Multi-devise / multi-région

### Vision long terme

- 📋 API partenaires (intégration entreprises)
- 📋 Récurrence de missions (abonnement client)
- 📋 Programme fidélité workers

---

## 🛡️ Défendabilité légale

### En cas de litige travailleur vs plateforme

**Argument défensif:**
> "WorkOn est une plateforme technologique de mise en relation. Elle ne dirige pas le travail, ne donne pas d'ordres, ne fournit pas les outils, et ne garantit pas de revenus. Les travailleurs choisissent librement leurs missions et fixent leurs méthodes de travail. Il n'existe aucun lien de subordination."

### En cas de litige client vs travailleur

**Position WorkOn:**
> "WorkOn n'est pas partie au contrat de service entre le client et le travailleur. La plateforme facilite la mise en relation et sécurise le paiement, mais la responsabilité de l'exécution incombe au travailleur autonome."

### Documentation probante

- Consentement tracé (table `compliance_documents`)
- Contrats signés électroniquement (table `contracts`)
- Audit trail des actions (table `audit_events`)
- Absence de tracking/contrôle dans le code source
- Historique des PRs documentant les choix techniques

---

## 📞 Contacts

| Rôle | Responsable |
|------|-------------|
| Product Owner | [À compléter] |
| Legal / Compliance | [À compléter] |
| CTO | [À compléter] |

---

## 📄 Documents associés

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Architecture technique backend |
| [store-release-checklist.md](./store-release-checklist.md) | Checklist publication stores |
| Privacy Policy | Politique de confidentialité (frontend) |
| Terms of Service | Conditions d'utilisation (frontend) |

---

_Document de référence pour audit investisseur / due diligence / conformité légale._

