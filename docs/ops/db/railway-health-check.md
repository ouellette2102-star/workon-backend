# Railway DB Health Check — Runbook

> **Durée estimée**: 5 minutes  
> **Accès requis**: Railway CLI ou Dashboard + accès DB read-only  
> **Impact**: Aucun (lecture seule)

---

## Objectif

Vérifier que la base de données Railway est **synchronisée** avec les migrations Prisma définies dans le repo.

---

## Prérequis

- [ ] Accès au projet Railway (CLI ou Dashboard)
- [ ] Variable `DATABASE_URL` disponible (ou accès Railway Dashboard → Connect)
- [ ] Node.js installé localement
- [ ] Repo backend cloné et à jour (`git pull origin main`)

---

## Étape 1 — Vérifier le statut des migrations Prisma

```bash
# Depuis le répertoire backend/
cd backend

# Charger DATABASE_URL depuis Railway (ou .env.local)
export DATABASE_URL="postgresql://..."

# Vérifier le statut des migrations
npx prisma migrate status
```

### Résultats attendus

| Résultat | Signification | Action |
|----------|---------------|--------|
| ✅ `Database schema is up to date!` | DB synchronisée | Aucune action requise |
| ⚠️ `X migrations have not yet been applied` | Migrations manquantes | Voir Étape 4 |
| ❌ `The migrations table does not exist` | DB vierge ou corrompue | Escalader à l'équipe |

---

## Étape 2 — Lister les tables côté DB

### Option A: Via Railway Dashboard

1. Aller sur [Railway Dashboard](https://railway.app)
2. Sélectionner le projet → Service PostgreSQL
3. Onglet **Data** → voir les tables

### Option B: Via psql (CLI)

```bash
# Connexion à la DB Railway
psql $DATABASE_URL

# Lister toutes les tables
\dt

# Ou via une seule commande
psql $DATABASE_URL -c "\dt"
```

### Option C: Via script (recommandé)

```bash
# Depuis backend/
./scripts/ops/db/railway-health-check.sh
```

---

## Étape 3 — Comparer tables DB vs schéma Prisma

### Tables attendues (selon `prisma/schema.prisma`)

```
_prisma_migrations     (système Prisma)
audit_events
categories
client_orgs
compliance_documents
contracts
disputes
email_otp              ← Ajouté migration 20260101
invoices               ← Ajouté migration 20260101
local_missions
local_offers           ← Ajouté migration 20251228040000
local_users
messages
mission_events         ← Ajouté migration 20251228020000
mission_photos         ← Ajouté migration 20251228010000
missions
notifications
offers
payments
reviews
skills
stripe_events          ← Ajouté migration 20260101
subscriptions
user_profiles
users
worker_profiles
worker_skills
```

### Checklist de vérification

| Table | Présente en DB? | Migration source |
|-------|-----------------|------------------|
| `_prisma_migrations` | ☐ | (système) |
| `invoices` | ☐ | 20260101000000 |
| `stripe_events` | ☐ | 20260101000000 |
| `email_otp` | ☐ | 20260101000000 |
| `mission_events` | ☐ | 20251228020000 |
| `mission_photos` | ☐ | 20251228010000 |
| `local_offers` | ☐ | 20251228040000 |

---

## Étape 4 — Diagnostic et conclusion

### Cas 1: ✅ DB synchronisée

```
Toutes les tables présentes + prisma migrate status = "up to date"
→ Aucune action requise
```

### Cas 2: ⚠️ Migrations manquantes

```
prisma migrate status indique des migrations non appliquées
→ Planifier l'exécution de: npx prisma migrate deploy
→ NE PAS exécuter sans validation de l'équipe
```

### Cas 3: ❌ Tables manquantes mais migrations "up to date"

```
Incohérence critique
→ Escalader immédiatement
→ Possible: migrations appliquées mais tables supprimées manuellement
```

### Cas 4: ❌ Schéma local différent de la DB

```
Quelqu'un a fait "prisma db pull" et écrasé le schéma
→ NE PAS merger le schéma modifié
→ Revenir au schéma origin/main
```

---

## Commandes de référence (READ-ONLY)

```bash
# Statut migrations
npx prisma migrate status

# Lister tables (psql)
psql $DATABASE_URL -c "\dt"

# Compter les enregistrements par table (safe)
psql $DATABASE_URL -c "SELECT schemaname, relname, n_live_tup FROM pg_stat_user_tables ORDER BY n_live_tup DESC;"

# Vérifier structure d'une table spécifique
psql $DATABASE_URL -c "\d invoices"
```

---

## ⛔ Commandes INTERDITES en production

```bash
# NE JAMAIS EXÉCUTER SANS VALIDATION:
npx prisma migrate reset      # SUPPRIME TOUTES LES DONNÉES
npx prisma db push            # PEUT SUPPRIMER DES TABLES
npx prisma db pull            # ÉCRASE LE SCHÉMA LOCAL
DROP TABLE ...                # PERTE DE DONNÉES
```

---

## Contacts escalade

| Situation | Contact |
|-----------|---------|
| Migrations manquantes | Tech Lead |
| Tables supprimées | CTO + DBA |
| Incohérence critique | Incident channel |

---

## Historique

| Date | Auteur | Modification |
|------|--------|--------------|
| 2026-01-08 | Audit Bot | Création initiale |

