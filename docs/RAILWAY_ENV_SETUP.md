# Configuration des variables d'environnement Railway

> **IMPORTANT** : Ne jamais committer ces valeurs dans le code source.
> Aller dans : Railway → workon-backend → Variables → Add Variable

---

## Variables à configurer dans Railway

### Stripe (REQUIS pour les paiements)

```
STRIPE_SECRET_KEY=sk_live_<your_stripe_secret_key>
STRIPE_WEBHOOK_SECRET=whsec_<your_webhook_secret>
STRIPE_PUBLISHABLE_KEY=pk_live_<your_stripe_publishable_key>
```

**Webhook Stripe à créer sur dashboard.stripe.com :**
- URL : `https://workon-backend-production-8908.up.railway.app/api/v1/payments-local/webhook`
- Événements : `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.canceled`, `charge.refunded`

---

### SendGrid (REQUIS pour les emails)

```
SENDGRID_API_KEY=SG.<your_sendgrid_api_key>
SENDGRID_FROM_EMAIL=noreply@workon.app
SENDGRID_FROM_NAME=WorkOn
```

> Vérifier que le domaine `workon.app` est authentifié dans SendGrid (Settings → Sender Authentication).

---

### Firebase Admin SDK (REQUIS pour push notifications)

Projet Firebase : `workonv1` (Project Number: 616267256012)

Générer depuis : [Firebase Console](https://console.firebase.google.com/project/workonv1/settings/serviceaccounts/adminsdk)
→ Comptes de service → Générer une nouvelle clé privée → Télécharger le JSON

Puis ajouter dans Railway :
```
FIREBASE_PROJECT_ID=workonv1
FIREBASE_CLIENT_EMAIL=<valeur "client_email" du JSON téléchargé>
FIREBASE_PRIVATE_KEY=<valeur "private_key" du JSON téléchargé>
```

Ou encoder tout le JSON en base64 :
```
FIREBASE_SERVICE_ACCOUNT_JSON=<base64 du fichier service-account.json>
```

---

### Application (vérifier que ces valeurs sont déjà dans Railway)

```
NODE_ENV=production
JWT_SECRET=<secret fort min 32 chars — déjà défini>
JWT_REFRESH_SECRET=<secret fort min 32 chars — déjà défini>
CORS_ORIGIN=*
ENABLE_SWAGGER_PROD=true
BCRYPT_ROUNDS=12
```

---

### Sentry (OPTIONNEL — monitoring erreurs)

```
SENTRY_DSN=<votre DSN depuis sentry.io>
SENTRY_ENVIRONMENT=production
```

---

## Comment ajouter dans Railway

1. Aller sur [railway.app](https://railway.app)
2. Cliquer sur votre projet **workon-backend**
3. Onglet **Variables**
4. Cliquer **New Variable** pour chaque ligne ci-dessus
5. Cliquer **Deploy** pour redéployer avec les nouvelles variables
