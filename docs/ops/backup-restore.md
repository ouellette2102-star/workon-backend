# PostgreSQL Backup & Restore — WorkOn (Railway)

> **PR-I1** | Version 1.0 | Janvier 2026

## 📋 Vue d'ensemble

Ce document décrit la stratégie de backup et les procédures de restauration pour la base de données PostgreSQL hébergée sur Railway.

---

## 🔒 Prérequis

### Variables d'environnement requises

```bash
# Railway Database (obtenir via Railway Dashboard)
DATABASE_URL=postgresql://user:password@host:port/database

# Backup Storage (S3-compatible)
BACKUP_S3_BUCKET=workon-backups
BACKUP_S3_ENDPOINT=https://s3.amazonaws.com  # ou autre provider S3-compatible
AWS_ACCESS_KEY_ID=<from-secrets-manager>
AWS_SECRET_ACCESS_KEY=<from-secrets-manager>
AWS_REGION=ca-central-1
```

> ⚠️ **JAMAIS** commiter ces valeurs. Utiliser un gestionnaire de secrets (Railway Secrets, AWS Secrets Manager, etc.)

### Outils requis

```bash
# PostgreSQL client tools
psql --version   # >= 14.0
pg_dump --version
pg_restore --version

# AWS CLI (pour S3)
aws --version    # >= 2.0

# Optionnel: Railway CLI
railway --version
```

---

## 🗄️ Stratégie de Backup

### Option A: Railway Native Backups (Recommandé)

Railway offre des backups automatiques pour les bases PostgreSQL sur les plans payants.

#### Configuration via Railway Dashboard

1. Aller sur [Railway Dashboard](https://railway.app/dashboard)
2. Sélectionner le projet WorkOn
3. Cliquer sur le service PostgreSQL
4. Onglet **Settings** → **Backups**
5. Activer **Automatic Backups**
6. Configurer la rétention (recommandé: 7 jours minimum)

#### Vérification

```bash
# Via Railway CLI
railway link
railway status
```

### Option B: Backups Manuels (pg_dump)

Pour un contrôle total ou si Railway Native n'est pas disponible.

#### Exécution manuelle

```bash
# Depuis le répertoire backend/
./scripts/backup.sh
```

#### Scheduling (Cron)

```bash
# Ajouter au crontab (Linux/Mac)
# Backup quotidien à 3h00 UTC
0 3 * * * /path/to/workon/backend/scripts/backup.sh >> /var/log/workon-backup.log 2>&1
```

#### GitHub Actions (CI/CD)

```yaml
# .github/workflows/backup.yml
name: Scheduled Backup
on:
  schedule:
    - cron: '0 3 * * *'  # 3h00 UTC daily
  workflow_dispatch:      # Manual trigger

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Install PostgreSQL client
        run: sudo apt-get install -y postgresql-client
      
      - name: Run backup
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          BACKUP_S3_BUCKET: ${{ secrets.BACKUP_S3_BUCKET }}
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          AWS_REGION: ${{ secrets.AWS_REGION }}
        run: ./scripts/backup.sh
```

---

## 📦 Procédure de Backup

### Script: `scripts/backup.sh`

Le script effectue:

1. ✅ Validation des variables d'environnement
2. ✅ Export avec `pg_dump` (format custom compressé)
3. ✅ Upload vers S3 avec timestamp
4. ✅ Nettoyage des fichiers temporaires
5. ✅ Rétention: suppression des backups > 30 jours

### Exécution

```bash
# Avec DATABASE_URL déjà exporté
./scripts/backup.sh

# Avec URL explicite (non recommandé en prod)
DATABASE_URL="postgresql://..." ./scripts/backup.sh

# Dry-run (vérifie sans exécuter)
DRY_RUN=1 ./scripts/backup.sh
```

### Sortie attendue

```
[2026-01-08 10:30:00] Starting backup...
[2026-01-08 10:30:01] Dumping database...
[2026-01-08 10:30:15] Backup size: 45 MB
[2026-01-08 10:30:16] Uploading to s3://workon-backups/workon_2026-01-08_103000.dump
[2026-01-08 10:30:25] Upload complete.
[2026-01-08 10:30:26] Cleaning up old backups (>30 days)...
[2026-01-08 10:30:27] Backup successful: workon_2026-01-08_103000.dump
```

---

## 🔄 Procédure de Restauration

### ⚠️ DANGER: Restauration = Perte de données actuelles

La restauration **ÉCRASE** la base de données cible. Toujours:

1. Confirmer l'environnement cible (JAMAIS prod par accident)
2. Faire un backup de l'état actuel AVANT restauration
3. Planifier une fenêtre de maintenance

### Script: `scripts/restore.sh`

```bash
# Restaurer depuis un fichier local
./scripts/restore.sh ./backups/workon_2026-01-08_103000.dump

# Restaurer depuis S3
./scripts/restore.sh s3://workon-backups/workon_2026-01-08_103000.dump

# Dry-run
DRY_RUN=1 ./scripts/restore.sh ./backups/workon_2026-01-08_103000.dump
```

### Étapes manuelles (si script non disponible)

```bash
# 1. Télécharger le backup depuis S3
aws s3 cp s3://workon-backups/workon_2026-01-08_103000.dump ./backup.dump

# 2. Vérifier le fichier
pg_restore --list ./backup.dump | head -20

# 3. BACKUP DE L'ÉTAT ACTUEL (OBLIGATOIRE)
pg_dump "$DATABASE_URL" -Fc -f ./pre-restore-backup.dump

# 4. Restaurer (clean = drop existing objects first)
pg_restore --clean --if-exists --no-owner --no-privileges \
  -d "$DATABASE_URL" ./backup.dump

# 5. Vérifier
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM users;"
```

---

## 🧪 Vérification post-restauration

### Checklist obligatoire

```bash
# 1. Tables présentes
psql "$DATABASE_URL" -c "\dt"

# 2. Compter les enregistrements critiques
psql "$DATABASE_URL" -c "
SELECT 
  (SELECT COUNT(*) FROM users) as users,
  (SELECT COUNT(*) FROM missions) as missions,
  (SELECT COUNT(*) FROM contracts) as contracts,
  (SELECT COUNT(*) FROM compliance_document) as consents;
"

# 3. Prisma migrations status
npx prisma migrate status

# 4. Smoke test API
curl -s http://localhost:3000/healthz | jq .
```

### Validation métier

- [ ] Utilisateurs peuvent se connecter
- [ ] Missions visibles
- [ ] Paiements historiques présents
- [ ] Consentements préservés

---

## 🚨 Procédure d'urgence

### Cas: Production corrompue, besoin restore immédiat

```bash
# 1. ACTIVER MODE MAINTENANCE (si possible)
# Via Railway: Settings → Disable deployments

# 2. Identifier le dernier backup valide
aws s3 ls s3://workon-backups/ --recursive | sort | tail -5

# 3. Télécharger
aws s3 cp s3://workon-backups/workon_YYYY-MM-DD_HHMMSS.dump ./emergency.dump

# 4. Backup état corrompu (pour analyse post-mortem)
pg_dump "$DATABASE_URL" -Fc -f ./corrupted-state.dump

# 5. Restaurer
pg_restore --clean --if-exists --no-owner -d "$DATABASE_URL" ./emergency.dump

# 6. Vérifier
npm run smoke:contracts

# 7. DÉSACTIVER MODE MAINTENANCE
# Via Railway: Settings → Enable deployments

# 8. DOCUMENTER L'INCIDENT
# Créer issue GitHub avec timeline
```

---

## 📊 Monitoring & Alertes

### Métriques à surveiller

| Métrique | Seuil alerte | Action |
|----------|--------------|--------|
| Backup age | > 24h | Vérifier cron/workflow |
| Backup size | < 1MB | Vérifier intégrité |
| Backup size delta | > 50% | Vérifier données |
| Restore test | Fail | Investigation immédiate |

### Recommandations

1. **Test de restauration mensuel** sur environnement staging
2. **Alertes** si backup échoue (via GitHub Actions notifications)
3. **Rétention** minimum 30 jours (90 jours recommandé pour conformité)

---

## 📁 Structure des fichiers backup

```
s3://workon-backups/
├── workon_2026-01-01_030000.dump
├── workon_2026-01-02_030000.dump
├── ...
└── workon_2026-01-08_030000.dump

Format: workon_YYYY-MM-DD_HHMMSS.dump
Type: PostgreSQL custom format (-Fc)
Compression: Intégrée (zlib)
```

---

## 🔐 Sécurité

### Secrets Management

| Secret | Stockage | Accès |
|--------|----------|-------|
| DATABASE_URL | Railway Secrets | Ops team only |
| AWS credentials | Railway Secrets / AWS IAM | Ops team only |
| S3 bucket | Privé, encrypted at rest | IAM policies |

### Encryption

- **En transit**: TLS (Railway enforce SSL)
- **Au repos**: S3 Server-Side Encryption (SSE-S3 ou SSE-KMS)

### Accès

```bash
# S3 Bucket Policy (exemple)
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {"AWS": "arn:aws:iam::ACCOUNT:role/workon-backup-role"},
      "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::workon-backups/*"
    }
  ]
}
```

---

## 📞 Contacts & Escalation

| Niveau | Contact | Délai |
|--------|---------|-------|
| L1 | On-call dev | < 15 min |
| L2 | Tech lead | < 30 min |
| L3 | CTO | < 1h |

---

## 📝 Historique des modifications

| Date | Version | Auteur | Description |
|------|---------|--------|-------------|
| 2026-01-08 | 1.0 | PR-I1 | Création initiale |

