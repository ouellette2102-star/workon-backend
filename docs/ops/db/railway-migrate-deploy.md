# Railway Prisma Migrate Deploy — Runbook

> **Durée estimée**: 15-30 minutes (incluant vérifications)  
> **Accès requis**: Railway CLI/Dashboard + DB credentials + Deploy permissions  
> **Impact**: ⚠️ MODIFIE LA BASE DE DONNÉES — suivre la procédure strictement

---

## Objectif

Déployer les migrations Prisma manquantes sur Railway de manière **contrôlée et vérifiable**.

---

## ⚠️ AVERTISSEMENTS

```
⛔ NE JAMAIS exécuter sans avoir complété le PREFLIGHT CHECKLIST
⛔ NE JAMAIS exécuter pendant les heures de pointe
⛔ TOUJOURS avoir un snapshot/backup AVANT d'exécuter
⛔ TOUJOURS vérifier le POSTFLIGHT CHECKLIST après exécution
```

---

## Preflight Checklist

### 1. Backup / Snapshot Railway

- [ ] **Créer un snapshot de la DB Railway**
  
  ```
  Railway Dashboard → PostgreSQL Service → Settings → Create Snapshot
  ```
  
  Ou via CLI:
  ```bash
  railway run pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
  ```

- [ ] **Noter l'ID/nom du snapshot**: `________________`
- [ ] **Confirmer que le snapshot est complet** (vérifier la taille)

### 2. Comparer migrations local vs prod

```bash
# Local: lister les migrations
ls -la prisma/migrations/

# Prod: vérifier le statut
export DATABASE_URL="postgresql://..." # Railway prod URL
npx prisma migrate status
```

- [ ] **Migrations manquantes identifiées**:
  ```
  □ 20251228010000_add_mission_photos
  □ 20251228020000_add_mission_events
  □ 20251228030000_add_deleted_at_to_local_user
  □ 20251228040000_add_local_offers
  □ 20251228060000_add_picture_url_to_local_user
  □ 20260101000000_add_invoices_stripe_events_email_otp
  ```

### 3. Fenêtre de déploiement

- [ ] **Heure choisie**: `________________` (idéalement < 100 users actifs)
- [ ] **Trafic vérifié**: Railway Metrics ou Analytics
- [ ] **Équipe notifiée**: Slack/Discord channel ops

### 4. Validation du schéma local

```bash
# Valider que le schéma est correct
npx prisma validate

# Vérifier qu'il n'y a pas de drift
npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-migrations prisma/migrations
```

- [ ] **Schéma valide**: ✓
- [ ] **Pas de drift détecté**: ✓

---

## Procédure de déploiement

### Option A: Via Railway Service Command (Recommandé)

```bash
# Dans Railway Dashboard → Service → Settings → Deploy
# Ou via railway.json / nixpacks.toml

# Commande de déploiement:
npx prisma migrate deploy
```

### Option B: Via CLI locale (avec DATABASE_URL prod)

```bash
# ⚠️ S'assurer d'utiliser la bonne DATABASE_URL
echo $DATABASE_URL | head -c 30  # Vérifier que c'est Railway prod

# Exécuter le déploiement
npx prisma migrate deploy
```

### Option C: Via Railway CLI

```bash
# Connecter au projet Railway
railway link

# Exécuter dans le contexte Railway
railway run npx prisma migrate deploy
```

---

## Commande unique (copier-coller)

```bash
# PREFLIGHT: Vérifier le statut avant
npx prisma migrate status

# DEPLOY: Appliquer les migrations
npx prisma migrate deploy

# POSTFLIGHT: Vérifier le statut après
npx prisma migrate status
```

---

## Postflight Checklist

### 1. Vérifier le statut des migrations

```bash
npx prisma migrate status
```

- [ ] **Résultat**: `Database schema is up to date!`

### 2. Vérifier les tables critiques

```bash
# Via psql ou script
./scripts/ops/db/railway-health-check.sh

# Ou manuellement
psql $DATABASE_URL -c "\dt"
```

Tables à vérifier:

| Table | Présente? | Migration |
|-------|-----------|-----------|
| `_prisma_migrations` | ☐ | système |
| `local_users` | ☐ | init |
| `local_missions` | ☐ | init |
| `invoices` | ☐ | 20260101 |
| `stripe_events` | ☐ | 20260101 |
| `email_otp` | ☐ | 20260101 |
| `mission_events` | ☐ | 20251228020000 |
| `mission_photos` | ☐ | 20251228010000 |
| `local_offers` | ☐ | 20251228040000 |

### 3. Smoke test endpoints

```bash
# Health check
curl -s https://YOUR_RAILWAY_URL/healthz | jq .

# API santé
curl -s https://YOUR_RAILWAY_URL/api/v1/health | jq .

# Auth (si applicable)
curl -s -X POST https://YOUR_RAILWAY_URL/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}' | jq .status
```

- [ ] **Health check**: `200 OK`
- [ ] **API health**: `200 OK`
- [ ] **Auth endpoint répond** (même si 401): ✓

### 4. Vérifier les logs

```bash
# Railway Dashboard → Service → Logs
# Ou via CLI
railway logs --tail 50
```

- [ ] **Pas d'erreurs Prisma dans les logs**
- [ ] **Pas de "table does not exist"**
- [ ] **Pas de connection errors**

### 5. Tests automatisés (si pipeline disponible)

```bash
# Exécuter les tests
npm test

# Résultat attendu
# Test Suites: X passed, X total
# Tests: XXX passed, XXX total
```

- [ ] **Tests passent**: ✓

---

## Rollback

### Si les migrations échouent

```bash
# 1. NE PAS PANIQUER
# 2. Vérifier l'erreur exacte dans les logs
# 3. Si la DB est dans un état incohérent:

# Option A: Restaurer le snapshot Railway
Railway Dashboard → PostgreSQL → Settings → Restore Snapshot

# Option B: Restaurer depuis le backup SQL
psql $DATABASE_URL < backup_YYYYMMDD_HHMMSS.sql
```

### Si l'application ne fonctionne plus après migration

```bash
# 1. Vérifier les logs pour identifier l'erreur
railway logs --tail 100

# 2. Si c'est un problème de schéma:
#    - Restaurer le snapshot
#    - Revenir au code précédent (git revert)
#    - Investiguer la cause

# 3. Si c'est un problème de code (pas de schéma):
#    - Rollback du déploiement Railway
#    - git revert du commit problématique
```

---

## Checklist finale

```
PREFLIGHT
☐ Snapshot créé et vérifié
☐ Migrations manquantes identifiées
☐ Fenêtre low-traffic choisie
☐ Équipe notifiée
☐ Schéma validé

DEPLOY
☐ npx prisma migrate deploy exécuté
☐ Pas d'erreurs pendant l'exécution

POSTFLIGHT
☐ prisma migrate status = up to date
☐ Tables critiques présentes
☐ Health check OK
☐ Smoke tests OK
☐ Logs propres
☐ Tests passent (si applicable)

COMMUNICATION
☐ Équipe notifiée du succès
☐ Documentation mise à jour si nécessaire
```

---

## Contacts escalade

| Situation | Contact | Action |
|-----------|---------|--------|
| Migration échoue | Tech Lead | Analyser l'erreur |
| DB corrompue | CTO + DBA | Restaurer snapshot |
| Application down | Incident channel | Rollback immédiat |

---

## Historique des déploiements

| Date | Migrations appliquées | Opérateur | Résultat |
|------|----------------------|-----------|----------|
| YYYY-MM-DD | Liste des migrations | Nom | ✅/❌ |

---

## Annexe: Commandes de référence

```bash
# Statut des migrations
npx prisma migrate status

# Déployer les migrations (PROD SAFE)
npx prisma migrate deploy

# Valider le schéma
npx prisma validate

# Générer le client Prisma
npx prisma generate

# Voir le diff entre schéma et DB
npx prisma migrate diff \
  --from-schema-datasource prisma/schema.prisma \
  --to-schema-datamodel prisma/schema.prisma

# ⛔ DANGEREUX - NE PAS UTILISER EN PROD
# npx prisma migrate reset  ← SUPPRIME TOUTES LES DONNÉES
# npx prisma db push        ← PEUT SUPPRIMER DES TABLES
# npx prisma db pull        ← ÉCRASE LE SCHÉMA LOCAL
```

---

## Historique du document

| Date | Auteur | Modification |
|------|--------|--------------|
| 2026-01-08 | Ops Team | Création initiale |

