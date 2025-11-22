# Limitations et Points d'Attention

Ce document liste les limitations connues, les placeholders, et les éléments nécessitant une configuration manuelle ou une implémentation supplémentaire.

## 🔴 Éléments nécessitant une implémentation complète

### 1. Stripe Connect
**Statut** : Placeholder  
**Fichier** : `src/payments/payments.service.ts`

L'intégration Stripe Connect pour transférer les paiements aux workers n'est pas complètement implémentée. Les commentaires dans le code indiquent où ajouter :
- `application_fee_amount` (commission de la plateforme)
- `transfer_data.destination` (compte Stripe Connect du worker)

**Action requise** :
1. Implémenter l'onboarding Stripe Connect pour les workers
2. Stocker les `stripeConnectAccountId` dans le profil worker
3. Activer les transferts lors de la création du PaymentIntent

### 2. Recherche géographique avancée
**Statut** : Approximation simple  
**Fichier** : `src/missions/missions.service.ts`

La recherche par proximité utilise une approximation avec bounding box. Pour production, considérer :

**Options recommandées** :
- **PostGIS** : Extension PostgreSQL pour géolocalisation
  ```sql
  CREATE EXTENSION postgis;
  ```
  Puis utiliser des requêtes avec `ST_Distance` dans Prisma

- **Service externe** : Google Maps API, Mapbox, Algolia Places
  - Plus simple à implémenter
  - Coûts associés selon le volume

**Action requise** :
- Choisir une solution selon les besoins
- Implémenter la recherche avec la solution choisie
- Ajouter des tests pour la recherche géographique

### 3. Génération et stockage de contrats PDF
**Statut** : Placeholder  
**Fichier** : `src/contracts/contracts.service.ts`

Le champ `contractUrl` est un placeholder. Nécessite :

**Génération PDF** :
- **PDFKit** : Génération de PDF en Node.js
- **Puppeteer** : Rendu HTML vers PDF (plus flexible)
- **Template engine** : Handlebars, Mustache pour le contenu

**Stockage** :
- **AWS S3** : Recommandé pour production
- **Google Cloud Storage** : Alternative
- **Azure Blob Storage** : Alternative

**Action requise** :
1. Créer un template de contrat
2. Implémenter la génération PDF
3. Configurer le stockage cloud
4. Mettre à jour `contractUrl` lors de la création

### 4. Système de notifications
**Statut** : Non implémenté

Placeholders dans le code pour notifier :
- Employer lors d'une réservation
- Worker lors d'un paiement
- Les deux lors d'une signature de contrat

**Options recommandées** :
- **Email** : SendGrid, Resend, AWS SES
- **Push notifications** : Firebase Cloud Messaging, OneSignal
- **SMS** : Twilio, AWS SNS
- **In-app** : Table `Notification` déjà créée dans le schéma

**Action requise** :
1. Choisir les canaux de notification
2. Implémenter les services de notification
3. Ajouter les notifications aux événements critiques

### 5. Dead-letter queue pour webhooks
**Statut** : Enregistrement seulement  
**Fichier** : `src/payments/payments.service.ts`

Les webhooks en erreur sont enregistrés dans `webhook_events` mais pas automatiquement retraités.

**Options recommandées** :
- **Bull Queue** : Queue Redis pour retry avec exponential backoff
- **RabbitMQ** : Alternative plus robuste
- **AWS SQS** : Si déployé sur AWS

**Action requise** :
1. Implémenter un système de queue
2. Ajouter exponential backoff
3. Créer un worker pour retraiter les échecs
4. Ajouter des alertes pour les échecs répétés

### 6. Feature flags
**Statut** : Non implémenté

Pour gérer les déploiements progressifs et les tests A/B.

**Options recommandées** :
- **LaunchDarkly** : Solution SaaS complète
- **Unleash** : Open-source, auto-hébergé
- **Simple** : Table en DB avec cache Redis

**Action requise** :
1. Choisir une solution
2. Implémenter le middleware/guard
3. Ajouter les flags aux fonctionnalités critiques

## 🟡 Éléments nécessitant une configuration manuelle

### 1. Variables d'environnement de production
Toutes les variables dans `env.example` doivent être configurées avec des valeurs de production :
- `JWT_SECRET` et `JWT_REFRESH_SECRET` : Générer avec `openssl rand -base64 32`
- `STRIPE_SECRET_KEY` : Clé de production Stripe
- `STRIPE_WEBHOOK_SECRET` : Secret du webhook de production
- `DATABASE_URL` : URL de la base de données de production
- `SENTRY_DSN` : DSN Sentry pour le monitoring

### 2. Permissions de base de données
Créer un utilisateur PostgreSQL avec permissions minimales (voir README.md section Sécurité).

### 3. Configuration CORS
Ajuster `CORS_ORIGIN` avec les domaines autorisés uniquement (pas de wildcard en production).

### 4. Rate limiting
Ajuster `THROTTLE_TTL` et `THROTTLE_LIMIT` selon :
- Le type d'endpoint
- Le volume attendu
- La capacité du serveur

### 5. Logging en production
Configurer les transports Winston pour :
- Fichiers de logs rotatifs
- Service de logging externe (Datadog, Loggly, etc.)
- Intégration Sentry pour les erreurs

### 6. Backups de base de données
Mettre en place des backups automatiques :
- PostgreSQL : `pg_dump` avec cron
- Cloud : Backups automatiques (AWS RDS, Google Cloud SQL, etc.)

## 🟢 Améliorations recommandées (non critiques)

### 1. Cache Redis
Pour améliorer les performances :
- Cache des requêtes fréquentes (liste des missions)
- Cache des sessions utilisateur
- Rate limiting distribué

### 2. Monitoring avancé
- Métriques Prometheus complètes
- Dashboards Grafana
- Alertes sur métriques critiques

### 3. Tests de charge
- Utiliser k6, Artillery, ou JMeter
- Identifier les goulots d'étranglement
- Optimiser selon les résultats

### 4. Documentation API
- Swagger/OpenAPI avec `@nestjs/swagger`
- Exemples de requêtes
- Schémas de réponse

### 5. Internationalisation
Si nécessaire :
- Support multi-langues
- Formatage des dates/devises
- Messages d'erreur traduits

## ✅ Checklist de déploiement

Avant de déployer en production, vérifier :

- [ ] Tous les secrets sont configurés (pas de valeurs par défaut)
- [ ] Les migrations Prisma sont testées et appliquées
- [ ] Les webhooks Stripe sont configurés et testés
- [ ] Les permissions de la base de données sont correctes
- [ ] CORS est configuré avec les domaines autorisés uniquement
- [ ] Rate limiting est ajusté selon les besoins
- [ ] Les logs sont configurés et monitorés
- [ ] Les backups de base de données sont en place
- [ ] Sentry est configuré et fonctionnel
- [ ] Les tests passent (unitaires + E2E)
- [ ] Le health check répond correctement
- [ ] Le Dockerfile est testé et fonctionne
- [ ] Les variables d'environnement sont documentées
- [ ] Un plan de rollback est en place

## 📝 Notes additionnelles

- Le schéma Prisma peut être étendu selon les besoins (notifications, reviews, etc.)
- Les tests E2E nécessitent une base de données de test séparée
- Les webhooks Stripe doivent être testés avec Stripe CLI en local avant production
- Considérer l'ajout d'un système de versioning d'API si nécessaire

