# Incidents & Errors — Source of Truth

> **Dernière mise à jour**: 2026-01-08

---

## 🎯 Où trouver les erreurs ACTUELLES

| Type d'erreur | Source de vérité | Comment accéder |
|---------------|------------------|-----------------|
| **Build errors** | CI/CD Pipeline | GitHub Actions → Workflow runs |
| **Runtime errors** | Railway Logs | Railway Dashboard → Service → Logs |
| **Test failures** | CI/CD Pipeline | GitHub Actions → Test job |
| **Prisma/DB errors** | Railway Logs | Railway Dashboard → PostgreSQL → Logs |
| **Lint errors** | `npm run lint` | Exécuter localement |

---

## ⛔ Ce qui N'EST PAS une source de vérité

| Fichier/Artefact | Pourquoi ? |
|------------------|------------|
| `build-errors.txt` | Snapshot statique, devient obsolète immédiatement |
| `*.log` dans le repo | Non mis à jour, peut induire en erreur |
| Screenshots d'erreurs | Déconnectés du contexte actuel |
| Messages Slack/Discord | Éphémères, non versionnés |

---

## ✅ Bonnes pratiques

1. **Toujours vérifier les logs en temps réel** (CI, Railway)
2. **Ne jamais committer de fichiers d'erreurs statiques**
3. **Documenter les incidents dans des issues GitHub**, pas dans des fichiers
4. **Utiliser les outils de monitoring** (Sentry, Railway metrics)

---

## 📊 Commandes de diagnostic rapide

```bash
# Build local
npm run build

# Tests
npm test

# Lint
npm run lint

# Prisma status
npm run db:status

# Health check (si serveur local)
curl http://localhost:3001/healthz
```

---

## 🚨 En cas d'incident

1. **Ne pas paniquer**
2. **Consulter les logs Railway** (source de vérité)
3. **Vérifier le CI** (GitHub Actions)
4. **Créer une issue GitHub** si nécessaire
5. **Escalader** si critique (voir contacts dans `docs/ops/`)

---

## Historique

| Date | Modification |
|------|--------------|
| 2026-01-08 | Création — suppression de `build-errors.txt` obsolète |

