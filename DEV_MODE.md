# 🛠️ Mode Développement WorkOn

Ce document explique comment travailler avec le backend WorkOn en mode développement local.

## 🎯 Qu'est-ce qui change en mode développement ?

En mode développement (`NODE_ENV !== 'production'`), certaines règles métier sont assouplies pour faciliter les tests locaux avec une base de données vide ou incomplete.

### Missions API - Règles assouplies en DEV

#### ✅ En DÉVELOPPEMENT

Les endpoints GET de missions (`/missions/available`, `/missions/worker/mine`, `/missions/feed`) :
- **N'exigent PAS** de profil Worker en base de données
- Retournent un **tableau vide** au lieu d'une erreur 403
- Affichent des **warnings clairs** dans les logs backend

```bash
[DEV WARNING] Worker profile not found for userId=cly...
[DEV MODE] User cly... has no Worker profile - returning empty missions list
```

#### ⚠️ En PRODUCTION

Les mêmes endpoints :
- **EXIGENT** un profil Worker valide en base de données
- Retournent une **erreur 403** si le profil n'existe pas
- Bloquent l'accès pour protéger les données

### Pourquoi cette distinction ?

En développement local :
- La base de données est souvent vide ou incomplète
- On veut tester l'UI sans créer manuellement tous les profils
- On veut voir le comportement avec des données vides (tableaux vides, états "Aucune mission")

En production :
- Les profils sont créés via l'onboarding complet
- La sécurité doit être stricte
- Pas d'accès sans profil valide

## 🚀 Démarrage rapide

### 1. Configuration initiale

```bash
# Backend
cd backend
cp .env.example .env  # Ajustez les variables
npm install
npx prisma generate
npx prisma db push
```

### 2. Seed de développement

Le seed crée des données de test :
- Un utilisateur worker (lié à votre Clerk ID)
- Un profil Worker complet
- Plusieurs missions de test (disponibles, réservées)
- Un employeur avec quelques missions

**⚠️ IMPORTANT** : Avant de lancer le seed, éditez `prisma/seed.dev.ts` :

```typescript
// Ligne 27 : Remplacez par votre vrai Clerk ID
const CLERK_USER_ID = 'user_YOUR_CLERK_ID_HERE'; // <-- ICI

// Ligne 30 : Remplacez par votre vrai email Clerk
const DEV_EMAIL = 'dev@workon.local'; // <-- ICI
```

**Comment trouver votre Clerk ID ?**

Option 1 - Logs backend :
```bash
npm run start:dev
# Connectez-vous via le frontend
# Regardez les logs : [JwtAuthGuard] Clerk verified: user.sub=user_abc123...
```

Option 2 - Dashboard Clerk :
- https://dashboard.clerk.com
- Users → Sélectionnez votre user → Copiez l'ID

Option 3 - Console navigateur :
```javascript
// Dans la console du frontend connecté
await window.Clerk.user.id
```

**Lancer le seed :**

```bash
cd backend
npm run seed:dev
```

Résultat attendu :
```
🌱 Seed de développement WorkOn...
✅ Utilisateur créé/mis à jour : dev@workon.local
✅ Profil Worker créé : cly...
✅ Mission créée : "Ménage appartement 3½" (CREATED)
✅ Mission créée : "Déménagement studio" (CREATED)
...
🎉 Seed de développement terminé avec succès !
```

### 3. Démarrer les serveurs

**Terminal 1 - Backend :**
```bash
cd backend
npm run start:dev
```

Vérifiez que vous voyez :
```
[Nest] ... LOG [RoutesResolver] MissionsController {/api/v1/missions}:
[Nest] ... LOG [RouterExplorer] Mapped {/api/v1/missions/available, GET}
[Nest] ... LOG [RouterExplorer] Mapped {/api/v1/missions/worker/mine, GET}
...
```

**Terminal 2 - Frontend :**
```bash
# À la racine du projet (pas dans backend/)
npm run dev
```

### 4. Tester

1. **Connectez-vous** via Clerk (http://localhost:3000/sign-in)

2. **Dashboard Worker** : http://localhost:3000/worker/dashboard
   - Devrait charger sans erreur 403
   - QuickStatsCard affiche vos stats
   - AvailableMissionsCard affiche les missions disponibles

3. **Page Missions** : http://localhost:3000/worker/missions
   - Liste des missions créées par le seed

## 🔍 Debugging

### Logs utiles en mode DEV

Le backend affiche des logs détaillés :

```bash
# Token reçu
[JwtAuthGuard] Token received: eyJhbGciOiJSUzI1Ni...

# Vérification Clerk
[JwtAuthGuard] Clerk verified: user.sub=cly..., role=WORKER

# Résolution du rôle
[ClerkAuthService] User verified: id=cly..., primaryRole=WORKER, effectiveRole=WORKER

# Vérification du guard
[RolesGuard] DEBUG: user.sub=cly..., user.role=WORKER, requiredRoles=WORKER, decision=ALLOWED

# Worker profile manquant (mode dev tolérant)
[DEV WARNING] Worker profile not found for userId=cly...
[DEV MODE] User cly... has no Worker profile - returning empty missions list
```

### Problèmes courants

#### ❌ Erreur 403 "Accès réservé aux workers WorkOn"

**Cause** : Profil Worker manquant en base de données

**Solution** :
1. Vérifiez que vous avez lancé `npm run seed:dev`
2. Vérifiez que `CLERK_USER_ID` dans `seed.dev.ts` correspond à votre vrai Clerk ID
3. Relancez le seed avec le bon ID

**Vérification** :
```bash
# Dans Prisma Studio
npx prisma studio

# Ou en SQL
# Vérifiez que votre user existe avec un Worker associé
SELECT u.id, u.email, u.clerkId, w.id as worker_id 
FROM users u 
LEFT JOIN workers w ON w."userId" = u.id 
WHERE u."clerkId" = 'user_YOUR_CLERK_ID';
```

#### ❌ Tableau vide de missions

**C'est normal en dev !** Si vous n'avez pas de profil Worker, le backend retourne un tableau vide au lieu d'un 403.

**Solution** : Lancez le seed pour créer des missions de test.

#### ❌ primaryRole NULL

**Cause** : L'onboarding n'a pas défini le `primaryRole`

**Solution** :
1. Allez sur http://localhost:3000/profile
2. Sélectionnez "Travailleur" comme rôle principal
3. Sauvegardez

Ou manuellement en DB :
```sql
UPDATE users SET "primaryRole" = 'WORKER' WHERE "clerkId" = 'user_YOUR_ID';
```

## 📝 Fichiers modifiés pour le mode DEV

### Backend

| Fichier | Changement | Raison |
|---------|-----------|--------|
| `src/common/utils/environment.util.ts` | Nouveau | Helpers pour détecter dev vs prod |
| `src/missions/missions.service.ts` | Modifié | Règles assouplies en dev |
| `prisma/seed.dev.ts` | Nouveau | Seed de développement |
| `package.json` | `seed:dev` script | Lancer le seed facilement |

### Logique ajoutée

#### Helper `getWorkerOrNull()`

```typescript
// En DEV : retourne null si worker manquant (log warning)
// En PROD : lance ForbiddenException si worker manquant

private async getWorkerOrNull(userId: string): Promise<{ id: string } | null> {
  const worker = await this.prisma.worker.findUnique({ where: { userId } });
  
  if (!worker && isDevEnvironment()) {
    devWarn(`Worker profile not found for userId=${userId}`);
    return null; // Tolérant en dev
  } else if (!worker) {
    throw new ForbiddenException('Accès réservé aux workers WorkOn'); // Strict en prod
  }
  
  return worker;
}
```

#### Endpoints modifiés

- `GET /missions/available` → Retourne `[]` en dev si pas de worker
- `GET /missions/worker/mine` → Retourne `[]` en dev si pas de worker
- `GET /missions/feed` → Retourne `[]` en dev si pas de worker
- `POST /missions/:id/reserve` → Exige un worker même en dev (besoin du `workerId`)

## ✅ Checklist avant de commit

Avant de pousser du code qui utilise le mode développement :

- [ ] Les conditions `isDevEnvironment()` sont bien présentes
- [ ] Le comportement en **production reste strict** (pas de sécurité affaiblie)
- [ ] Les logs de debug utilisent `devWarn()` ou `devLog()` (pas de pollution en prod)
- [ ] Les commentaires expliquent clairement le comportement dev vs prod
- [ ] Le `seed.dev.ts` est documenté et facile à personnaliser

## 🔒 Sécurité

**IMPORTANT** : Ce mode développement **NE DOIT PAS** affaiblir la sécurité en production.

### Garanties

✅ En production (`NODE_ENV === 'production'`) :
- Les guards `RolesGuard` et `JwtAuthGuard` restent actifs
- Profil Worker **obligatoire** pour accéder aux missions
- Erreurs 403 strictes si le profil est manquant
- Pas de logs de debug qui révèlent des infos sensibles

✅ La logique `isDevEnvironment()` ne peut pas être contournée :
- Basée sur `process.env.NODE_ENV`
- Variable d'environnement contrôlée par le déploiement
- Pas de paramètre query ou header qui peut forcer le mode dev

## 📚 Ressources

- **Prisma Schema** : `prisma/schema.prisma`
- **Seed principal** : `prisma/seed.ts` (si existant)
- **Seed dev** : `prisma/seed.dev.ts`
- **Guards** : `src/auth/guards/`
- **Missions Service** : `src/missions/missions.service.ts`

---

**Besoin d'aide ?** Vérifiez les logs du backend et du frontend. Les messages sont explicites en mode développement.

