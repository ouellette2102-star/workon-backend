# WorkOn Backend — Contexte pour Claude AI OS

> Ce fichier est lu automatiquement par Claude à chaque session.
> Il donne le contexte complet pour éviter de re-expliquer la stack.

## Identité
- **Projet:** WorkOn — Marketplace travailleurs autonomes × employeurs (Québec)
- **Modèle:** Uber × LinkedIn × TaskRabbit
- **Fondateur:** Mathieu Ouellette (ouellette2102@gmail.com)
- **Stade:** Pre-revenue, développement actif

## Stack
- **Framework:** NestJS + TypeScript
- **Base de données:** PostgreSQL (Railway)
- **Auth:** JWT (access + refresh tokens)
- **Paiements:** Stripe (escrow + Connect Express)
- **Automation:** N8N (https://n8n-production-9b4ce.up.railway.app)
- **CRM:** GoHighLevel (GHL)
- **Documentation:** Notion workspace

## Modules NestJS (src/)
| Module | Responsabilité |
|--------|---------------|
| Auth | Login, register, JWT, refresh |
| Users | Profils Client et Pro |
| Missions | Création, matching, statuts |
| Offers | Propositions des Pros aux missions |
| Messaging | Chat in-app Client ↔ Pro |
| Payments | Stripe escrow, webhooks, Connect payout |
| Push | Notifications mobiles (FCM) |
| Reviews | Évaluations post-mission |
| Contracts | Contrats formels |

## Architecture de Paiement Stripe Escrow

```
Client crée mission
  → POST /missions { title, description, budget, skills, location }

Client paie (escrow)
  → POST /payments/missions/:id/escrow { amount }
  → Stripe PaymentIntent avec capture_method: 'manual'
  → Retourne { clientSecret, paymentIntentId }

Flutter confirme paiement côté client avec Stripe.js

Mission complétée
  → POST /payments/missions/:id/complete { paymentIntentId, proStripeAccountId }
  → stripe.paymentIntents.capture(paymentIntentId)
  → stripe.transfers.create({ amount: 85%, destination: proStripeAccountId })
  → WorkOn retient 15% de commission

Mission annulée
  → POST /payments/missions/:id/cancel { paymentIntentId }
  → stripe.paymentIntents.cancel(paymentIntentId)
```

## Variables d'Environnement Requises

```env
# Base de données
DATABASE_URL=postgresql://user:password@host:port/workon

# Auth
JWT_SECRET=your-jwt-secret
JWT_ACCESS_EXPIRY=7d
JWT_REFRESH_EXPIRY=30d

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...        # Après création webhook Dashboard
STRIPE_CONNECT_CLIENT_ID=ca_...        # Après activation Connect Express

# N8N (webhooks automation)
N8N_WEBHOOK_BASE=https://n8n-production-9b4ce.up.railway.app

# App
PORT=3000
NODE_ENV=production
```

## Endpoints API Principaux

### Auth
```
POST /auth/register    { email, password, role: 'client'|'pro' }
POST /auth/login       { email, password } → { accessToken, refreshToken }
POST /auth/refresh     { refreshToken } → { accessToken }
```

### Missions
```
POST   /missions                          Créer une mission
GET    /missions                          Lister missions (filtres: status, city, skills)
GET    /missions/:id                      Détail mission
PATCH  /missions/:id/status              Changer statut
```

### Paiements (Stripe Escrow)
```
POST   /payments/missions/:id/escrow     Créer escrow (capture_method: manual)
POST   /payments/missions/:id/complete   Capturer + payer Pro (85%)
POST   /payments/missions/:id/cancel     Annuler escrow
POST   /payments/webhook                 Webhook Stripe (signature vérifiée)
POST   /payments/pros/:id/connect        Créer compte Stripe Connect Express Pro
```

### Pros
```
POST   /users/pros                       Créer profil Pro
GET    /users/pros?skills=X&city=Y       Chercher Pros par skills/zone
PATCH  /users/pros/:id                   Mettre à jour profil
```

## Modèle de Revenus
| Source | Montant | Fréquence |
|--------|---------|-----------|
| Commission mission | 15% du budget | Par mission |
| Abonnement Pro | 29$ CAD/mois | Mensuel |
| Boost visibilité | 9.99$ CAD | One-time |
| Forfait Entreprise | 99$ CAD/mois | Mensuel |

## Règles Business Critiques
1. **CNESST:** Les Pros sont des travailleurs AUTONOMES (pas employés) — responsabilité légale différente
2. **Escrow:** Toujours `capture_method: 'manual'` — l'argent ne bouge PAS avant complétion confirmée
3. **Commission:** 15% à la capture, JAMAIS avant
4. **Reviews:** Obligatoires 24h post-mission (reminder automatique N8N)
5. **Matching:** Priorité → rating ≥ 4.0 + zone correspondante + skills match

## Connexions Système
- **N8N** écoute webhooks backend → orchestre notifications + Notion updates
- **GHL** CRM reçoit leads → onboarding automatique → webhook backend
- **Stripe** webhooks → /payments/webhook → update statuts missions
- **Notion** reçoit KPIs hebdomadaires via N8N → dashboard CEO

## Status Actuel (Mars 2026)
- ✅ Modules créés
- ⏳ Escrow Stripe: implémentation en cours
- ⏳ Stripe webhooks: à configurer dans Dashboard
- ⏳ Connect Express: à activer dans Dashboard
- ⏳ Matching algorithm: à implémenter
- ⏳ Tests unitaires: à créer
