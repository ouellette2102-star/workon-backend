# WorkOn — Local Development Setup

> **Dernière mise à jour :** 5 Mars 2026  
> **Contexte :** Railway temporairement indisponible — mode développement local.  
> **Statut :** ✅ Validé — Backend opérationnel, APK Flutter compilé avec succès.

---

## Prérequis

| Outil | Version minimale | Vérification |
|---|---|---|
| Docker Desktop | 4.x | `docker --version` |
| Docker Compose | 2.x | `docker compose version` |
| Node.js | 18.x LTS | `node --version` |
| npm | 9.x | `npm --version` |
| Flutter SDK | 3.x | `flutter --version` |

---

## Architecture locale

```
PostgreSQL (Docker)    Backend NestJS (local)    Flutter App
  localhost:5432   ←→   localhost:3000         ←→  10.0.2.2:3000 (Android emu)
                                                    localhost:3000  (iOS sim)
                                                    <LOCAL_IP>:3000 (device physique)
```

---

## Démarrage rapide (2 commandes)

### Option A — Script automatique (recommandé)

```powershell
cd workonapp/backend
.\start-local.ps1
```

Le script :
1. Vérifie Docker
2. Démarre PostgreSQL
3. Applique les migrations Prisma
4. Lance le backend sur `http://localhost:3000`

### Option B — Manuelle (pour débogage)

```powershell
# 1. Démarrer PostgreSQL
cd workonapp/backend
docker compose up -d postgres

# 2. Attendre que PostgreSQL soit healthy
docker inspect --format='{{.State.Health.Status}}' workon-postgres
# Résultat attendu: healthy

# 3. Appliquer les migrations Prisma
$env:DATABASE_URL = "postgresql://workon:workon_password@localhost:5432/workon?schema=public"
npx prisma migrate deploy

# 4a. Lancer le backend compilé (rapide)
$env:NODE_ENV="development"; $env:PORT="3000"; $env:JWT_SECRET="workon-local-jwt-secret-dev-min-32-chars-ok"; $env:JWT_REFRESH_SECRET="workon-local-refresh-secret-dev-min-32-chars-ok"; $env:ENABLE_SWAGGER_PROD="true"; $env:CORS_ORIGIN="*"; $env:LOG_LEVEL="debug"; $env:BCRYPT_ROUNDS="10"
node dist/main.js

# 4b. OU avec hot-reload TypeScript (plus lent au démarrage ~60s)
npm run start:dev
```

---

## URLs de développement

| Endpoint | URL |
|---|---|
| **API Base** | http://localhost:3000/api/v1 |
| **Swagger UI** | http://localhost:3000/api/docs |
| **Health** | http://localhost:3000/health |
| **Readiness** | http://localhost:3000/readyz |
| **Health complet** | http://localhost:3000/api/v1/health |

---

## Variables d'environnement

Le fichier `.env.local` est chargé en **priorité** par le ConfigModule NestJS.  
Il est listé dans `.gitignore` — ne jamais committer de vraies clés.

### Structure `.env.local`

```bash
# PostgreSQL local (Docker)
DATABASE_URL="postgresql://workon:workon_password@localhost:5432/workon?schema=public"

# App
NODE_ENV="development"
PORT=3000

# JWT (secrets locaux — min 32 chars)
JWT_SECRET="workon-local-jwt-secret-dev-min-32-chars-ok"
JWT_EXPIRES_IN="7d"
JWT_REFRESH_SECRET="workon-local-refresh-secret-dev-min-32-chars-ok"
JWT_REFRESH_EXPIRES_IN="30d"

# Stripe (clés réelles — ne pas committer dans un repo public)
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_PUBLISHABLE_KEY="pk_live_..."

# SendGrid
SENDGRID_API_KEY="SG...."
SENDGRID_FROM_EMAIL="noreply@workon.app"
SENDGRID_FROM_NAME="WorkOn"

# Firebase Admin (après téléchargement depuis console.firebase.google.com/project/workonv1)
FIREBASE_PROJECT_ID="workonv1"
FIREBASE_CLIENT_EMAIL="..."
FIREBASE_PRIVATE_KEY="..."

# Google Maps
GOOGLE_MAPS_API_KEY="AIzaSyD3euvGOO-jSlR9omzXtTeEiUmQvKAfMU8"

# CORS (permissif en dev)
CORS_ORIGIN="*"

# Swagger activé
ENABLE_SWAGGER_PROD="true"
```

---

## Flutter — Mode développement

### Émulateur Android

```powershell
flutter run --dart-define=APP_ENV=dev
# → Appelle http://10.0.2.2:3000/api/v1 (alias localhost sur l'hôte)
```

### Simulateur iOS

```powershell
flutter run --dart-define=APP_ENV=dev
# → Appelle http://localhost:3000/api/v1
```

### Appareil physique (iPhone/Android réel)

Trouver l'IP locale de la machine (même réseau Wi-Fi) :

```powershell
# Windows
ipconfig | Select-String "IPv4"
# Exemple: 192.168.1.42
```

```powershell
flutter run --dart-define=APP_ENV=dev --dart-define=LOCAL_IP=192.168.1.42
# → Appelle http://192.168.1.42:3000/api/v1
```

---

## Tests de validation

### Test 1 — Backend Health

```powershell
Invoke-RestMethod http://localhost:3000/health
# Attendu: { status: "ok", uptime: ... }

Invoke-RestMethod http://localhost:3000/readyz
# Attendu: { status: "ready", checks: { database: { status: "ok" } } }
```

### Test 2 — Authentication JWT

```powershell
# Register
$body = '{"email":"dev@test.com","password":"Test1234!","firstName":"Dev","lastName":"Local"}'
$res = Invoke-RestMethod -Uri http://localhost:3000/api/v1/auth/register -Method POST -Body $body -ContentType 'application/json'
$token = $res.accessToken

# Verify token
Invoke-RestMethod -Uri http://localhost:3000/api/v1/auth/me -Headers @{Authorization="Bearer $token"}
```

### Test 3 — API Public

```powershell
Invoke-RestMethod http://localhost:3000/api/v1/catalog/categories
Invoke-RestMethod http://localhost:3000/api/v1/metrics/home-stats
```

### Test 4 — Swagger

Ouvrir dans le navigateur : http://localhost:3000/api/docs

---

## Base de données locale

### Connexion directe (Prisma Studio)

```powershell
cd workonapp/backend
$env:DATABASE_URL="postgresql://workon:workon_password@localhost:5432/workon?schema=public"
npx prisma studio
# Ouvre http://localhost:5555
```

### Connexion via DBeaver / TablePlus

```
Host:     localhost
Port:     5432
Database: workon
User:     workon
Password: workon_password
```

### Réinitialiser la base (danger — efface toutes les données)

```powershell
docker compose down -v          # Supprime le volume
docker compose up -d postgres   # Recrée
$env:DATABASE_URL="postgresql://workon:workon_password@localhost:5432/workon?schema=public"
npx prisma migrate deploy       # Re-applique les migrations
```

---

## Arrêt

```powershell
# Arrêter le backend : Ctrl+C dans le terminal

# Arrêter PostgreSQL
docker compose down

# Arrêter et supprimer les données
docker compose down -v
```

---

## Debugging

### Logs backend en temps réel

```powershell
Get-Content start-prod.log -Wait -Tail 50
```

### Problèmes courants

| Problème | Cause | Solution |
|---|---|---|
| Port 3000 déjà utilisé | Un autre processus | `netstat -an \| findstr :3000` puis `taskkill /PID <pid> /F` |
| PostgreSQL pas healthy | Docker lent | Attendre 30s ou `docker compose restart postgres` |
| `ECONNREFUSED` Flutter | Mauvaise URL | Vérifier `APP_ENV=dev` et `LOCAL_IP` si physique |
| Firebase error au boot | FIREBASE_PRIVATE_KEY manquante | Normal en dev — push désactivé silencieusement |
| Migration déjà appliquée | Warning normal | `prisma migrate deploy` est idempotent |

---

## Notes de sécurité

- `.env.local` est dans `.gitignore` — ne jamais committer
- Les JWT secrets locaux sont différents de la production
- `CORS_ORIGIN=*` est acceptable uniquement en développement local
- Firebase et Stripe peuvent utiliser des clés test en dev

---

## Migration vers production (Render / Railway)

Quand Railway est disponible :
1. Re-déployer en pointant sur `DATABASE_URL` Railway
2. Mettre `CORS_ORIGIN` avec le domaine Flutter
3. Supprimer `ENABLE_SWAGGER_PROD=true` si non souhaité en prod
