# PR3: Production Guardrails

## Résumé

Cette PR ajoute des protections essentielles pour la production :

- **Validation des variables d'environnement** au démarrage
- **Endpoints de santé** pour les health checks (liveness/readiness)
- **Standardisation des erreurs API** via un Global Exception Filter
- **Traçabilité des requêtes** avec X-Request-ID

## Variables d'Environnement

### Requises (tous environnements)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | URL de connexion PostgreSQL |
| `NODE_ENV` | `development`, `production`, ou `test` |

### Requises en Production

| Variable | Description |
|----------|-------------|
| `JWT_SECRET` | Secret pour signer les JWT |
| `JWT_REFRESH_SECRET` | Secret pour les refresh tokens |
| `CLERK_SECRET_KEY` | Clé API Clerk |
| `STRIPE_SECRET_KEY` | Clé API Stripe (sinon warning) |
| `STRIPE_WEBHOOK_SECRET` | Secret webhook Stripe (sinon warning) |
| `FRONTEND_URL` ou `CORS_ORIGIN` | Origines autorisées pour CORS |

### Optionnelles

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | Port d'écoute |
| `SENTRY_DSN` | - | DSN Sentry pour error tracking |
| `THROTTLE_LIMIT` | `20` | Limite de requêtes par minute |
| `THROTTLE_TTL` | `60` | Fenêtre de rate limiting (secondes) |

## Endpoints de Santé

### GET /healthz (Liveness Probe)

Vérifie que l'application est en vie.

**Response 200:**
```json
{
  "status": "ok",
  "timestamp": "2024-12-26T12:00:00.000Z"
}
```

### GET /readyz (Readiness Probe)

Vérifie que l'application est prête à recevoir du trafic (DB connectée).

**Response 200:**
```json
{
  "status": "ready",
  "timestamp": "2024-12-26T12:00:00.000Z",
  "checks": { "database": "ok" }
}
```

**Response 503:**
```json
{
  "status": "not_ready",
  "timestamp": "2024-12-26T12:00:00.000Z",
  "checks": { "database": "error" }
}
```

### GET /api/v1/health

Endpoint health avec informations détaillées (uptime, env).

### GET /api/v1/health/ready

Alias de /readyz avec documentation Swagger.

## Format des Erreurs API

Toutes les erreurs sont standardisées :

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "path": "/api/v1/missions",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2024-12-26T12:00:00.000Z"
}
```

**Sécurité:** Les stacktraces ne sont jamais exposées en production.

## X-Request-ID

Chaque requête reçoit un identifiant unique :

1. Si le header `X-Request-ID` est présent → utilisé tel quel
2. Sinon → UUID v4 généré automatiquement

Le header `X-Request-ID` est inclus dans la réponse et dans les logs.

## Configuration Railway

Pour Railway, configurez les health checks :

```
Healthcheck Path: /healthz
Healthcheck Timeout: 5s
```

## Tests

```bash
# Liveness
curl http://localhost:8080/healthz

# Readiness
curl http://localhost:8080/readyz

# Health détaillé
curl http://localhost:8080/api/v1/health

# Test X-Request-ID
curl -H "X-Request-ID: my-trace-id" http://localhost:8080/api/v1/health
```

## Rollback

En cas de problème :

```bash
git revert <commit-hash>
git push origin main
```

Les changements sont 100% backward compatible.

## Fichiers Modifiés

- `src/main.ts` - RequestId, GlobalFilter, /readyz
- `src/health/health.controller.ts` - Endpoint /ready
- `src/health/health.module.ts` - Import PrismaModule
- `src/common/filters/http-exception.filter.ts` - Global filter (NEW)
- `src/common/filters/index.ts` - Export (NEW)
- `docs/PR3_PROD_GUARDRAILS.md` - Cette doc (NEW)

