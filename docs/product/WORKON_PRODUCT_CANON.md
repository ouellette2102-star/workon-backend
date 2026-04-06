# WORKON PRODUCT CANON

**Version** : 2.0
**Statut** : Canonique
**Dernière mise à jour** : 2026-04-06
**Responsable** : Product / Architecture

---

## 1. OBJECTIF DU CANON

Ce document définit la vérité produit et métier de WorkOn.

Son rôle est d'empêcher :
- La dérive entre mobile, web et backend
- Les implémentations contradictoires
- Les modifications locales qui cassent la cohérence globale
- Les optimisations IA qui ignorent le modèle produit

**Règle absolue** : si un conflit apparaît entre implémentation et canon, le canon fait foi. Le code doit être corrigé pour s'aligner au canon, pas l'inverse.

---

## 2. MODÈLE PRODUIT

**WorkOn** est une plateforme de travail connectant la demande (employeurs/clients) avec l'offre (travailleurs/pros) à travers des missions, contrats et paiements sécurisés.

**Marché initial** : Québec (services résidentiels et professionnels)
**Commission plateforme** : 15%
**Devise** : CAD
**Langues** : Français (principal), Anglais (secondaire)

---

## 3. ARCHITECTURE D'AUTHENTIFICATION

WorkOn opère avec **deux systèmes d'authentification coexistants** :

| Système | Usage | Modèle User | Auth | Statut |
|---------|-------|-------------|------|--------|
| **LocalUser** (JWT natif) | Mobile natif, webhooks GHL, API directe | `LocalUser` | email + password (bcrypt) + JWT | **Actif — primaire pour mobile** |
| **CloudUser** (Clerk SSO) | Dashboard web, intégrations tierces | `User` + `UserProfile` | Clerk SSO + JWT | **Actif — primaire pour web** |

**Règles** :
- Les deux systèmes partagent la même base de données PostgreSQL
- Les API endpoints sont distincts (préfixe `-local` pour le système natif)
- Les objets métier (Mission, Proposal, Payment) existent en versions parallèles (`Mission` / `LocalMission`)
- La convergence vers un système unique est un objectif long terme, pas MVP

---

## 4. OBJETS MÉTIER

### 4.1 User

Représente une personne utilisant WorkOn.

**Rôles** :
| Rôle | Description | Peut |
|------|-------------|------|
| `worker` | Professionnel / travailleur | Appliquer aux missions, compléter du travail, recevoir des paiements |
| `employer` | Employeur / client | Publier des missions, engager des workers, effectuer des paiements |
| `residential_client` | Client résidentiel | Comme employer, pour services à domicile |
| `admin` | Administrateur plateforme | Gérer la plateforme, modérer, accéder aux analytics |

**Propriétés canoniques** :
- `id`, `email`, `role`, `firstName`, `lastName`
- `phone`, `city`, `active`
- `verified` (phone, identity, bank — pour LocalUser)
- `trustTier` : BASIC → VERIFIED → TRUSTED (LocalUser uniquement)

**Modèles schema** : `User` + `UserProfile` (Clerk) | `LocalUser` (natif)

### 4.2 Mission

Représente un travail publié par un employeur.

**Propriétés canoniques** :
- `id`, `title`, `description`, `category`
- `price` (montant en CAD), `currency` (défaut: CAD)
- `location` : `latitude`, `longitude`, `city`, `address`
- `status`, `ownerId` (createdByUserId)
- `assignedToUserId` (worker assigné)
- `createdAt`, `updatedAt`

**Modèles schema** : `Mission` (Clerk) | `LocalMission` (natif)

### 4.3 Proposal

Représente une candidature d'un worker sur une mission.

> Note : le schema utilise `Offer` / `LocalOffer`. Le terme canonique est **Proposal**.

**Propriétés canoniques** :
- `id`, `missionId`, `workerId`
- `message` (texte de candidature)
- `proposedPrice` (prix proposé par le worker, optionnel)
- `status`, `createdAt`

**Statuts** :
| Statut | Description |
|--------|-------------|
| `PENDING` | Proposal soumise, en attente |
| `ACCEPTED` | Employeur a accepté |
| `DECLINED` | Employeur a refusé |

**Modèles schema** : `Offer` (Clerk) | `LocalOffer` (natif)

### 4.4 Contract

Représente un accord entre worker et employer pour une mission.

**Propriétés canoniques** :
- `id`, `missionId`, `workerId`, `employerId`
- `status`
- `signedByWorker`, `signedByEmployer` (booléens)
- `signedAt`, `completedAt`

**Statuts** :
| Statut | Description |
|--------|-------------|
| `DRAFT` | Contrat créé, pas encore soumis |
| `PENDING` | Soumis, en attente de signature |
| `ACCEPTED` | Les deux parties ont signé |
| `REJECTED` | Une partie a refusé |
| `COMPLETED` | Mission terminée sous ce contrat |
| `CANCELLED` | Contrat annulé |

> Note : pour le MVP, la signature passe par `updateContractStatus()`. La signature cryptographique (nonce) est un objectif post-MVP.

**Modèle schema** : `Contract` (Clerk uniquement — LocalMission n'a pas de contrat formel)

### 4.5 Payment

Représente une transaction Stripe.

**Propriétés canoniques** :
- `id`, `missionId`, `amount`, `currency`
- `stripePaymentIntentId`
- `platformFeePct` (15%)
- `status`, `createdAt`

**Statuts** :
| Statut | Description |
|--------|-------------|
| `CREATED` | PaymentIntent créé |
| `REQUIRES_ACTION` | Action client requise (3D Secure, etc.) |
| `AUTHORIZED` | Fonds autorisés (escrow) |
| `CAPTURED` | Fonds capturés |
| `SUCCEEDED` | Paiement réussi |
| `FAILED` | Paiement échoué |
| `CANCELED` | Paiement annulé |
| `REFUNDED` | Remboursement effectué |
| `DISPUTED` | Litige Stripe ouvert |

**Modèle schema** : `Payment` (Clerk — FK vers Mission)
**LocalMission** : utilise `stripePaymentIntentId` directement sur le modèle + statut `paid`

### 4.6 Invoice

Représente un document comptable pour une mission complétée.

**Propriétés canoniques** :
- `id`, `missionId` ou `localMissionId`
- `subtotalCents`, `platformFeeCents` (15%), `taxesCents`, `totalCents`
- `currency` (CAD)
- `stripeCheckoutSessionId`, `stripePaymentIntentId`
- `status`, `paidAt`

**Statuts** :
| Statut | Description |
|--------|-------------|
| `PENDING` | Facture créée, en attente |
| `PROCESSING` | Paiement en cours |
| `PAID` | Facture payée |
| `FAILED` | Paiement échoué |
| `CANCELLED` | Facture annulée |
| `REFUNDED` | Facture remboursée |

**Relation avec Payment** : Payment est la transaction Stripe brute. Invoice est le document comptable avec calcul de commission (15%) et taxes.

**Modèle schema** : `Invoice`

### 4.7 Conversation / Message

Communication entre les parties d'une mission.

**Architecture actuelle** : messages à plat liés à une mission (pas de threads).

**Propriétés canoniques** :
- `id`, `missionId`, `senderId`, `senderRole`
- `content`, `status` (SENT/READ), `createdAt`

**Modèles schema** : `Message` (Clerk) | `LocalMessage` (natif)

> Note : le concept de "Conversation" dans le canon est implémenté comme un thread implicite groupé par `missionId`. Il n'y a pas d'entité Conversation séparée.

### 4.8 Notification

Notification système vers un utilisateur.

**Types** :
- `mission_update` — changement de statut mission
- `new_proposal` — nouvelle candidature reçue
- `contract_update` — changement de statut contrat
- `payment_update` — changement de statut paiement
- `new_message` — nouveau message reçu
- `system` — notification système générale

**Canaux de livraison** : in-app, push (Firebase FCM), email (SendGrid)

**Modèles schema** : `Notification`, `NotificationPreference`, `NotificationQueue`, `NotificationDelivery`

### 4.9 Review / Trust

Évaluation entre participants après une mission complétée.

**Propriétés canoniques** :
- `id`, `missionId`, `authorId`, `targetUserId`
- `rating` (1-5), `comment`
- `moderationStatus` (PENDING/APPROVED/REJECTED)

**Trust Tiers** (LocalUser uniquement) :
| Tier | Description |
|------|-------------|
| `BASIC` | Compte créé, non vérifié |
| `VERIFIED` | Identité vérifiée |
| `TRUSTED` | Historique positif, vérifications complètes |

**Modèles schema** : `Review`, `TrustAuditLog`

### 4.10 Lead

Représente un prospect capturé via les pages publiques ou GHL.

**Propriétés canoniques** :
- `id`, `name`, `email`, `phone`
- `serviceType`, `city`, `message`
- `status` (NEW/CONTACTED/CONVERTED/LOST)
- `source` (ghl_form, landing_page, referral)
- `proId` (professionnel associé, optionnel)

**Modèle schema** : `Lead`

### 4.11 SupportTicket

Ticket de support client.

**Propriétés canoniques** :
- `id`, `userId`, `subject`, `description`
- `status` (OPEN/IN_PROGRESS/RESOLVED/CLOSED)
- `priority` (LOW/MEDIUM/HIGH/URGENT)
- Messages de suivi via `SupportTicketMessage`

**Modèles schema** : `SupportTicket`, `SupportTicketMessage`

### 4.12 Compliance

Objets de conformité légale (Loi 25 Québec / LPRPDE / GDPR).

**Composants** :
- `TermsVersion` — versions des CGU
- `UserConsent` — consentement utilisateur enregistré
- `ComplianceDocument` — documents de conformité

**Règle** : tout utilisateur doit avoir accepté la version courante des CGU avant d'utiliser la plateforme.

---

## 5. ÉTATS MÉTIER DES MISSIONS

### Machine à états canonique

```
draft → published → matched → in_progress → completed
                  ↘ cancelled   ↘ cancelled    ↘ disputed
```

### Correspondance avec le schema

| État canon | MissionStatus (Clerk) | LocalMissionStatus (natif) |
|------------|----------------------|---------------------------|
| draft | DRAFT | open |
| published | OPEN | open |
| matched | MATCHED | assigned |
| in_progress | IN_PROGRESS | in_progress |
| completed | COMPLETED | completed |
| paid | — | paid |
| cancelled | CANCELLED | cancelled |
| disputed | via Dispute relation | — (non implémenté) |

**Transitions autorisées** :
- `draft` → `published`
- `published` → `matched` (quand une proposal est acceptée)
- `published` → `cancelled`
- `matched` → `in_progress` (quand le worker commence)
- `matched` → `cancelled`
- `in_progress` → `completed`
- `in_progress` → `disputed` (via création d'un Dispute)
- `completed` → `paid` (après paiement confirmé)

**Transitions interdites** :
- `completed` → `published`
- `completed` → `in_progress`
- `cancelled` → tout autre état
- `paid` → tout autre état (sauf remboursement via Stripe)

### Note sur le système natif (LocalMission)

LocalMission utilise des statuts en **lowercase** (`open`, `assigned`, `in_progress`, `completed`, `paid`, `cancelled`). Le mapping vers les états canon est documenté ci-dessus. L'état `disputed` n'existe pas dans LocalMission — c'est une limitation MVP.

---

## 6. FLOWS CRITIQUES

### 6.1 Inscription / Connexion
- **Trigger** : formulaire mobile ou web
- **API** : `POST /api/v1/auth/register` | `POST /api/v1/auth/login`
- **Résultat** : JWT access + refresh tokens

### 6.2 Publication de mission
- **Trigger** : employeur crée une mission
- **API** : `POST /api/v1/missions-local`
- **Validation** : title, description, category, price, location obligatoires
- **État résultant** : `open`

### 6.3 Candidature (Proposal)
- **Trigger** : worker soumet une proposal
- **API** : `POST /api/v1/offers` (à renommer en proposals)
- **État résultant** : proposal `PENDING`

### 6.4 Match (acceptation)
- **Trigger** : employeur accepte une proposal
- **API** : `POST /api/v1/missions-local/:id/accept`
- **État résultant** : mission `assigned`, proposal `ACCEPTED`

### 6.5 Contrat
- **Trigger** : création automatique ou manuelle après match
- **API** : `POST /api/v1/contracts`
- **État résultant** : contrat `DRAFT` → `PENDING` → `ACCEPTED`

### 6.6 Paiement
- **Trigger** : mission complétée, employeur paie
- **API** : `POST /api/v1/payments-local/intent` ou `POST /api/v1/payments/checkout`
- **Webhook** : `POST /api/v1/webhooks/stripe`
- **État résultant** : mission `paid`, invoice `PAID`

### 6.7 Messagerie
- **Trigger** : participant envoie un message
- **API** : `POST /api/v1/messages-local`
- **Notification** : push + in-app au destinataire

### 6.8 Complétion de mission
- **Trigger** : worker marque la mission comme complétée
- **API** : `POST /api/v1/missions-local/:id/complete`
- **État résultant** : mission `completed`

### 6.9 Évaluation
- **Trigger** : après complétion, chaque partie évalue l'autre
- **API** : `POST /api/v1/reviews`
- **Impact** : mise à jour du trustTier

### 6.10 Annulation / Dispute
- **Trigger** : une partie annule ou ouvre un litige
- **API** : `POST /api/v1/missions-local/:id/cancel`
- **État résultant** : mission `cancelled`

---

## 7. CONTRATS API

Le backend est la **source de vérité métier**.

### Documents de référence
- **OpenAPI spec** : `docs/api/openapi-spec.json`
- **Frontend contract** : `docs/API_CONTRACT_FRONTEND.md`
- **Mobile contract** : `docs/WORKON_MOBILE_PAGES_FLOWS_FEATURES.md`

### Principe
- Le backend expose les endpoints
- Le mobile et le web **consomment** ces endpoints
- Les surfaces ne doivent **jamais** inventer de logique métier locale
- Si un endpoint manque, il doit être ajouté au backend — pas contourné côté client

---

## 8. SÉPARATION DES SURFACES

| Surface | Responsabilité | Ne fait PAS |
|---------|---------------|-------------|
| **Backend** | Logique métier, validation, sécurité, accès DB, webhooks | UI, navigation, rendu |
| **Mobile (Flutter)** | UX, affichage, navigation, offline-first | Validation métier, accès DB direct |
| **Web (Next.js)** | Dashboard, outils admin, landing pages | Logique métier dupliquée |
| **Ops (N8N/GHL)** | Automatisation, CRM, lead capture | Logique métier, modification de données |

---

## 9. INTÉGRATIONS EXTERNES

| Système | Rôle | Propriétaire |
|---------|------|-------------|
| **Stripe** | Paiements, escrow, Connect (payouts workers) | Backend |
| **Firebase (FCM)** | Push notifications | Backend → Mobile |
| **SendGrid** | Emails transactionnels | Backend |
| **GHL (GoHighLevel)** | CRM, formulaires, lead capture | Ops → Backend (webhooks) |
| **N8N** | Orchestration workflows, automatisations | Ops → Backend (notifications) |
| **Clerk** | SSO, auth web | Backend (CloudUser) |
| **Railway** | Hébergement backend + DB + N8N | Infra |

---

## 10. RÈGLES POUR LES MODIFICATIONS

Toute modification doit répondre à :

1. **Quel objet métier est concerné ?** (User, Mission, Proposal, etc.)
2. **Quel flow est impacté ?** (inscription, publication, paiement, etc.)
3. **Quelle surface est modifiée ?** (backend, mobile, web, ops)
4. **L'état machine est-il respecté ?** (transitions autorisées)
5. **Le canon est-il à jour ?** (si nouveau statut ou objet, mettre à jour ici)

**Si la modification crée une divergence entre surfaces, elle doit être refusée.**

---

## 11. RÈGLES POUR LES AGENTS IA

Les agents IA **peuvent** :
- Corriger du code existant
- Améliorer la structure
- Générer des tests
- Améliorer la documentation
- Proposer des optimisations

Les agents IA **ne doivent PAS** :
- Modifier les objets métier sans mise à jour du canon
- Créer de nouveaux états métier non documentés
- Modifier les transitions de la machine à états
- Supprimer des modules sans preuve de non-usage
- Inventer des abstractions non validées par le canon

---

## 12. GLOSSAIRE

| Terme canon | Terme code (actuel) | Notes |
|-------------|-------------------|-------|
| User | User / LocalUser | Deux systèmes coexistants |
| Mission | Mission / LocalMission | Deux systèmes coexistants |
| Proposal | Offer / LocalOffer | **Renommage prévu** : Offer → Proposal |
| Contract | Contract | Clerk uniquement pour l'instant |
| Payment | Payment | Clerk uniquement |
| Invoice | Invoice | Partagé (supporte LocalMission) |
| Message | Message / LocalMessage | Deux systèmes coexistants |
| Review | Review | Partagé |
| Lead | Lead | Système natif uniquement |
| Proposal | Offer | Le code dit "Offer", le canon dit "Proposal" |

---

## 13. DETTE TECHNIQUE CONNUE

| Item | Impact | Priorité |
|------|--------|----------|
| Dual User system (Clerk + Local) | Complexité, duplication | Post-MVP — convergence planifiée |
| Offer → Proposal renaming | Incohérence terminologique | Low — cosmétique |
| LocalMission sans Contract | Pas de contrat formel pour mobile | Medium — à ajouter |
| LocalMission sans Dispute | Pas de gestion de litiges mobile | Medium — à ajouter |
| Enum casing inconsistency (lowercase vs UPPERCASE) | Confusion dev | Low — cosmétique |
| signatureNonce absent | Pas de non-répudiation crypto | Post-MVP |

---

*Ce document est la référence obligatoire pour toute modification du projet WorkOn.*
*Dernière vérification : aligné avec le schema Prisma et le code backend au 2026-04-06.*
