# Éléments nécessitant une configuration manuelle

Ce document liste les éléments qui nécessitent des décisions ou configurations manuelles de votre part, car ils dépendent de votre infrastructure, de vos besoins métier, ou de vos préférences.

## 🔐 Secrets et clés API

### Stripe
- **Clé secrète Stripe** : `STRIPE_SECRET_KEY`
  - Obtenir depuis le Dashboard Stripe
  - Utiliser la clé de test (`sk_test_...`) pour développement
  - Utiliser la clé de production (`sk_live_...`) pour production

- **Secret webhook Stripe** : `STRIPE_WEBHOOK_SECRET`
  - Obtenir après configuration du webhook dans Stripe Dashboard
  - Différent pour chaque endpoint webhook

- **Stripe Connect** : Si vous utilisez Stripe Connect pour transférer les paiements aux workers
  - Nécessite une configuration supplémentaire (onboarding des workers)
  - Voir `LIMITATIONS.md` section "Stripe Connect"

### Sentry
- **Sentry DSN** : `SENTRY_DSN`
  - Obtenir depuis votre projet Sentry
  - Laisser vide pour désactiver Sentry

## 🏢 Règles métier spécifiques

### Billing et taxes
- **Règles de facturation** : 
  - Commission de la plateforme (actuellement 10% en placeholder)
  - Calcul des taxes (TVA, TVQ, etc.)
  - Règles de remboursement
  - Politique de frais

### Vérification des employers
- **Politique de vérification** : 
  - Quels documents sont requis ?
  - Processus de vérification manuelle ou automatique ?
  - Quels champs dans `billingInfo` sont obligatoires ?

### Règles de réservation
- **Durée de réservation** : 
  - Durée par défaut (actuellement 15 minutes)
  - Durée maximale/minimale
  - Règles d'expiration

### Règles de paiement
- **Quand le paiement est débloqué** :
  - Immédiatement après acceptation ?
  - Après complétion de la mission ?
  - Système d'escrow ?

## 🌐 Configuration d'infrastructure

### Domaine et URLs
- **Domaine de production** : Pour configurer CORS et les webhooks
- **URL de callback webhook** : 
  - Production : `https://votre-domaine.com/api/v1/webhooks/stripe`
  - Staging : `https://staging.votre-domaine.com/api/v1/webhooks/stripe`

### Base de données
- **URL de connexion PostgreSQL** : `DATABASE_URL`
  - Format : `postgresql://user:password@host:port/database?schema=public`
  - Utilisateur avec permissions minimales (voir README.md)

### Stockage de fichiers
- **Service de stockage** : Pour les contrats PDF, avatars, etc.
  - AWS S3 (bucket, région, credentials)
  - Google Cloud Storage
  - Azure Blob Storage
  - Autre service

## 📋 Décisions de design

### Format des contrats
- **Template de contrat** : 
  - Contenu légal requis
  - Format et style
  - Langue(s) supportées

### Notifications
- **Canaux de notification** :
  - Email (service : SendGrid, Resend, AWS SES ?)
  - Push notifications (Firebase, OneSignal ?)
  - SMS (Twilio ?)
  - In-app seulement

### Recherche géographique
- **Solution choisie** :
  - PostGIS (extension PostgreSQL)
  - Service externe (Google Maps, Mapbox, Algolia)
  - Autre

## 🔧 Configuration CI/CD

### Déploiement staging
- **Pipeline de déploiement** : 
  - Service utilisé (GitHub Actions, GitLab CI, Jenkins, etc.)
  - Serveur de staging
  - Variables d'environnement de staging

### Déploiement production
- **Infrastructure** :
  - Cloud provider (AWS, GCP, Azure, autre)
  - Container orchestration (Kubernetes, ECS, autre)
  - Load balancer
  - Auto-scaling rules

## 📊 Monitoring et alertes

### Métriques à surveiller
- **Métriques critiques** :
  - Taux d'erreur
  - Temps de réponse
  - Taux de conversion (réservations, paiements)
  - Utilisation de la base de données

### Alertes
- **Seuils d'alerte** :
  - Quand alerter (erreurs, latence, etc.)
  - Canaux d'alerte (email, Slack, PagerDuty, etc.)

## 🧪 Tests

### Données de test
- **Seed data** :
  - Quels utilisateurs de test créer
  - Combien de missions de test
  - Données réalistes ou factices

### Environnement de test
- **Base de données de test** :
  - Base séparée ou réinitialisée à chaque run
  - Données de test persistantes ou éphémères

## 📝 Documentation

### Documentation API
- **Format** :
  - Swagger/OpenAPI (recommandé)
  - Postman Collection
  - Documentation markdown

### Documentation utilisateur
- **Guides** :
  - Guide pour les employers
  - Guide pour les workers
  - FAQ

## ✅ Checklist de configuration

Avant de déployer, assurez-vous d'avoir configuré :

- [ ] Toutes les clés API (Stripe, Sentry)
- [ ] Variables d'environnement de production
- [ ] Domaine et URLs de production
- [ ] Base de données de production avec backups
- [ ] Service de stockage de fichiers
- [ ] Webhooks Stripe configurés
- [ ] CORS avec domaines autorisés
- [ ] Permissions de base de données
- [ ] Règles métier documentées
- [ ] Pipeline CI/CD configuré
- [ ] Monitoring et alertes en place
- [ ] Documentation à jour

---

**Note** : Cette liste n'est pas exhaustive. D'autres éléments peuvent nécessiter une configuration selon vos besoins spécifiques.

