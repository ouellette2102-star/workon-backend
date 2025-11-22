# 🔐 Auth & Users API - Usage Guide

## 📋 TABLE OF CONTENTS

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [API Endpoints](#api-endpoints)
4. [Testing](#testing)
5. [Swagger Documentation](#swagger-documentation)

---

## 🎯 OVERVIEW

The WorkOn backend now includes a complete **User + Auth layer** for email/password authentication (separate from Clerk).

### Features

- ✅ User registration with email/password
- ✅ JWT-based authentication
- ✅ User profile management
- ✅ Password hashing with bcrypt (12 rounds)
- ✅ Role-based access (worker, employer, residential_client)
- ✅ Health check endpoint
- ✅ Swagger API documentation

---

## 🏗️ ARCHITECTURE

### Modules

```
backend/src/
├── users/                          # Users Module
│   ├── dto/
│   │   ├── create-user.dto.ts     # User registration DTO
│   │   ├── update-user-profile.dto.ts  # Profile update DTO
│   │   └── user-response.dto.ts   # Safe user response (no password)
│   ├── users.controller.ts        # User endpoints (GET /users/me, PATCH /users/me)
│   ├── users.service.ts           # Business logic (hashing, validation)
│   ├── users.repository.ts        # Data access layer (Prisma)
│   └── users.module.ts
│
├── auth/                           # Auth Module
│   ├── dto/
│   │   ├── register.dto.ts        # Registration DTO (extends CreateUserDto)
│   │   ├── login.dto.ts           # Login DTO
│   │   └── auth-response.dto.ts   # JWT + user response
│   ├── strategies/
│   │   └── jwt-local.strategy.ts  # JWT validation strategy
│   ├── local-auth.controller.ts   # Auth endpoints (register, login, me)
│   ├── local-auth.service.ts      # Auth logic (JWT generation, password verification)
│   └── auth.module.ts             # Updated with LocalAuth
│
└── health/                         # Health Check Module
    ├── health.controller.ts       # GET /health endpoint
    └── health.module.ts
```

### Database Schema

```prisma
model LocalUser {
  id             String        @id @default(cuid())
  email          String        @unique
  hashedPassword String        // bcrypt hashed
  firstName      String
  lastName       String
  phone          String?
  city           String?
  role           LocalUserRole @default(worker)
  active         Boolean       @default(true)
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt
}

enum LocalUserRole {
  worker
  employer
  residential_client
}
```

---

## 🔌 API ENDPOINTS

### Authentication

#### 1. Register

```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "john.doe@example.com",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1 514 555 0100",
  "city": "Montréal",
  "role": "worker"
}
```

**Response (201):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "cly123abc...",
    "email": "john.doe@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+1 514 555 0100",
    "city": "Montréal",
    "role": "worker",
    "createdAt": "2024-11-18T18:00:00.000Z",
    "updatedAt": "2024-11-18T18:00:00.000Z"
  }
}
```

**Errors:**
- 400: Invalid input data
- 409: Email already registered

---

#### 2. Login

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "john.doe@example.com",
  "password": "SecurePassword123!"
}
```

**Response (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "cly123abc...",
    "email": "john.doe@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "worker",
    "createdAt": "2024-11-18T18:00:00.000Z",
    "updatedAt": "2024-11-18T18:00:00.000Z"
  }
}
```

**Errors:**
- 401: Invalid credentials
- 401: Account deactivated

---

#### 3. Get Current User (Protected)

```http
GET /api/v1/auth/me
Authorization: Bearer {accessToken}
```

**Response (200):**
```json
{
  "id": "cly123abc...",
  "email": "john.doe@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1 514 555 0100",
  "city": "Montréal",
  "role": "worker",
  "createdAt": "2024-11-18T18:00:00.000Z",
  "updatedAt": "2024-11-18T18:00:00.000Z"
}
```

**Errors:**
- 401: Unauthorized (missing/invalid token)

---

### Users

#### 4. Get My Profile (Protected)

```http
GET /api/v1/users/me
Authorization: Bearer {accessToken}
```

**Response (200):**
Same as `/auth/me`

---

#### 5. Update My Profile (Protected)

```http
PATCH /api/v1/users/me
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "firstName": "Jane",
  "phone": "+1 514 555 0200",
  "city": "Laval"
}
```

**Response (200):**
```json
{
  "id": "cly123abc...",
  "email": "john.doe@example.com",
  "firstName": "Jane",
  "lastName": "Doe",
  "phone": "+1 514 555 0200",
  "city": "Laval",
  "role": "worker",
  "createdAt": "2024-11-18T18:00:00.000Z",
  "updatedAt": "2024-11-18T18:05:00.000Z"
}
```

**Errors:**
- 401: Unauthorized
- 404: User not found

---

### Health Check

#### 6. Health Endpoint (Public)

```http
GET /api/v1/health
```

**Response (200):**
```json
{
  "status": "ok",
  "timestamp": "2024-11-18T18:00:00.000Z",
  "env": "development",
  "uptime": 123.456
}
```

---

## 🧪 TESTING

### Prerequisites

1. **Database configured:**
   ```bash
   # Update backend/.env
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/workon_dev
   ```

2. **Migrate database:**
   ```bash
   cd backend
   npx prisma db push
   ```

3. **Start backend:**
   ```bash
   npm run start:dev
   ```

---

### Test with cURL

#### 1. Register a new user

```bash
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "worker@test.com",
    "password": "Test123456!",
    "firstName": "Alex",
    "lastName": "Worker",
    "phone": "+1 514 555 0100",
    "city": "Montréal",
    "role": "worker"
  }'
```

**Save the `accessToken` from the response!**

---

#### 2. Login

```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "worker@test.com",
    "password": "Test123456!"
  }'
```

---

#### 3. Get current user (protected)

```bash
# Replace {TOKEN} with your accessToken
curl -X GET http://localhost:3001/api/v1/auth/me \
  -H "Authorization: Bearer {TOKEN}"
```

---

#### 4. Update profile

```bash
curl -X PATCH http://localhost:3001/api/v1/users/me \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Alexandre",
    "city": "Laval"
  }'
```

---

#### 5. Health check

```bash
curl -X GET http://localhost:3001/api/v1/health
```

---

### Test with HTTPie

```bash
# Register
http POST :3001/api/v1/auth/register \
  email=worker@test.com \
  password=Test123456! \
  firstName=Alex \
  lastName=Worker \
  role=worker

# Login
http POST :3001/api/v1/auth/login \
  email=worker@test.com \
  password=Test123456!

# Get current user
http GET :3001/api/v1/auth/me \
  "Authorization: Bearer {TOKEN}"

# Update profile
http PATCH :3001/api/v1/users/me \
  "Authorization: Bearer {TOKEN}" \
  firstName=Alexandre \
  city=Laval

# Health check
http GET :3001/api/v1/health
```

---

## 📚 SWAGGER DOCUMENTATION

Swagger UI is available in development mode:

```
http://localhost:3001/api/docs
```

**Features:**
- ✅ Interactive API testing
- ✅ Schema validation
- ✅ Example requests/responses
- ✅ Bearer token authentication
- ✅ Try out endpoints directly from the browser

---

## 🔒 SECURITY NOTES

### Password Security

- ✅ Passwords are hashed with bcrypt (12 rounds)
- ✅ Passwords are NEVER logged or exposed in responses
- ✅ `UserResponseDto` uses `@Exclude()` to prevent password leaks

### JWT Tokens

- ✅ Tokens are signed with `JWT_SECRET` (from `.env`)
- ✅ Default expiration: 7 days (configurable via `JWT_EXPIRATION`)
- ✅ Payload includes: `{ sub: userId, role, provider: 'local' }`

### Role-Based Access

- ✅ `JwtAuthGuard` validates tokens and extracts user info
- ✅ `RolesGuard` can be used to restrict access by role
- ✅ User roles: `worker`, `employer`, `residential_client`

---

## 🚀 NEXT STEPS

### For Development

1. **Create test users:**
   ```bash
   curl -X POST http://localhost:3001/api/v1/auth/register \
     -H "Content-Type: application/json" \
     -d '{ /* user data */ }'
   ```

2. **Test protected endpoints:**
   - Use the JWT token from login/register
   - Add `Authorization: Bearer {token}` header

3. **Explore Swagger:**
   - Visit http://localhost:3001/api/docs
   - Click "Authorize" and paste your JWT token

### For Production

1. **Set strong `JWT_SECRET`:**
   ```bash
   JWT_SECRET=$(openssl rand -base64 32)
   ```

2. **Configure token expiration:**
   ```bash
   JWT_EXPIRATION=7d  # Or 15m, 1h, etc.
   ```

3. **Enable HTTPS:**
   - Tokens should only be transmitted over HTTPS in production

4. **Monitor failed login attempts:**
   - Consider adding rate limiting per user (not just per IP)

---

## 📝 NOTES

- **Separate from Clerk:** This local auth system is independent of Clerk authentication
- **Development friendly:** Works without external services
- **Production ready:** Bcrypt, JWT, validation, proper error handling
- **TypeScript strict:** Full type safety with DTOs and entities

---

**Questions?** Check the Swagger docs at `/api/docs` or refer to the source code in `backend/src/users` and `backend/src/auth`.

