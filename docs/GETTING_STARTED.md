# WorkOn Backend - Getting Started

Guide de démarrage rapide pour lancer le backend WorkOn en **10 minutes**.

---

## ✅ Prérequis

Avant de commencer, vérifiez que vous avez :

```bash
# Node.js 20.x
node --version
# v20.x.x

# npm 10.x+
npm --version
# 10.x.x

# PostgreSQL accessible
pg_isready -h localhost -p 5432
# localhost:5432 - accepting connections
```

### PostgreSQL rapide avec Docker

Si vous n'avez pas PostgreSQL installé :

```bash
# Lancer PostgreSQL en Docker
docker run -d \
  --name workon-postgres \
  -p 5432:5432 \
  -e POSTGRES_USER=workon \
  -e POSTGRES_PASSWORD=workon123 \
  -e POSTGRES_DB=workon \
  postgres:16-alpine

# Vérifier qu'il tourne
docker ps | grep workon-postgres
```

---

## 🚀 Installation (5 minutes)

### Étape 1: Cloner le repo

```bash
git clone https://github.com/ouellette2102-star/workon-backend.git
cd workon-backend
```

### Étape 2: Installer les dépendances

```bash
npm install
```

### Étape 3: Configurer l'environnement

```bash
# Copier le template
cp env.example .env
```

Éditer `.env` avec un éditeur (VS Code, nano, etc.) :

```bash
# MINIMUM requis pour démarrer
DATABASE_URL="postgresql://workon:workon123@localhost:5432/workon"
NODE_ENV="development"
JWT_SECRET="dev-jwt-secret-change-in-production-32chars"
JWT_REFRESH_SECRET="dev-refresh-secret-change-prod-32chars"
```

> 💡 Les autres variables ont des valeurs par défaut en dev.

### Étape 4: Configurer la base de données

```bash
# Générer le client Prisma
npm run prisma:generate

# Appliquer les migrations
npm run migrate:deploy
```

### Étape 5: Lancer le serveur

```bash
npm run start:dev
```

**Résultat attendu :**
```
[Nest] LOG [NestApplication] Nest application successfully started
🚀 Application is running on: http://0.0.0.0:3001/api/v1
🌍 Environment: development
```

---

## ✅ Vérifier que tout fonctionne

### Test 1: Health check

```bash
curl http://localhost:3001/healthz
```

**Réponse attendue :**
```json
{
  "status": "ok",
  "timestamp": "2026-01-19T...",
  "uptime": 12,
  "version": "1.0.0"
}
```

### Test 2: Readiness (DB check)

```bash
curl http://localhost:3001/readyz
```

**Réponse attendue :**
```json
{
  "status": "ready",
  "timestamp": "...",
  "checks": {
    "database": { "status": "ok", "latencyMs": 5 }
  }
}
```

### Test 3: Swagger UI

Ouvrir dans le navigateur :
```
http://localhost:3001/api/docs
```

Vous devez voir l'interface Swagger avec tous les endpoints.

---

## 👤 Créer un premier utilisateur

### Option A: Via API (Swagger)

1. Ouvrir Swagger UI : `http://localhost:3001/api/docs`
2. Trouver `POST /api/v1/auth/signup`
3. Cliquer "Try it out"
4. Entrer les données :
```json
{
  "email": "test@example.com",
  "password": "Password123!",
  "name": "Test User",
  "role": "WORKER"
}
```
5. Cliquer "Execute"

### Option B: Via curl

```bash
curl -X POST http://localhost:3001/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123!",
    "name": "Test User",
    "role": "WORKER"
  }'
```

**Réponse :**
```json
{
  "user": {
    "id": "user_123...",
    "email": "test@example.com",
    "role": "WORKER"
  },
  "accessToken": "eyJhbGci...",
  "refreshToken": "eyJhbGci..."
}
```

### Option C: Via seed (données de test)

```bash
npm run seed:dev
```

Ceci crée plusieurs utilisateurs et missions de test.

---

## 📋 Créer une première mission

### 1. Se connecter comme employer

```bash
# Créer un employer
curl -X POST http://localhost:3001/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "employer@example.com",
    "password": "Password123!",
    "name": "Test Employer",
    "role": "EMPLOYER",
    "companyName": "Test Company"
  }'
```

Sauvegarder le `accessToken` retourné.

### 2. Accepter les conditions (requis)

```bash
# Obtenir les versions des documents
curl http://localhost:3001/api/v1/compliance/versions

# Accepter TERMS
curl -X POST http://localhost:3001/api/v1/compliance/accept \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer VOTRE_TOKEN" \
  -d '{"documentType": "TERMS", "version": "1"}'

# Accepter PRIVACY
curl -X POST http://localhost:3001/api/v1/compliance/accept \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer VOTRE_TOKEN" \
  -d '{"documentType": "PRIVACY", "version": "1"}'
```

### 3. Créer une mission

```bash
curl -X POST http://localhost:3001/api/v1/missions-local \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer VOTRE_TOKEN" \
  -d '{
    "title": "Réparation plomberie",
    "description": "Fuite sous évier à réparer",
    "category": "plumbing",
    "city": "Montreal",
    "address": "123 Rue Test",
    "latitude": 45.5017,
    "longitude": -73.5673,
    "price": 150
  }'
```

**Réponse :**
```json
{
  "id": "local_1705...",
  "title": "Réparation plomberie",
  "status": "open",
  ...
}
```

---

## 🧪 Lancer les tests

### Tests unitaires

```bash
npm run test
```

### Tests avec couverture

```bash
npm run test:cov
```

### Tests E2E (Playwright)

```bash
# Installer Playwright (première fois)
npx playwright install

# Lancer les tests E2E
npx playwright test
```

---

## 📊 Explorer la base de données

```bash
# Ouvrir Prisma Studio (UI web)
npm run prisma:studio
```

Ouvre automatiquement `http://localhost:5555` avec une interface pour explorer les données.

---

## 🛠️ Commandes utiles

| Tâche | Commande |
|-------|----------|
| Démarrer en dev | `npm run start:dev` |
| Rebuild | `npm run build` |
| Lint | `npm run lint` |
| Nouvelle migration | `npm run migrate` |
| Reset DB (DEV ONLY) | `npm run migrate:reset:local` |
| Explorer DB | `npm run prisma:studio` |
| Tous les tests | `npm run qa:gate` |

---

## ⚠️ Problèmes courants

### "Cannot connect to database"

```bash
# Vérifier que PostgreSQL tourne
pg_isready -h localhost -p 5432

# Vérifier DATABASE_URL dans .env
cat .env | grep DATABASE_URL
```

### "JWT_SECRET is required"

Assurez-vous que `.env` contient :
```
JWT_SECRET="au-moins-32-caracteres-ici"
JWT_REFRESH_SECRET="au-moins-32-caracteres-ici-aussi"
```

### "Module not found: @prisma/client"

```bash
npm run prisma:generate
```

### Port déjà utilisé

```bash
# Trouver le process
lsof -i :3001

# Ou changer le port dans .env
PORT=3002
```

---

## ✅ Checklist "Tout fonctionne"

- [ ] `npm run start:dev` démarre sans erreur
- [ ] `curl localhost:3001/healthz` retourne `{"status":"ok"}`
- [ ] `curl localhost:3001/readyz` retourne `{"status":"ready"}`
- [ ] Swagger UI accessible sur `/api/docs`
- [ ] Création user via `/auth/signup` fonctionne
- [ ] `npm run test` passe

**Tout coché ?** Vous êtes prêt à développer ! 🎉

---

## 📚 Prochaines étapes

- [ARCHITECTURE.md](ARCHITECTURE.md) - Comprendre la structure
- [DEPLOYMENT.md](DEPLOYMENT.md) - Déployer en staging/prod
- [README.md](../README.md) - Référence complète

---

_Dernière mise à jour: 2026-01-19_

