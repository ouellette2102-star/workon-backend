# WorkOn Backend API

Backend production-ready pour l'application WorkOn, construit avec NestJS, TypeScript, Prisma et PostgreSQL.

## 🚀 Fonctionnalités

- **Authentification JWT** avec refresh tokens
- **Gestion des missions** avec réservation atomique
- **Intégration Stripe** pour les paiements
- **Signature de contrats** avec nonce pour sécurité
- **Logging Winston** avec intégration Sentry
- **Rate limiting** et sécurité (Helmet)
- **Tests unitaires** (Jest) et E2E (Playwright)
- **Docker** et docker-compose pour développement
- **CI/CD** avec GitHub Actions

## 📋 Prérequis

- Node.js 20+
- PostgreSQL 16+
- npm ou yarn
- Docker et Docker Compose (optionnel, pour développement)

## 🛠️ Installation

### 1. Cloner et installer les dépendances

```bash
cd backend
npm install
```

### 2. Configuration de l'environnement

Copier le fichier `env.example` vers `.env` et configurer les variables :

```bash
cp env.example .env
```

Variables d'environnement requises :

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/workon?schema=public"

# JWT
JWT_SECRET="your-super-secret-jwt-key-min-32-chars"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-min-32-chars"

# Stripe (optionnel pour développement)
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
```

### 3. Base de données

#### Option A : Avec Docker Compose (recommandé pour développement)

```bash
docker-compose up -d postgres
```

#### Option B : PostgreSQL local

Créer une base de données PostgreSQL :

```sql
CREATE DATABASE workon;
```

### 4. Migrations Prisma

```bash
# Générer le client Prisma
npm run prisma:generate

# Appliquer les migrations
npm run migrate

# (Optionnel) Seed la base de données
npm run seed
```

### 5. Démarrer l'application

```bash
# Développement
npm run start:dev

# Production
npm run build
npm run start:prod
```

L'API sera disponible sur `http://localhost:3000/api/v1`

## 🐳 Docker

### Développement avec Docker Compose

```bash
# Démarrer tous les services (PostgreSQL + Backend)
docker-compose up

# Démarrer en arrière-plan
docker-compose up -d

# Voir les logs
docker-compose logs -f backend

# Arrêter
docker-compose down
```

### Build de l'image Docker

```bash
docker build -t workon-backend .
docker run -p 3000:3000 --env-file .env workon-backend
```

## 📚 API Endpoints

### Authentification

- `POST /auth/signup` - Inscription
- `POST /auth/login` - Connexion
- `POST /auth/refresh` - Rafraîchir le token
- `POST /auth/logout` - Déconnexion
- `GET /auth/me` - Obtenir l'utilisateur actuel

### Missions

- `POST /missions` - Créer une mission (EMPLOYER)
- `GET /missions` - Lister les missions (paginé, filtres géographiques)
- `GET /missions/:id` - Obtenir une mission
- `POST /missions/:id/reserve` - Réserver une mission (WORKER)
- `POST /missions/:id/accept` - Accepter une mission réservée (WORKER)
- `POST /missions/:id/cancel` - Annuler une mission

### Paiements

- `POST /payments/create-intent` - Créer un PaymentIntent Stripe (EMPLOYER)
- `POST /webhooks/stripe` - Webhook Stripe (idempotent)

### Contrats

- `GET /contracts/:missionId` - Obtenir le statut d'un contrat
- `GET /contracts/:missionId/create` - Créer ou obtenir un contrat
- `POST /contracts/:missionId/sign` - Signer un contrat (WORKER/EMPLOYER)

### Admin

- `POST /admin/reconcile-payments` - Réconciliation manuelle des paiements (ADMIN)

## 🧪 Tests

### Tests unitaires

```bash
npm run test
npm run test:watch
npm run test:cov
```

### Tests E2E

```bash
# Démarrer l'application en mode test
npm run start:dev

# Dans un autre terminal
npm run test:e2e
```

### Tests avec Playwright

```bash
# Installer Playwright
npx playwright install

# Lancer les tests E2E
npx playwright test
```

## 🔒 Sécurité

### Recommandations de production

1. **Secrets** : Utiliser un gestionnaire de secrets (AWS Secrets Manager, HashiCorp Vault, etc.)
2. **HTTPS** : Toujours utiliser HTTPS en production
3. **CORS** : Configurer `CORS_ORIGIN` avec les domaines autorisés uniquement
4. **Rate Limiting** : Ajuster `THROTTLE_TTL` et `THROTTLE_LIMIT` selon vos besoins
5. **Database** : Utiliser un utilisateur PostgreSQL avec permissions minimales :

```sql
-- Exemple de permissions recommandées
CREATE USER workon_app WITH PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE workon TO workon_app;
GRANT USAGE ON SCHEMA public TO workon_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO workon_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO workon_app;
```

## 📊 Monitoring

### Sentry

Pour activer Sentry, configurer `SENTRY_DSN` dans `.env` :

```env
SENTRY_DSN="https://..."
SENTRY_ENVIRONMENT="production"
```

### Health Check

- `GET /healthz` - Health check endpoint
- `GET /metrics` - Placeholder pour métriques Prometheus

### Logs

Les logs sont configurés avec Winston. En production, configurer des transports vers :
- Fichiers de logs
- Services de logging (Datadog, Loggly, etc.)
- Sentry pour les erreurs

## 🔌 Webhooks Stripe

### Configuration locale avec ngrok

1. Installer ngrok : `npm install -g ngrok` ou télécharger depuis [ngrok.com](https://ngrok.com)

2. Démarrer le backend localement

3. Exposer le webhook avec ngrok :

```bash
ngrok http 3000
```

4. Configurer le webhook dans Stripe Dashboard :
   - URL : `https://your-ngrok-url.ngrok.io/api/v1/webhooks/stripe`
   - Événements : `payment_intent.succeeded`, `payment_intent.payment_failed`

5. Copier le `Signing secret` et l'ajouter à `STRIPE_WEBHOOK_SECRET`

## 📝 Scripts disponibles

```bash
# Développement
npm run start:dev      # Démarrer en mode watch
npm run start:debug    # Démarrer en mode debug

# Production
npm run build          # Build l'application
npm run start:prod     # Démarrer en production

# Base de données
npm run migrate        # Appliquer les migrations
npm run migrate:deploy  # Déployer les migrations (production)
npm run migrate:reset  # Réinitialiser la base de données
npm run seed           # Seed la base de données
npm run prisma:studio  # Ouvrir Prisma Studio

# Tests
npm run test           # Tests unitaires
npm run test:watch     # Tests en mode watch
npm run test:cov       # Tests avec couverture
npm run test:e2e       # Tests E2E

# Qualité
npm run lint           # Linter le code
npm run format         # Formatter le code
```

## 🏗️ Architecture

```
backend/
├── src/
│   ├── auth/           # Module d'authentification
│   ├── missions/        # Module des missions
│   ├── payments/        # Module des paiements
│   ├── contracts/       # Module des contrats
│   ├── admin/           # Module admin
│   ├── prisma/          # Service Prisma
│   ├── logger/          # Service de logging
│   └── main.ts          # Point d'entrée
├── prisma/
│   ├── schema.prisma    # Schéma Prisma
│   └── seed.ts          # Script de seed
├── test/                # Tests E2E
├── e2e/                 # Tests Playwright
└── Dockerfile           # Configuration Docker
```

## ⚠️ Limitations et points d'attention

### Ce qui nécessite une configuration manuelle

1. **Stripe Connect** : L'intégration Stripe Connect (transfert vers les workers) n'est pas complètement implémentée. Placeholder dans `payments.service.ts`

2. **Recherche géographique** : La recherche par proximité utilise une approximation simple. Pour production, considérer :
   - PostGIS avec Prisma
   - Service de géolocalisation dédié (Google Maps API, Mapbox, etc.)

3. **Génération de contrats PDF** : Le champ `contractUrl` est un placeholder. Implémenter :
   - Génération de PDF (PDFKit, Puppeteer)
   - Stockage (S3, Cloud Storage)

4. **Notifications** : Placeholder pour notifications (email, push, SMS)

5. **Dead-letter queue** : Les webhooks en erreur sont enregistrés mais pas automatiquement retraités. Implémenter :
   - Système de queue (Bull, RabbitMQ)
   - Exponential backoff automatique

6. **Feature flags** : Non implémenté. Considérer LaunchDarkly, Unleash, etc.

### Vérifications manuelles recommandées

- [ ] Vérifier que tous les secrets sont configurés en production
- [ ] Tester les webhooks Stripe avec des événements réels
- [ ] Vérifier les permissions de la base de données
- [ ] Configurer les backups de la base de données
- [ ] Tester la réconciliation des paiements avec des données réelles
- [ ] Vérifier que les migrations Prisma sont appliquées correctement
- [ ] Configurer les alertes Sentry
- [ ] Tester le rate limiting avec des charges réelles
- [ ] Vérifier les logs en production

## 🤝 Contribution

1. Créer une branche : `git checkout -b feature/ma-feature`
2. Commiter les changements : `git commit -m 'Ajout de ma feature'`
3. Pousser vers la branche : `git push origin feature/ma-feature`
4. Ouvrir une Pull Request

## 📄 License

Propriétaire - WorkOn

## 🆘 Support

Pour toute question ou problème, ouvrir une issue sur le repository.

---

**Note** : Ce backend est conçu pour être déployé en production mais nécessite une configuration et des tests supplémentaires selon votre infrastructure et vos besoins spécifiques.

