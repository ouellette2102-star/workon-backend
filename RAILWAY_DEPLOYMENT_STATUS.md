# 🚀 STATUT DÉPLOIEMENT RAILWAY - WorkOn Backend

## ✅ MODIFICATIONS APPLIQUÉES

### 1️⃣ Migration Prisma Créée

**Fichier:** `prisma/migrations/20251123174227_init/migration.sql`

- ✅ Migration complète générée avec tous les modèles
- ✅ Inclut la table `local_users` et toutes les autres tables
- ✅ Crée les enums (`LocalUserRole`, `LocalMissionStatus`, etc.)
- ✅ Crée tous les index et contraintes

### 2️⃣ Configuration Railway Modifiée

**Fichier:** `backend/nixpacks.toml`

**AVANT:**
```toml
[start]
cmd = "npx prisma migrate deploy || echo 'Prisma migration skipped' && npm run start:prod"
```

**APRÈS:**
```toml
[start]
# Execute Prisma migrations before starting the app
# Critical: Migrations MUST succeed for the app to work correctly
cmd = "npx prisma migrate deploy && npm run start:prod"
```

**Impact:** Les migrations Prisma sont maintenant **obligatoires** avant le démarrage.

### 3️⃣ Scripts package.json

**Ajout:**
```json
"prisma:migrate:deploy": "prisma migrate deploy"
```

(Le script `migrate:deploy` existait déjà)

### 4️⃣ migration_lock.toml

**Fichier:** `prisma/migrations/migration_lock.toml`

```toml
provider = "postgresql"
```

✅ Indique à Prisma d'utiliser PostgreSQL

---

## 🔍 VÉRIFICATION POST-DÉPLOIEMENT

### Health Check

```bash
curl https://workon-backend-production-8908.up.railway.app/healthz
```

**Résultat:** ✅ `200 OK - {"status":"ok","timestamp":"..."}`

**Conclusion:** Le backend démarre correctement.

---

### Test d'Inscription

```bash
POST https://workon-backend-production-8908.up.railway.app/api/v1/auth/register
Content-Type: application/json

{
  "email": "test@workon.app",
  "password": "Test123!WorkOn",
  "firstName": "Test",
  "lastName": "User",
  "phone": "514 555 5555",
  "city": "Montreal",
  "role": "worker"
}
```

**Résultat:** ❌ `500 Internal Server Error`

**Conclusion:** La table `local_users` n'existe toujours pas.

---

## 🚨 PROBLÈME PERSISTANT

### Hypothèse 1: Les Migrations Ne S'exécutent Pas

**Causes possibles:**
1. Railway ne voit pas le dossier `prisma/migrations/`
2. La commande `npx prisma migrate deploy` échoue silencieusement
3. Le `nixpacks.toml` n'est pas pris en compte

**Vérification nécessaire:**
- Consulter les logs Railway pour voir si `prisma migrate deploy` s'exécute
- Chercher dans les logs: `Running migrations...` ou erreurs Prisma

---

### Hypothèse 2: DATABASE_URL Incorrecte

**Problème:**
- Railway a peut-être plusieurs bases PostgreSQL
- `DATABASE_URL` pointe vers une base vide

**Vérification nécessaire:**
- Dans Railway Dashboard → Variables → `DATABASE_URL`
- Vérifier que c'est bien `${{Postgres.DATABASE_URL}}`
- Vérifier qu'il n'y a qu'une seule base PostgreSQL

---

### Hypothèse 3: Prisma Client Non Généré

**Problème:**
- `npx prisma generate` dans `nixpacks.toml` phase install
- Mais peut-être que le client n'inclut pas les dernières migrations

**Vérification nécessaire:**
- Logs Railway: chercher `prisma generate`
- Vérifier l'ordre: generate → build → migrate → start

---

## 🛠️ ACTIONS DE DIAGNOSTIC RAILWAY

### 1️⃣ Consulter les Logs Complets

```bash
railway logs --follow
```

**OU** via Dashboard: https://railway.app → workon-backend → Logs

**Chercher:**
- `Running migrations...`
- `npx prisma migrate deploy`
- Erreurs Prisma (P1001, P2021, etc.)
- `The table public.local_users does not exist`

---

### 2️⃣ Vérifier les Variables d'Environnement

**Railway Dashboard → Variables:**

Vérifier:
- ✅ `DATABASE_URL=${{Postgres.DATABASE_URL}}`
- ✅ `NODE_ENV=production`
- ✅ `JWT_SECRET=<votre-secret>`

---

### 3️⃣ Forcer une Migration Manuelle (DEBUG)

**Option A: Via Railway CLI**

```bash
railway run npx prisma migrate deploy
```

**Option B: Via Railway Dashboard**

1. Aller dans Settings → Deploy
2. Ajouter une commande "One-off":
   ```
   npx prisma migrate deploy
   ```
3. Exécuter manuellement

---

### 4️⃣ Alternative: Utiliser `prisma db push`

Si `migrate deploy` ne fonctionne pas, remplacer dans `nixpacks.toml`:

```toml
[start]
cmd = "npx prisma db push --accept-data-loss && npm run start:prod"
```

**⚠️ ATTENTION:** `db push` écrase la base sans historique de migrations.

---

## 📋 CHECKLIST DE DÉPLOIEMENT

### Fichiers Présents sur GitHub

- [x] `prisma/schema.prisma`
- [x] `prisma/migrations/20251123174227_init/migration.sql`
- [x] `prisma/migrations/migration_lock.toml`
- [x] `nixpacks.toml` (avec `prisma migrate deploy`)
- [x] `package.json` (avec scripts Prisma)

### Configuration Railway

- [ ] ⚠️ Variable `DATABASE_URL` correcte
- [ ] ⚠️ Service PostgreSQL actif
- [ ] ⚠️ Migrations exécutées (à vérifier dans logs)

### Vérifications Post-Déploiement

- [x] ✅ Health check 200 OK
- [ ] ❌ Inscription fonctionne (500 error)

---

## 🎯 PROCHAINES ÉTAPES

### ÉTAPE 1: Récupérer les Logs Railway

**Commande:**
```bash
railway logs --follow
```

**Chercher spécifiquement:**
```
Running command: npx prisma migrate deploy
```

**Si présent:** Lire les erreurs Prisma qui suivent

**Si absent:** La commande n'est pas exécutée → problème de configuration Railway

---

### ÉTAPE 2: Selon le Résultat

#### Scénario A: `prisma migrate deploy` S'exécute Mais Échoue

**Action:** Analyser l'erreur Prisma et corriger

**Erreurs courantes:**
- `P1001`: Connexion DB impossible → Vérifier `DATABASE_URL`
- `P2021`: Table existe déjà → Faire `prisma migrate resolve` ou `db push`

#### Scénario B: `prisma migrate deploy` Ne S'exécute Pas

**Action:** Forcer l'exécution manuelle via Railway CLI:

```bash
railway run npx prisma migrate deploy
```

#### Scénario C: Migrations OK Mais Table Manquante

**Action:** Vérifier que `DATABASE_URL` pointe vers la bonne base:

```bash
railway run npx prisma db pull
```

Cela devrait montrer la structure actuelle de la DB.

---

## 📝 RÉSUMÉ

### ✅ CE QUI A ÉTÉ FAIT

1. ✅ Migration Prisma complète créée
2. ✅ `nixpacks.toml` configuré pour exécuter les migrations
3. ✅ Scripts `package.json` vérifiés
4. ✅ `migration_lock.toml` ajouté
5. ✅ Code poussé sur GitHub
6. ✅ Railway redéployé automatiquement
7. ✅ Backend démarre (health check OK)

### ❌ CE QUI NE FONCTIONNE PAS ENCORE

- ❌ Table `local_users` n'existe pas dans PostgreSQL Railway
- ❌ Inscription retourne 500 Internal Server Error

### 🔍 CAUSE PROBABLE

Les migrations Prisma ne s'exécutent **pas** ou **échouent silencieusement** sur Railway.

### 🚀 ACTION REQUISE

**Consulter les logs Railway pour voir si `npx prisma migrate deploy` s'exécute et identifier l'erreur exacte.**

```bash
railway logs --follow
```

---

**Dernière mise à jour:** 2025-11-23 17:50 EST
**Statut:** ⚠️ Déploiement partiel - Backend démarre mais DB vide

