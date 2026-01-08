# Prisma Database Policy

> **Audience**: Tous les développeurs et opérateurs  
> **Dernière mise à jour**: 2026-01-08  
> **Statut**: OBLIGATOIRE

---

## 🔴 RÈGLE #1 — NEVER RUN `prisma db pull` ON PROD

```
⛔⛔⛔ INTERDIT ⛔⛔⛔

npx prisma db pull                    ← ÉCRASE LE SCHÉMA LOCAL
npx prisma db pull --force            ← ENCORE PIRE
DATABASE_URL=prod npx prisma db pull  ← CATASTROPHE
```

### Pourquoi c'est dangereux ?

1. **Écrase le fichier `schema.prisma`** avec l'état de la DB
2. **Perd les commentaires, annotations, et organisation** du schéma
3. **Change les noms de modèles** (PascalCase → snake_case)
4. **Supprime les `@@map()`** qui maintiennent la compatibilité
5. **Peut supprimer des modèles** si les tables n'existent pas en DB

### Que faire à la place ?

```bash
# ✅ Vérifier le statut des migrations
npx prisma migrate status

# ✅ Appliquer les migrations manquantes
npx prisma migrate deploy

# ✅ Voir les différences sans modifier
npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma
```

---

## 🟡 RÈGLE #2 — COMMANDES AUTORISÉES PAR ENVIRONNEMENT

### Développement local (DEV)

| Commande | Autorisée | Usage |
|----------|-----------|-------|
| `prisma migrate dev` | ✅ | Créer de nouvelles migrations |
| `prisma migrate reset` | ✅ | Reset complet (supprime données) |
| `prisma db push` | ⚠️ | Prototypage uniquement |
| `prisma db pull` | ⚠️ | Jamais sur prod URL |
| `prisma studio` | ✅ | Interface graphique DB |
| `prisma generate` | ✅ | Générer le client |
| `prisma validate` | ✅ | Valider le schéma |

### Production / Staging (PROD)

| Commande | Autorisée | Usage |
|----------|-----------|-------|
| `prisma migrate deploy` | ✅ | Appliquer les migrations |
| `prisma migrate status` | ✅ | Vérifier le statut |
| `prisma validate` | ✅ | Valider le schéma |
| `prisma generate` | ✅ | Générer le client |
| `prisma migrate dev` | ⛔ | INTERDIT en prod |
| `prisma migrate reset` | ⛔ | INTERDIT en prod |
| `prisma db push` | ⛔ | INTERDIT en prod |
| `prisma db pull` | ⛔ | INTERDIT en prod |

---

## 🟢 RÈGLE #3 — UTILISER LES SCRIPTS NPM STANDARDISÉS

### Scripts disponibles

```bash
# Vérifier le statut des migrations
npm run db:status

# Déployer les migrations (PROD-SAFE)
npm run db:migrate:deploy

# Ouvrir Prisma Studio (DEV uniquement)
npm run db:studio

# Valider le schéma
npm run db:validate

# Générer le client Prisma
npm run db:generate
```

### Avantages

1. **Cohérence** — Mêmes commandes pour tous
2. **Documentation** — Les scripts sont auto-documentés
3. **Sécurité** — Pas de commandes dangereuses exposées
4. **Cross-platform** — Fonctionne Windows + Linux + macOS

---

## 🔒 RÈGLE #4 — WORKFLOW DE MIGRATION

### Créer une nouvelle migration (DEV)

```bash
# 1. Modifier prisma/schema.prisma
# 2. Créer la migration
npx prisma migrate dev --name descriptive_name

# 3. Vérifier le SQL généré
cat prisma/migrations/TIMESTAMP_descriptive_name/migration.sql

# 4. Commit
git add prisma/
git commit -m "feat(prisma): add descriptive_name migration"
```

### Déployer en production (PROD)

```bash
# 1. Vérifier le statut
npm run db:status

# 2. Créer un backup (voir runbook)
# 3. Déployer
npm run db:migrate:deploy

# 4. Vérifier
npm run db:status
```

---

## ⚠️ RÈGLE #5 — EN CAS D'ERREUR

### Si vous avez fait `prisma db pull` par erreur

```bash
# 1. NE PAS COMMIT
# 2. Restaurer le schéma
git checkout -- prisma/schema.prisma

# 3. Vérifier
git status
npx prisma validate
```

### Si vous avez commit un schéma corrompu

```bash
# 1. Identifier le commit
git log --oneline prisma/schema.prisma

# 2. Revert
git revert <commit-sha>

# 3. Ou reset (si pas encore pushé)
git reset --hard HEAD~1
```

### Si la prod est désynchronisée

```bash
# 1. NE PAS faire db pull
# 2. Vérifier le statut
npx prisma migrate status

# 3. Si migrations manquantes → les appliquer
npx prisma migrate deploy

# 4. Si tables manquantes → investiguer (voir runbook)
```

---

## 📋 CHECKLIST AVANT TOUTE ACTION DB

```
☐ Je sais sur quel environnement je travaille (DEV/STAGING/PROD)
☐ J'ai vérifié ma DATABASE_URL (echo $DATABASE_URL | head -c 30)
☐ J'utilise une commande autorisée pour cet environnement
☐ J'ai un backup/snapshot si c'est PROD
☐ Je suis prêt à rollback si nécessaire
```

---

## 🚨 CONTACTS EN CAS DE PROBLÈME

| Situation | Action |
|-----------|--------|
| Schéma local corrompu | `git checkout -- prisma/schema.prisma` |
| Doute sur une commande | Demander dans #dev-help |
| Erreur en prod | Escalader immédiatement |

---

## Historique

| Date | Modification |
|------|--------------|
| 2026-01-08 | Création initiale |

