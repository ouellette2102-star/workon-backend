# 🚨 Variables d'Environnement OBLIGATOIRES pour Railway

## ⚠️ IMPORTANT

Le backend NestJS **NE DÉMARRERA PAS** sans ces variables configurées dans Railway.

---

## 🔑 Variables Minimales Requises

### 1. DATABASE_URL (OBLIGATOIRE)

Railway PostgreSQL génère automatiquement cette variable.

**Si vous utilisez Railway Postgres Plugin:**
```
DATABASE_URL=${{Postgres.DATABASE_URL}}
```

**Format manuel:**
```
DATABASE_URL=postgresql://user:password@hostname.railway.app:5432/railway
```

---

### 2. JWT_SECRET (OBLIGATOIRE)

Générer avec:
```bash
openssl rand -base64 32
```

**Exemple:**
```
JWT_SECRET=VotreCleSecrete32CharsMiniumumPourSecurite
```

---

### 3. CLERK_SECRET_KEY (OBLIGATOIRE si auth Clerk activée)

Obtenir depuis: https://dashboard.clerk.com/ → API Keys

**Format:**
```
CLERK_SECRET_KEY=sk_live_VOTRE_CLE_ICI
```

**OU** désactiver Clerk dans `src/app.module.ts` (commenter `ClerkModule`)

---

### 4. NODE_ENV (RECOMMANDÉ)

```
NODE_ENV=production
```

---

### 5. CORS_ORIGIN (RECOMMANDÉ pour sécurité)

Liste des domaines autorisés (séparés par des virgules):

```
CORS_ORIGIN=http://localhost:3000,https://votre-frontend.vercel.app
```

**OU** pour autoriser tous les domaines (INSÉCURE):
```
CORS_ORIGIN=*
```

---

## 📋 Configuration Railway - Étapes

### Option A: Interface Web Railway

1. Aller sur https://railway.app
2. Ouvrir votre projet `workon-backend`
3. Cliquer sur le service
4. Aller dans **Variables**
5. Ajouter chaque variable ci-dessus

### Option B: Railway CLI

```bash
railway variables set DATABASE_URL="postgresql://..."
railway variables set JWT_SECRET="your-secret-here"
railway variables set CLERK_SECRET_KEY="sk_live_..."
railway variables set NODE_ENV="production"
railway variables set CORS_ORIGIN="*"
```

---

## 🐛 Dépannage 502 Errors

Si vous obtenez une erreur 502 "Application failed to respond":

### 1. Vérifier les logs Railway

```bash
railway logs
```

Chercher des erreurs comme:
- `Cannot read property 'DATABASE_URL' of undefined`
- `JWT_SECRET is not defined`
- `Clerk initialization failed`

### 2. Vérifier que l'app écoute sur le bon port

L'app doit utiliser `process.env.PORT` (Railway le définit automatiquement).

✅ **CORRIGÉ** dans `main.ts`:
```typescript
await app.listen(parseInt(process.env.PORT || '8080', 10), '0.0.0.0');
```

### 3. Vérifier le health check

Une fois déployé, tester:
```
https://workon-backend-production-8908.up.railway.app/healthz
```

Doit retourner:
```json
{
  "status": "ok",
  "timestamp": "2025-11-22T..."
}
```

---

## 🚀 Ordre de Diagnostic

1. ✅ **Code push** → Déjà fait
2. ⚠️ **Configurer variables Railway** → À FAIRE
3. ⏳ **Attendre redéploiement** (2-3 minutes)
4. 🧪 **Tester `/healthz`**
5. 📋 **Vérifier logs Railway** si échec

---

## 📞 Si le Problème Persiste

Vérifier les logs Railway complets:
```bash
railway logs --follow
```

Chercher:
- Les logs de démarrage de l'app
- `✅ Application is running on: http://0.0.0.0:XXXX`
- `💚 Health check available at: /healthz`
- Toute erreur TypeScript ou runtime

---

## ✅ Checklist Finale

- [ ] `DATABASE_URL` configuré dans Railway
- [ ] `JWT_SECRET` configuré dans Railway
- [ ] `CLERK_SECRET_KEY` configuré dans Railway (ou Clerk désactivé)
- [ ] `NODE_ENV=production` configuré
- [ ] `CORS_ORIGIN` configuré (ou `*` temporairement)
- [ ] Code pushé vers GitHub (`git push origin main`)
- [ ] Railway a redéployé (check Dashboard)
- [ ] `/healthz` retourne 200 OK

---

**Une fois toutes les variables configurées, Railway redéploiera automatiquement et le backend démarrera correctement.**

