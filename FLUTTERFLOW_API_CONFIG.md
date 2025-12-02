# 🚀 Configuration API pour FlutterFlow - WorkOn Backend

## 📍 URL de Base

```
https://workon-backend-production-8908.up.railway.app
```

---

## 🔐 Routes d'Authentification

### 1️⃣ POST /api/v1/auth/register

**Créer un nouveau compte utilisateur**

#### Configuration FlutterFlow

| Champ | Valeur |
|-------|--------|
| **Method** | `POST` ⚠️ **PAS GET!** |
| **Base URL** | `https://workon-backend-production-8908.up.railway.app` |
| **Endpoint Path** | `/api/v1/auth/register` |
| **Content-Type** | `application/json` |

#### Body JSON

```json
{
  "email": "{{email}}",
  "password": "{{password}}",
  "firstName": "{{firstName}}",
  "lastName": "{{lastName}}",
  "role": "{{role}}"
}
```

#### Valeurs `role` valides

- `"WORKER"` - Travailleur
- `"EMPLOYER"` - Employeur
- `"CLIENT_RESIDENTIAL"` - Client résidentiel
- `"ADMIN"` - Administrateur

#### Réponse 201 (Succès)

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "clxxx...",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "WORKER",
    "createdAt": "2025-11-23T...",
    "updatedAt": "2025-11-23T..."
  }
}
```

#### Erreurs Possibles

| Code | Cause | Solution |
|------|-------|----------|
| 400 | Validation échouée | Vérifier format email, longueur password, etc. |
| 409 | Email déjà utilisé | Utiliser un autre email |
| 404 + "Cannot GET" | ⚠️ **Méthode GET au lieu de POST** | **Changer Method en POST dans FlutterFlow** |

---

### 2️⃣ POST /api/v1/auth/login

**Se connecter avec email/password**

#### Configuration FlutterFlow

| Champ | Valeur |
|-------|--------|
| **Method** | `POST` |
| **Base URL** | `https://workon-backend-production-8908.up.railway.app` |
| **Endpoint Path** | `/api/v1/auth/login` |
| **Content-Type** | `application/json` |

#### Body JSON

```json
{
  "email": "{{email}}",
  "password": "{{password}}"
}
```

#### Réponse 200 (Succès)

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "clxxx...",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "WORKER",
    "createdAt": "2025-11-23T...",
    "updatedAt": "2025-11-23T..."
  }
}
```

#### Erreurs Possibles

| Code | Cause |
|------|-------|
| 401 | Email ou mot de passe incorrect |
| 401 | Compte désactivé |

---

### 3️⃣ GET /api/v1/auth/me

**Récupérer le profil de l'utilisateur authentifié**

#### Configuration FlutterFlow

| Champ | Valeur |
|-------|--------|
| **Method** | `GET` |
| **Base URL** | `https://workon-backend-production-8908.up.railway.app` |
| **Endpoint Path** | `/api/v1/auth/me` |
| **Authorization** | `Bearer {{accessToken}}` |

⚠️ **IMPORTANT:** Cette route nécessite un token JWT valide!

#### Headers

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Réponse 200 (Succès)

```json
{
  "id": "clxxx...",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+33612345678",
  "city": "Paris",
  "role": "WORKER",
  "createdAt": "2025-11-23T...",
  "updatedAt": "2025-11-23T..."
}
```

#### Erreurs Possibles

| Code | Cause |
|------|-------|
| 401 | Token manquant ou invalide |
| 401 | Token expiré |

---

## 📚 Documentation Swagger en Production

**URL:** https://workon-backend-production-8908.up.railway.app/api/docs

Ouvrir dans un navigateur pour voir toutes les routes disponibles avec exemples.

---

## 🧪 Tests avec Postman/Thunder Client

### Test Register

```bash
POST https://workon-backend-production-8908.up.railway.app/api/v1/auth/register
Content-Type: application/json

{
  "email": "test.flutterflow@workon.app",
  "password": "WorkOn2025!",
  "firstName": "Flutter",
  "lastName": "Flow",
  "role": "WORKER"
}
```

### Test Login

```bash
POST https://workon-backend-production-8908.up.railway.app/api/v1/auth/login
Content-Type: application/json

{
  "email": "test.flutterflow@workon.app",
  "password": "WorkOn2025!
}
```

### Test Me (avec token)

```bash
GET https://workon-backend-production-8908.up.railway.app/api/v1/auth/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 🚨 Problèmes Courants dans FlutterFlow

### ❌ "Cannot GET /api/v1/auth/register"

**Cause:** Method configuré en GET au lieu de POST

**Solution:**
1. Ouvrir FlutterFlow → API Calls
2. Sélectionner l'appel `auth/register`
3. **Changer "Method" de GET vers POST**
4. Sauvegarder et tester

---

### ❌ CORS Error

**Cause:** CORS non configuré pour l'origine FlutterFlow

**Solution:** Ajouter dans Railway:
```
CORS_ORIGIN=*
```

(Ou spécifier le domaine FlutterFlow exact)

---

### ❌ 401 Unauthorized sur /auth/me

**Cause:** Token non envoyé ou invalide

**Solution:**
1. Récupérer le `accessToken` après login/register
2. Stocker dans FlutterFlow App State
3. Ajouter header `Authorization: Bearer {{accessToken}}`

---

## ✅ Checklist Configuration FlutterFlow

- [ ] Base URL: `https://workon-backend-production-8908.up.railway.app`
- [ ] `/api/v1/auth/register` → Method: **POST**
- [ ] `/api/v1/auth/login` → Method: **POST**
- [ ] `/api/v1/auth/me` → Method: **GET** + Header Authorization
- [ ] Content-Type: `application/json` sur toutes les routes POST
- [ ] Variables body correctement mappées: `{{email}}`, `{{password}}`, etc.
- [ ] `accessToken` stocké après register/login
- [ ] Header `Authorization` configuré pour routes authentifiées

---

## 🎯 Validation Finale

Une fois configuré correctement dans FlutterFlow:

1. ✅ Register doit retourner un `accessToken` et un objet `user`
2. ✅ Login doit retourner un `accessToken` et un objet `user`
3. ✅ Me (avec token) doit retourner les infos de l'utilisateur
4. ❌ Plus jamais de message "Cannot GET"

---

**Backend WorkOn est 100% opérationnel en production sur Railway! 🚀**

Le problème est uniquement dans la configuration FlutterFlow (Method GET au lieu de POST).

