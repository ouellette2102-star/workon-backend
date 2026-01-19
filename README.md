# WorkOn Backend API

**WorkOn** est une marketplace de services pour travailleurs autonomes au Québec. Ce backend NestJS gère l'authentification, les missions, les paiements (Stripe), la messagerie, les revenus et les notifications push.

[![CI](https://github.com/ouellette2102-star/workon-backend/actions/workflows/ci.yml/badge.svg)](https://github.com/ouellette2102-star/workon-backend/actions/workflows/ci.yml)

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [GETTING_STARTED.md](docs/GETTING_STARTED.md) | Quickstart 10 minutes |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Architecture technique détaillée |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | Déploiement Railway (staging/prod) |
| [STAGING_RAILWAY.md](docs/STAGING_RAILWAY.md) | Guide spécifique staging |

---

## 🔧 Requirements

| Outil | Version | Installation |
|-------|---------|--------------|
| Node.js | 20.x LTS | [nodejs.org](https://nodejs.org/) |
| npm | 10.x+ | Inclus avec Node.js |
| PostgreSQL | 14+ | [postgresql.org](https://www.postgresql.org/) ou Docker |
| Git | 2.x+ | [git-scm.com](https://git-scm.com/) |

**Comptes externes (optionnels en dev):**
- [Stripe](https://stripe.com) - Paiements (clés TEST)
- [Clerk](https://clerk.com) - Auth legacy (optionnel)
- [Firebase](https://firebase.google.com) - Push notifications

---

## ⚡ Installation rapide

```bash
# 1. Cloner le repo
git clone https://github.com/ouellette2102-star/workon-backend.git
cd workon-backend

# 2. Installer les dépendances
npm install

# 3. Copier le fichier d'environnement
cp env.example .env

# 4. Éditer .env avec vos valeurs (DATABASE_URL minimum)
# Voir section "Variables d'environnement" ci-dessous

# 5. Générer le client Prisma
npm run prisma:generate

# 6. Appliquer les migrations
npm run migrate:deploy

# 7. (Optionnel) Seeder des données de test
npm run seed:dev

# 8. Lancer le serveur
npm run start:dev
```

Le serveur démarre sur `http://localhost:3001` (ou PORT configuré).

---

## 📜 Scripts npm

### Développement

| Script | Description |
|--------|-------------|
| `npm run start:dev` | Démarre en mode watch (hot reload) |
| `npm run start:debug` | Démarre avec debugger Node.js |
| `npm run start` | Démarre sans watch |

### Build & Production

| Script | Description |
|--------|-------------|
| `npm run build` | Compile TypeScript vers `dist/` |
| `npm run start:prod` | Lance `node dist/main.js` |
| `npm run start:railway` | Script de démarrage Railway |

### Tests

| Script | Description |
|--------|-------------|
| `npm run test` | Tests unitaires (Jest) |
| `npm run test:watch` | Tests en mode watch |
| `npm run test:cov` | Tests avec couverture |
| `npm run test:e2e` | Tests E2E (Jest config) |
| `npx playwright test` | Tests E2E Playwright |

### Qualité de code

| Script | Description |
|--------|-------------|
| `npm run lint` | ESLint sur `src/` et `test/` |
| `npm run format` | Prettier sur `src/` et `test/` |
| `npm run qa:gate` | Lint + Build + Test + Contracts |

### Base de données (Prisma)

| Script | Description |
|--------|-------------|
| `npm run prisma:generate` | Génère le client Prisma |
| `npm run prisma:validate` | Valide le schema |
| `npm run migrate` | Crée une nouvelle migration (dev) |
| `npm run migrate:deploy` | Applique les migrations |
| `npm run migrate:reset:local` | ⚠️ Reset complet (DEV ONLY) |
| `npm run prisma:studio` | UI web pour explorer la DB |
| `npm run db:status` | Statut des migrations |

### Smoke tests

| Script | Description |
|--------|-------------|
| `npm run smoke:contracts` | Vérifie les contrats API |
| `npm run smoke:local` | Tests smoke locaux (PowerShell) |
| `npm run smoke:ci` | Tests smoke CI (bash) |

---

## 🔐 Variables d'environnement

Copier `env.example` vers `.env` et configurer :

### Obligatoires

| Variable | Description | Exemple |
|----------|-------------|---------|
| `DATABASE_URL` | URL PostgreSQL | `postgresql://user:pass@localhost:5432/workon` |
| `NODE_ENV` | Environnement | `development`, `staging`, `production` |

### Authentification (obligatoires en production)

| Variable | Description | Exemple |
|----------|-------------|---------|
| `JWT_SECRET` | Secret JWT (min 32 chars) | `votre-secret-jwt-min-32-caracteres` |
| `JWT_EXPIRES_IN` | Durée token | `1d` |
| `JWT_REFRESH_SECRET` | Secret refresh token | `votre-refresh-secret-32-chars` |
| `JWT_REFRESH_EXPIRES_IN` | Durée refresh | `7d` |

### Stripe (paiements)

| Variable | Description | Où l'obtenir |
|----------|-------------|--------------|
| `STRIPE_SECRET_KEY` | Clé secrète | [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys) |
| `STRIPE_WEBHOOK_SECRET` | Secret webhook | Dashboard → Webhooks |
| `STRIPE_PUBLISHABLE_KEY` | Clé publique | Dashboard → API Keys |

> ⚠️ Utiliser uniquement des clés **TEST** (`sk_test_*`, `pk_test_*`) en dev/staging.

### Optionnelles

| Variable | Description | Défaut |
|----------|-------------|--------|
| `PORT` | Port du serveur | `3001` |
| `CORS_ORIGIN` | Origines CORS autorisées | `http://localhost:3000` |
| `CLERK_SECRET_KEY` | Clé Clerk (legacy auth) | _(vide)_ |
| `SENTRY_DSN` | DSN Sentry (monitoring) | _(vide = désactivé)_ |
| `THROTTLE_TTL` | Fenêtre rate limit (sec) | `60` |
| `THROTTLE_LIMIT` | Max requêtes/fenêtre | `100` |
| `SIGNED_URL_SECRET` | Secret pour URLs signées | _(requis en prod)_ |
| `ENABLE_SWAGGER_PROD` | Swagger en prod | `false` |
| `DEBUG_ENV` | Debug variables env | `0` |

---

## 🏗️ Architecture

```
src/
├── auth/           # Authentification (JWT, guards, strategies)
├── users/          # Gestion utilisateurs
├── missions-local/ # Missions (CRUD, lifecycle)
├── offers/         # Offres/candidatures workers
├── messages/       # Chat mission-scoped
├── earnings/       # Revenus workers
├── payments/       # Stripe escrow
├── devices/        # Push tokens (FCM)
├── notifications/  # Notifications push
├── reviews/        # Avis/ratings
├── compliance/     # Consentement légal (TERMS, PRIVACY)
├── contracts/      # Contrats de mission
├── health/         # Health checks (/healthz, /readyz)
├── prisma/         # Prisma service
└── common/         # Guards, filters, DTOs partagés
```

Voir [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) pour les détails.

---

## 🚀 CI/CD (GitHub Actions)

Le workflow `.github/workflows/ci.yml` exécute :

| Job | Description | Trigger |
|-----|-------------|---------|
| `lint` | ESLint | Push/PR sur main/develop |
| `build` | Compilation TypeScript | Push/PR sur main/develop |
| `test` | Tests unitaires + DB | Push/PR sur main/develop |
| `qa-gate` | Contract checks | Après build |
| `smoke-e2e` | Tests E2E avec serveur | Après build+test |
| `release-gate` | Validation finale | Tous jobs OK |

### Reproduire la CI localement

```bash
# Lint
npm run lint

# Build
npm run prisma:generate
npm run build

# Tests (nécessite PostgreSQL)
npm run test

# Smoke tests
npm run smoke:contracts

# QA Gate complet
npm run qa:gate
```

---

## 🔥 Troubleshooting

### 1. `Cannot find module '@prisma/client'`

**Cause:** Client Prisma non généré.

```bash
npm run prisma:generate
```

### 2. `Connection refused` à PostgreSQL

**Causes possibles:**
- PostgreSQL n'est pas démarré
- Mauvais port dans `DATABASE_URL`
- Credentials incorrects

**Solutions:**
```bash
# Vérifier que Postgres tourne
pg_isready -h localhost -p 5432

# Ou avec Docker
docker run -d --name postgres -p 5432:5432 \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=workon \
  postgres:16-alpine
```

### 3. `JWT_SECRET is required in production`

**Cause:** Variables d'env non configurées pour `NODE_ENV=production`.

**Solution:** Configurer toutes les variables marquées "obligatoires en production".

### 4. `SIGNED_URL_SECRET is required in production`

**Cause:** Variable manquante pour les URLs signées des médias.

**Solution:**
```bash
# Ajouter dans .env (min 32 caractères)
SIGNED_URL_SECRET=votre-secret-urls-signees-32-chars
```

### 5. Migrations échouent

```bash
# Vérifier le statut
npm run db:status

# Forcer le déploiement
npm run migrate:deploy

# En dernier recours (DEV ONLY - perte de données!)
npm run migrate:reset:local
```

### 6. `Port 3001 already in use`

```bash
# Trouver le process
# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# macOS/Linux
lsof -i :3001
kill -9 <PID>
```

### 7. Tests E2E échouent (Playwright)

```bash
# Installer les navigateurs Playwright
npx playwright install

# Vérifier que le serveur tourne
curl http://localhost:3000/healthz
```

### 8. ESLint warnings `@typescript-eslint/*`

```bash
# Assurez-vous d'utiliser la bonne config
npm run lint
```

### 9. `Rate limit exceeded`

**Cause:** Trop de requêtes depuis la même IP.

**Solution dev:** Augmenter `THROTTLE_LIMIT` dans `.env`.

### 10. Swagger non accessible

**En production:** Configurer `ENABLE_SWAGGER_PROD=true`.

**URL:** `http://localhost:3001/api/docs`

---

## 📖 API Documentation

- **Swagger UI:** `http://localhost:3001/api/docs` (dev) ou configuré en prod
- **Health check:** `http://localhost:3001/healthz`
- **Readiness:** `http://localhost:3001/readyz`
- **Full health:** `http://localhost:3001/api/v1/health`

---

## 📄 License

Proprietary - WorkOn Team

---

## 📞 Support

Pour les questions techniques, ouvrir une issue sur GitHub.
