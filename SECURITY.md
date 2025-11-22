# 🔒 Security Hardening - WorkOn Backend

Ce document décrit les mesures de sécurité implémentées dans le backend NestJS.

## ✅ Protections Activées

### 1. **Helmet** - Sécurisation des Headers HTTP

**Localisation:** `src/main.ts:41`

```typescript
app.use(helmet());
```

**Protection contre:**
- XSS (Cross-Site Scripting)
- Clickjacking
- MIME sniffing
- Information disclosure

**Headers ajoutés:**
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security` (HSTS)

---

### 2. **ValidationPipe Global** - Validation des Entrées

**Localisation:** `src/main.ts:71-80`

```typescript
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,              // Supprime les propriétés non déclarées
    forbidNonWhitelisted: true,   // Rejette si propriétés inconnues
    transform: true,              // Transforme automatiquement les types
  }),
);
```

**Protection contre:**
- Injection de propriétés malveillantes
- Mass assignment attacks
- Type confusion attacks

**Impact:**
- Toute propriété non définie dans les DTOs est **rejetée**
- Les requêtes avec des champs inattendus retournent une erreur 400

---

### 3. **Rate Limiting** - Protection DDoS

**Localisation:** `src/app.module.ts:35-52`

```typescript
ThrottlerModule.forRootAsync({
  useFactory: () => ({
    throttlers: [{ 
      ttl: 60000,  // 60 secondes
      limit: 20,   // 20 requêtes max
    }],
  }),
})
```

**Protection contre:**
- Attaques par force brute
- DDoS (Distributed Denial of Service)
- Credential stuffing
- API abuse

**Comportement:**
- Maximum **20 requêtes par IP par minute**
- HTTP 429 (Too Many Requests) si dépassement
- Applicable à **toutes les routes** via `APP_GUARD`

**Configuration:**
- Dev: `THROTTLE_LIMIT=20` (strict)
- Prod: Ajuster selon le trafic légitime attendu

---

### 4. **CORS Strict** - Origines Autorisées

**Localisation:** `src/main.ts:43-75`

```typescript
app.enableCors({
  origin: ['http://localhost:3000'],  // Frontend uniquement
  credentials: true,                  // Cookies/JWT autorisés
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-Request-ID'],
  maxAge: 3600,
});
```

**Protection contre:**
- CSRF (Cross-Site Request Forgery)
- Requêtes depuis des domaines non autorisés
- Attaques cross-origin

**⚠️ PRODUCTION:**
```bash
# .env
CORS_ORIGIN=https://workon.app,https://app.workon.ca
```

**Sécurité renforcée:**
- En production, `origin: '*'` est **interdit** (crash au démarrage)
- `credentials: true` nécessite une origine explicite

---

### 5. **Validation d'Environnement** - Startup Checks

**Localisation:** `src/config/env.validation.ts`

```typescript
export class EnvironmentVariables {
  @IsNotEmpty() DATABASE_URL: string;
  @IsNotEmpty() CLERK_SECRET_KEY: string;
  @IsNotEmpty() NODE_ENV: 'development' | 'production' | 'test';
  @IsOptional() STRIPE_SECRET_KEY?: string;
}
```

**Protection contre:**
- Démarrage avec une configuration incomplète
- Variables manquantes en production
- Typos dans les noms de variables

**Comportement:**
- **Crash au démarrage** si une variable requise manque
- Message d'erreur explicite avec la variable manquante
- Warnings pour les variables optionnelles mais recommandées

**Variables REQUISES:**
- `DATABASE_URL` - Connexion PostgreSQL
- `CLERK_SECRET_KEY` - Vérification JWT Clerk
- `NODE_ENV` - Environnement (dev/prod/test)

**Variables OPTIONNELLES (avec warning):**
- `STRIPE_SECRET_KEY` - Paiements
- `JWT_SECRET` - Auth locale
- `SENTRY_DSN` - Tracking erreurs

---

### 6. **Guards Sécurisés** - Authentification & Autorisation

#### JwtAuthGuard - Vérification de Token

**Localisation:** `src/auth/guards/jwt-auth.guard.ts`

**Sécurité CRITIQUE:**

```typescript
// ✅ BON: Rôle extrait du JWT vérifié
request.user = {
  sub: payload.sub,        // De Clerk/JWT signé
  role: payload.role,      // De Clerk/JWT signé
};

// ❌ INTERDIT: Rôle depuis le frontend
// const role = req.body.role;  // JAMAIS FAIRE ÇA
// const role = req.query.role; // JAMAIS FAIRE ÇA
```

**Protection contre:**
- Usurpation d'identité
- Privilege escalation
- Token replay attacks

**Workflow sécurisé:**
1. Extraction du token depuis `Authorization: Bearer <token>`
2. Vérification Clerk (signature + expiration)
3. Extraction du `userId` depuis le token vérifié
4. Récupération du `role` depuis la DB (source de vérité)
5. Assignation à `request.user` (trusté)

**⚠️ LOGS INTERDITS:**
- ❌ Ne jamais logger les tokens complets
- ❌ Ne jamais logger les Authorization headers
- ✅ Logger uniquement les IDs utilisateurs (audit)

---

#### RolesGuard - Vérification de Permissions

**Localisation:** `src/auth/guards/roles.guard.ts`

```typescript
@Roles(UserRole.WORKER)
canActivate(context: ExecutionContext): boolean {
  const requiredRoles = this.reflector.get('roles', context.getHandler());
  const user = request.user; // Assigné par JwtAuthGuard
  return requiredRoles.includes(user.role);
}
```

**Protection contre:**
- Accès non autorisé aux ressources
- Privilege escalation
- Unauthorized actions

**Comportement:**
- Vérifie le `user.role` (provenant du JWT vérifié)
- Retourne HTTP 403 si le rôle ne correspond pas
- Message clair: `"Accès réservé aux workers WorkOn"`

---

### 7. **Pas de Logs Sensibles** - Confidentialité

**Fichiers nettoyés:**
- ✅ `src/auth/guards/jwt-auth.guard.ts` - Aucun log de token
- ✅ `src/missions/missions.service.ts` - Logs dev-only
- ✅ `src/auth/clerk-auth.service.ts` - Logs minimaux

**Règles:**
- ❌ **JAMAIS** logger un token JWT complet
- ❌ **JAMAIS** logger un Authorization header
- ❌ **JAMAIS** logger des mots de passe (même hashés)
- ❌ **JAMAIS** logger des données sensibles (carte de crédit, SSN, etc.)

**Logs AUTORISÉS en dev:**
- ✅ User ID (pour debug)
- ✅ Email (non sensible si public)
- ✅ Status codes HTTP
- ✅ Request IDs

**Logs AUTORISÉS en prod:**
- ✅ User ID (audit)
- ✅ Actions métier (création mission, paiement)
- ✅ Erreurs (sans données sensibles)

---

## 📋 Checklist de Sécurité

### Avant chaque déploiement en production:

- [ ] `NODE_ENV=production` dans `.env`
- [ ] `CORS_ORIGIN` défini avec le domaine réel (pas `*`)
- [ ] `CLERK_SECRET_KEY` défini et valide
- [ ] `DATABASE_URL` pointe vers la DB de production
- [ ] `STRIPE_SECRET_KEY` défini (si paiements activés)
- [ ] `SENTRY_DSN` défini (tracking erreurs)
- [ ] Aucun `console.log` de token/password dans le code
- [ ] Rate limiting configuré (`THROTTLE_LIMIT`)
- [ ] SSL/TLS activé (HTTPS)
- [ ] Firewall configuré (DB accessible uniquement depuis backend)

### Tests de sécurité:

```bash
# 1. Validation d'environnement
cd backend
npm run start:dev
# Doit crasher si DATABASE_URL ou CLERK_SECRET_KEY manquent

# 2. Rate limiting
curl -X GET http://localhost:3001/api/v1/missions/available \
  -H "Authorization: Bearer TOKEN" \
  --repeat 25
# La 21ème requête doit retourner HTTP 429

# 3. CORS
curl -X GET http://localhost:3001/api/v1/missions/available \
  -H "Origin: https://malicious.com" \
  -H "Authorization: Bearer TOKEN"
# Doit être rejeté (pas de Access-Control-Allow-Origin)

# 4. Validation des entrées
curl -X POST http://localhost:3001/api/v1/missions \
  -H "Content-Type: application/json" \
  -d '{"title": "Test", "maliciousField": "hacked"}'
# Doit retourner HTTP 400 (forbidNonWhitelisted)
```

---

## 🚨 En Cas de Faille de Sécurité

1. **Isoler immédiatement** le service compromis
2. **Révoquer tous les tokens** Clerk/JWT actifs
3. **Changer les secrets** (`JWT_SECRET`, `CLERK_SECRET_KEY`, `STRIPE_SECRET_KEY`)
4. **Auditer les logs** pour identifier l'attaque
5. **Notifier les utilisateurs** si données personnelles compromises
6. **Patcher la faille** et déployer un fix en urgence
7. **Post-mortem** pour éviter la récurrence

---

## 📚 Ressources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [NestJS Security Best Practices](https://docs.nestjs.com/security/helmet)
- [Clerk Security](https://clerk.com/docs/security)
- [Stripe Security](https://stripe.com/docs/security)

---

**Dernière mise à jour:** Novembre 2024  
**Status:** ✅ Production-ready

