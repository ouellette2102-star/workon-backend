# Production Monitoring — WorkOn

> **PR-I2** | Version 1.0 | Janvier 2026

## 📋 Vue d'ensemble

Ce document décrit la stratégie de monitoring et logging pour WorkOn en production.

---

## 🔧 Stack de Monitoring

| Composant | Outil | Usage |
|-----------|-------|-------|
| Error Tracking | Sentry | Exceptions, crashes, performance |
| Structured Logs | Winston + Console | Events, debug, audit |
| Request Tracing | Correlation ID | Traçabilité cross-services |
| Audit Trail | AuditLoggerService | Events métier critiques |
| Health Checks | /healthz, /readyz | Liveness/Readiness probes |

---

## 🚨 Sentry Configuration

### Variables d'environnement

```bash
# Railway / Production
SENTRY_DSN=https://xxx@sentry.io/xxx
SENTRY_ENVIRONMENT=production  # ou staging
```

### Fonctionnalités activées

- ✅ Error capture automatique (exceptions)
- ✅ Request handler (contexte HTTP)
- ✅ Tracing handler (performance)
- ✅ Breadcrumbs (audit events)
- ✅ Sampling adaptatif (10% prod, 100% dev)

### Configuration (`main.ts`)

```typescript
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: nodeEnv,
    tracesSampleRate: nodeEnv === 'production' ? 0.1 : 1.0,
  });
  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.tracingHandler());
  app.use(Sentry.Handlers.errorHandler()); // Fin de pipeline
}
```

### Vérification

1. Aller sur [Sentry Dashboard](https://sentry.io)
2. Sélectionner le projet WorkOn
3. Vérifier que des events apparaissent
4. Tester avec une erreur volontaire:

```bash
curl -X GET "https://api.workon.app/api/v1/test-sentry-error"
```

---

## 📝 Structured Logging

### Format des logs

Tous les logs sont en **JSON structuré** pour faciliter le parsing automatique.

```json
{
  "timestamp": "2026-01-08T10:30:00.000Z",
  "level": "info",
  "service": "workon-backend",
  "environment": "production",
  "correlationId": "abc-123-xyz",
  "message": "User consent accepted",
  "event": "consent.accepted",
  "userId": "user...789",
  "documentType": "TERMS",
  "version": "1.0"
}
```

### Configuration Winston (`app.module.ts`)

```typescript
WinstonModule.forRootAsync({
  useFactory: (config: ConfigService) => ({
    level: config.get('LOG_LEVEL', 'info'),
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json(),
    ),
    defaultMeta: {
      service: 'workon-backend',
      environment: nodeEnv,
    },
    transports: [
      new winston.transports.Console(),
    ],
  }),
});
```

### Niveaux de log

| Niveau | Usage | Exemple |
|--------|-------|---------|
| `error` | Erreurs critiques | Exception non gérée |
| `warn` | Avertissements | Consent check failed |
| `info` | Events importants | Consent accepted, Payment completed |
| `debug` | Debug détaillé | Query params, flow steps |
| `verbose` | Très verbeux | Internal state |

---

## 🔍 Correlation ID (Request Tracing)

Chaque requête reçoit un **Correlation ID** unique pour tracer son parcours.

### Middleware (`correlation-id.middleware.ts`)

```typescript
// Utilise X-Correlation-ID ou X-Request-ID du header si présent
const correlationId = 
  req.headers['x-correlation-id'] ||
  req.headers['x-request-id'] ||
  uuidv4();

req.correlationId = correlationId;
res.setHeader('X-Correlation-ID', correlationId);
```

### Usage dans les services

```typescript
// Accéder au correlationId depuis la Request
@Req() req: Request
const correlationId = req.correlationId;

// Avec AuditLoggerService
this.auditLogger.logBusinessEvent(
  'payment.initiated',
  { orderId, amount },
  correlationId,
);
```

### Filtrage des logs par requête

```bash
# Railway logs
railway logs | grep "abc-123-xyz"

# Sentry
# Chercher par tag correlation_id
```

---

## 📊 Audit Logger — Events Métier Critiques

### Service: `AuditLoggerService`

Service dédié aux événements métier critiques, avec:
- PII-safe: masquage automatique des données sensibles
- Structured: format JSON standardisé
- Sentry-integrated: breadcrumbs automatiques

### Events tracés

| Event | Déclenché par | Données |
|-------|---------------|---------|
| `consent.accepted` | Acceptation CGU/Privacy | userId, documentType, version |
| `consent.check_failed` | Accès sans consent | userId, missing docs |
| `payment.initiated` | Création paiement | userId, amount, missionId |
| `payment.completed` | Webhook Stripe success | paymentId, amount |
| `payment.failed` | Webhook Stripe failed | paymentId, error |
| `contract.created` | Nouveau contrat | contractId, parties |
| `contract.signed` | Signature contrat | contractId, signerId |
| `offer.created` | Nouvelle offre | offerId, missionId |
| `offer.accepted` | Offre acceptée | offerId, acceptedBy |
| `offer.declined` | Offre refusée | offerId, declinedBy |

### Usage

```typescript
import { AuditLoggerService } from '../common/audit/audit-logger.service';

@Injectable()
export class PaymentsService {
  constructor(private readonly auditLogger: AuditLoggerService) {}

  async createPayment(userId: string, amount: number) {
    // ... logic

    this.auditLogger.logBusinessEvent(
      AuditLoggerService.EVENTS.PAYMENT_INITIATED,
      {
        userId: this.auditLogger.maskId(userId),
        amount,
        currency: 'CAD',
        missionId: this.auditLogger.maskId(missionId),
      },
      req.correlationId,
    );
  }
}
```

### Masquage des IDs

```typescript
// Masque automatiquement pour les logs
this.auditLogger.maskId('user_abc123xyz789')
// → "user_abc...789"
```

---

## 🔒 PII Safety (Protection des données personnelles)

### Clés automatiquement redactées

```typescript
const SENSITIVE_KEYS = [
  'password', 'secret', 'token', 'apikey',
  'authorization', 'stripe_key', 'jwt',
  'cookie', 'session', 'credit_card',
  'card_number', 'cvv', 'ssn', 'sin',
  'email', 'phone', 'ip_address',
];
```

### Exemple de sanitization

```typescript
// Input
{ userId: 'user_123', email: 'test@test.com', amount: 100 }

// Output (sanitized)
{ userId: 'user_123', email: '[REDACTED]', amount: 100 }
```

### IP Address masking

```typescript
// Middleware correlation-id
sanitizeIp('192.168.1.100')
// → "192.168.xxx.xxx"
```

---

## 💚 Health Checks

### Endpoints

| Endpoint | Type | Vérifie |
|----------|------|---------|
| `/healthz` | Liveness | Process répond |
| `/readyz` | Readiness | DB + dependencies |
| `/api/v1/health` | API Health | Status détaillé |

### Usage Kubernetes/Railway

```yaml
# Health probe configuration
livenessProbe:
  httpGet:
    path: /healthz
    port: 8080
  initialDelaySeconds: 10
  periodSeconds: 30

readinessProbe:
  httpGet:
    path: /readyz
    port: 8080
  initialDelaySeconds: 5
  periodSeconds: 10
```

---

## 📈 Alerting Recommendations

### Sentry Alerts

Configurer dans Sentry Dashboard:

| Alerte | Condition | Action |
|--------|-----------|--------|
| Error spike | > 10 errors/min | Slack notification |
| New error | First occurrence | Email |
| P95 latency | > 2s | Slack warning |
| Consent failed | > 50/hour | Review required |

### Log-based Alerts (Railway/CloudWatch)

```bash
# Pattern d'erreur critique
"BUSINESS_ERROR" AND "payment.failed"

# Consent issues
"CONSENT_CHECK_FAILED" AND count > 100
```

---

## 🧪 Vérification du Monitoring

### Checklist de déploiement

- [ ] `SENTRY_DSN` configuré dans Railway
- [ ] `SENTRY_ENVIRONMENT` = production
- [ ] Logs visibles dans Railway
- [ ] Health checks répondent OK
- [ ] Test error apparaît dans Sentry

### Test manuel

```bash
# 1. Vérifier health
curl https://api.workon.app/healthz

# 2. Vérifier readiness (avec DB)
curl https://api.workon.app/readyz

# 3. Vérifier que le correlationId est retourné
curl -i https://api.workon.app/api/v1/health
# → X-Correlation-ID: abc-123-xyz

# 4. Déclencher une erreur test (si endpoint existe)
curl https://api.workon.app/api/v1/debug/test-error
# → Vérifier dans Sentry
```

---

## 📁 Structure des fichiers

```
src/
├── common/
│   ├── audit/
│   │   ├── audit.module.ts
│   │   └── audit-logger.service.ts
│   ├── middleware/
│   │   └── correlation-id.middleware.ts
│   └── filters/
│       └── http-exception.filter.ts
├── logger/
│   ├── logger.module.ts
│   └── logger.service.ts
└── main.ts (Sentry init)
```

---

## 📞 Contacts & Escalation

| Niveau | Condition | Contact |
|--------|-----------|---------|
| L1 | Error spike < 1h | On-call dev |
| L2 | Error spike > 1h | Tech lead |
| L3 | Data breach suspected | CTO + Legal |

---

## 📝 Historique des modifications

| Date | Version | Auteur | Description |
|------|---------|--------|-------------|
| 2026-01-08 | 1.0 | PR-I2 | Création initiale |

