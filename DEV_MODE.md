# 🚀 GUIDE DE DÉVELOPPEMENT - WORKON BACKEND

## 📋 Configuration des variables d'environnement

### Fichier `.env` requis

Le backend NestJS nécessite un fichier `.env` dans le dossier `backend/` pour fonctionner.

**⚠️ IMPORTANT :** Ce fichier NE doit JAMAIS être commité dans Git (il est déjà dans `.gitignore`).

---

## 🛠️ Setup initial

### 1. Créer le fichier `.env`

```bash
cd backend
copy env.example .env
```

Ou sur Linux/Mac:
```bash
cd backend
cp env.example .env
```

### 2. Configurer les variables essentielles

Ouvre `backend/.env` et modifie **au minimum**:

```env
# DATABASE - Remplace par tes identifiants PostgreSQL locaux
DATABASE_URL="postgresql://postgres:TON_MOT_DE_PASSE@localhost:5433/workon?schema=public"

# NODE_ENV - Laisse en development pour le local
NODE_ENV="development"

# JWT - Les valeurs par défaut sont OK pour le dev local
JWT_SECRET="dev-jwt-secret-change-in-production-min-32-chars-2024-workon"
JWT_REFRESH_SECRET="dev-refresh-secret-change-in-production-min-32-chars-2024-workon"
```

---

## ▶️ Démarrer le backend

### Commande de développement

```bash
cd backend
npm run start:dev
```

### Vérification du démarrage

Si tout fonctionne, tu verras:

```
🔧 Development environment detected - using default values for missing variables

💡 INFO: JWT_SECRET not set. Using default dev value.
💡 INFO: JWT_REFRESH_SECRET not set. Using default dev value.
💡 INFO: CLERK_SECRET_KEY not set in development. Clerk auth features will be disabled.

[Nest] LOG [NestFactory] Starting Nest application...
[Nest] LOG Application is running on: http://localhost:3001
💚 Health check available at: /healthz
```

---

## 🔐 Variables d'environnement

### Variables **REQUISES** (tous environnements)

| Variable | Description | Exemple |
|----------|-------------|---------|
| `DATABASE_URL` | Connexion PostgreSQL | `postgresql://user:pass@localhost:5433/workon` |
| `NODE_ENV` | Environnement d'exécution | `development` / `production` / `test` |

### Variables **REQUISES EN PRODUCTION** uniquement

| Variable | Description | Dev | Prod |
|----------|-------------|-----|------|
| `JWT_SECRET` | Clé JWT pour les tokens | Valeur par défaut | ❌ Obligatoire |
| `JWT_REFRESH_SECRET` | Clé JWT refresh | Valeur par défaut | ❌ Obligatoire |
| `CLERK_SECRET_KEY` | Clé API Clerk | ⚠️ Optionnelle | ❌ Obligatoire |

### Variables **OPTIONNELLES**

| Variable | Description | Valeur par défaut |
|----------|-------------|-------------------|
| `PORT` | Port du serveur | `3001` |
| `API_PREFIX` | Préfixe des routes | `api/v1` |
| `CORS_ORIGIN` | Domaines autorisés (CORS) | `http://localhost:3000` |
| `STRIPE_SECRET_KEY` | Clé API Stripe | (vide = paiements désactivés) |
| `SENTRY_DSN` | URL Sentry pour le tracking | (vide = désactivé) |
| `LOG_LEVEL` | Niveau de log | `info` |

---

## 🔍 Résolution de problèmes

### Erreur: "CLERK_SECRET_KEY should not be empty"

**Cause :** Le fichier `backend/.env` n'existe pas ou `NODE_ENV` n'est pas défini.

**Solution :**
1. Vérifie que `backend/.env` existe
2. Vérifie que `NODE_ENV="development"` est présent dans le fichier
3. Relance `npm run start:dev`

### Erreur: "DATABASE_URL should not be empty"

**Cause :** `DATABASE_URL` manquante dans `backend/.env`.

**Solution :**
1. Ouvre `backend/.env`
2. Ajoute `DATABASE_URL="postgresql://postgres:password@localhost:5433/workon"`
3. Remplace les identifiants par les tiens
4. Relance `npm run start:dev`

### Le serveur ne démarre pas

**Checklist :**
- ✅ Le fichier `backend/.env` existe
- ✅ `NODE_ENV="development"` est défini
- ✅ `DATABASE_URL` est définie et correcte
- ✅ PostgreSQL est démarré (`docker-compose up -d` ou service local)
- ✅ La base de données `workon` existe
- ✅ Prisma est synchronisé (`npm run prisma:generate`)

---

## 📚 Commandes utiles

```bash
# Démarrer le backend en mode watch (recharge auto)
npm run start:dev

# Build de production
npm run build

# Démarrer en mode production
npm run start:prod

# Générer le client Prisma
npm run prisma:generate

# Appliquer les migrations Prisma
npm run prisma:migrate:dev

# Ouvrir Prisma Studio (interface graphique DB)
npm run prisma:studio

# Lancer les tests
npm run test

# Lancer les tests E2E
npm run test:e2e
```

---

## 🎯 Accès aux services

| Service | URL | Description |
|---------|-----|-------------|
| **API Backend** | http://localhost:3001 | API REST NestJS |
| **Swagger Docs** | http://localhost:3001/api/docs | Documentation API interactive |
| **Health Check** | http://localhost:3001/healthz | Vérification de santé |
| **Prisma Studio** | http://localhost:5555 | Interface graphique DB |

---

## 🔒 Sécurité

- ✅ Ne **JAMAIS** commiter le fichier `.env` (déjà dans `.gitignore`)
- ✅ Utiliser des valeurs différentes en production
- ✅ Changer `JWT_SECRET` et `JWT_REFRESH_SECRET` en production
- ✅ Garder les clés API (Stripe, Clerk, etc.) secrètes

---

## 📞 Support

En cas de problème, consulte:
- `backend/README.md` - Documentation générale
- `backend/AUTH_API_GUIDE.md` - Guide d'authentification
- `backend/MISSIONS_API_GUIDE.md` - Guide des missions
- Les logs du terminal (`npm run start:dev`)
