# 🔍 DIAGNOSTIC - ERREUR 500 SUR `/api/v1/auth/register`

## 📋 CONTEXTE

**Endpoint:** `POST https://workon-backend-production-8908.up.railway.app/api/v1/auth/register`

**JSON envoyé:**
```json
{
  "email": "math.test1@gmail.com",
  "password": "Workon2025",
  "firstName": "Math",
  "lastName": "Ouellette",
  "phone": "514 555 5555",
  "city": "Repentigny",
  "role": "worker"
}
```

**Réponse:** `500 Internal Server Error`

---

## 🔎 ANALYSE DU FLUX D'EXÉCUTION

### 1️⃣ AuthController (`src/auth/auth.controller.ts`)

```typescript
@Post('register')
async register(@Body() registerDto: RegisterDto): Promise<AuthResponseDto> {
  return this.localAuthService.register(registerDto);
}
```

**Validation:** ✅ Le contrôleur appelle correctement `localAuthService.register()`

---

### 2️⃣ LocalAuthService (`src/auth/local-auth.service.ts`)

```typescript
async register(registerDto: RegisterDto) {
  this.logger.log(`Registering new user: ${registerDto.email}`);
  
  // Create user (UsersService handles validation + hashing)
  const user = await this.usersService.create(registerDto);
  
  // Generate JWT token
  const accessToken = this.generateToken(user.id, user.role);
  
  return {
    accessToken,
    user: plainToInstance(UserResponseDto, user, {
      excludeExtraneousValues: true,
    }),
  };
}
```

**Validation:** ✅ Le service appelle `usersService.create(registerDto)`

---

### 3️⃣ UsersService (`src/users/users.service.ts`)

```typescript
async create(createUserDto: CreateUserDto) {
  // Check if email already exists
  const emailExists = await this.usersRepository.emailExists(
    createUserDto.email,
  );
  
  if (emailExists) {
    throw new ConflictException('Email already registered');
  }
  
  // Hash password
  const hashedPassword = await this.hashPassword(createUserDto.password);
  
  // Create user (password excluded from DTO passed to repository)
  const user = await this.usersRepository.create(
    createUserDto,
    hashedPassword,
  );
  
  this.logger.log(`User created successfully: ${user.email}`);
  
  return user;
}
```

**Validation:**
- ✅ Vérifie l'email en double
- ✅ Hash le mot de passe
- ✅ Appelle `usersRepository.create()`

---

### 4️⃣ UsersRepository (`src/users/users.repository.ts`) - **POINT CRITIQUE**

```typescript
async create(createUserDto: CreateUserDto, hashedPassword: string) {
  this.logger.log(`Creating user with email: ${createUserDto.email}`);
  
  const id = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  return await this.prisma.localUser.create({
    data: {
      id,
      email: createUserDto.email,
      hashedPassword,
      firstName: createUserDto.firstName,
      lastName: createUserDto.lastName,
      phone: createUserDto.phone,
      city: createUserDto.city,
      role: createUserDto.role, // ⚠️ TYPE MISMATCH?
      updatedAt: new Date(),
    },
    // ...
  });
}
```

**Validation:** ⚠️ Appel Prisma direct - **C'est probablement ici que l'erreur se produit**

---

### 5️⃣ Prisma Schema (`prisma/schema.prisma`)

```prisma
model LocalUser {
  id               String         @id
  email            String         @unique
  hashedPassword   String
  firstName        String
  lastName         String
  phone            String?
  city             String?
  role             LocalUserRole  @default(worker)  // ⚠️ Type: LocalUserRole
  active           Boolean        @default(true)
  createdAt        DateTime       @default(now())
  updatedAt        DateTime
  // ...
}

enum LocalUserRole {
  worker
  employer
  residential_client
}
```

**Validation:**
- ✅ Tous les champs correspondent
- ✅ `phone` et `city` sont optionnels (`String?`)
- ✅ `role` utilise l'enum `LocalUserRole`

---

### 6️⃣ CreateUserDto (`src/users/dto/create-user.dto.ts`)

```typescript
export enum UserRole {
  WORKER = 'worker',
  EMPLOYER = 'employer',
  RESIDENTIAL_CLIENT = 'residential_client',
}

export class CreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;
  
  @IsString()
  @MinLength(8)
  password: string;
  
  @IsString()
  firstName: string;
  
  @IsString()
  lastName: string;
  
  @IsString()
  @IsOptional()
  phone?: string;
  
  @IsString()
  @IsOptional()
  city?: string;
  
  @IsEnum(UserRole)
  @IsNotEmpty()
  role: UserRole; // ⚠️ Type: UserRole (pas LocalUserRole)
}
```

**Validation:**
- ✅ Les valeurs de `UserRole` correspondent à `LocalUserRole`
- ✅ `phone` et `city` sont optionnels
- ⚠️ **MAIS**: TypeScript type est `UserRole`, Prisma attend `LocalUserRole`

---

## 🎯 HYPOTHÈSES SUR LA CAUSE DE L'ERREUR 500

### Hypothèse 1: Mismatch de Type Enum (PLUS PROBABLE)

**Problème:**
- Le DTO utilise `UserRole` enum (TypeScript)
- Prisma attend `LocalUserRole` enum (généré par Prisma)
- Même si les **valeurs** sont identiques (`"worker"`, `"employer"`, `"residential_client"`), Prisma Client vérifie le **type TypeScript**

**Impact:**
```typescript
// DTO reçoit:
createUserDto.role = "worker" (type: UserRole)

// Prisma attend:
role: LocalUserRole // Type exact généré par @prisma/client
```

**Code d'erreur attendu:** Probablement une erreur TypeScript runtime ou Prisma validation

---

### Hypothèse 2: Base de Données Non Configurée (POSSIBLE)

**Problème:**
- Railway n'a pas de base PostgreSQL configurée
- `DATABASE_URL` manquante ou invalide
- Migrations Prisma non exécutées

**Code d'erreur attendu:** `P1001` (Can't reach database server)

---

### Hypothèse 3: Contrainte Email Unique (MOINS PROBABLE)

**Problème:**
- L'email `math.test1@gmail.com` existe déjà
- Mais le code devrait retourner `409 Conflict`, pas `500`

**Impact:** Exclu car le `ConflictException` est géré en amont (ligne 36 de `users.service.ts`)

---

### Hypothèse 4: Champ `updatedAt` Non Nullable

**Problème:**
- Le schema Prisma définit `updatedAt` comme `DateTime` (pas `DateTime?`)
- On passe `new Date()` manuellement, ce qui devrait fonctionner
- **MAIS**: Prisma pourrait attendre `@updatedAt` auto-géré

**Impact:** Si Prisma rejette la valeur manuelle de `updatedAt`

---

## 📊 DONNÉES DE DIAGNOSTIC AJOUTÉES

**Logging ajouté dans `users.repository.ts`:**

```typescript
try {
  this.logger.debug(`[DIAGNOSTIC] Creating LocalUser with data:`, {
    id,
    email: createUserDto.email,
    firstName: createUserDto.firstName,
    lastName: createUserDto.lastName,
    phone: createUserDto.phone,
    city: createUserDto.city,
    role: createUserDto.role,
    roleType: typeof createUserDto.role,
  });
  
  return await this.prisma.localUser.create({ /* ... */ });
} catch (error) {
  this.logger.error(`[DIAGNOSTIC] Prisma error during user creation:`, {
    errorName: error?.constructor?.name,
    errorCode: error?.code,
    errorMessage: error?.message,
    errorMeta: error?.meta,
    fullError: JSON.stringify(error, null, 2),
  });
  
  throw error;
}
```

---

## 🚀 PROCHAINES ÉTAPES

### Étape 1: Récupérer les Logs Railway

**Commande:**
```bash
railway logs --follow
```

Ou via Dashboard Railway → Service → Logs

**Chercher:**
- `[DIAGNOSTIC] Creating LocalUser with data:`
- `[DIAGNOSTIC] Prisma error during user creation:`
- Code d'erreur Prisma (ex: `P2002`, `P1001`, etc.)
- Stack trace complet

---

### Étape 2: Analyser l'Erreur Exacte

Une fois les logs obtenus, on saura précisément:
1. **Quelle ligne** déclenche l'erreur
2. **Quel code d'erreur** Prisma retourne
3. **Quel champ** pose problème

---

### Étape 3: Appliquer la Correction

Selon l'erreur identifiée:

#### Si c'est le Type Enum:
**Fichier à modifier:** `src/users/users.repository.ts`

**Changement:**
```typescript
// AVANT:
role: createUserDto.role,

// APRÈS:
role: createUserDto.role as any, // Force cast pour Prisma
// OU
role: createUserDto.role as LocalUserRole, // Import depuis @prisma/client
```

#### Si c'est la Base de Données:
**Action:** Configurer PostgreSQL dans Railway:
1. Ajouter plugin PostgreSQL
2. Set `DATABASE_URL=${{Postgres.DATABASE_URL}}`
3. Redéployer (migrations auto)

#### Si c'est `updatedAt`:
**Fichier à modifier:** `prisma/schema.prisma`

**Changement:**
```prisma
// AVANT:
updatedAt        DateTime

// APRÈS:
updatedAt        DateTime @updatedAt  // Auto-géré par Prisma
```

Puis:
```bash
npx prisma migrate dev --name add-updatedAt-auto
npx prisma generate
```

---

## 📝 RÉSUMÉ POUR L'UTILISATEUR

### 🔴 **CAUSE PRINCIPALE PROBABLE:**

**Type Mismatch entre `UserRole` (DTO) et `LocalUserRole` (Prisma)**

Le DTO TypeScript utilise `UserRole` enum, mais Prisma génère et attend explicitement `LocalUserRole` enum. Même si les valeurs sont identiques, Prisma Client peut rejeter le type à cause de la stricte vérification TypeScript.

---

### ⚠️ **AUTRES CAUSES POSSIBLES:**

1. **Base de données Railway non configurée** (pas de PostgreSQL ou `DATABASE_URL` manquante)
2. **Champ `updatedAt` mal configuré** (devrait être `@updatedAt` auto-géré)
3. **Email déjà existant** (peu probable car `ConflictException` devrait être levée avant)

---

### 🎯 **PROCHAINE ACTION:**

**Récupérer les logs Railway pour voir l'erreur exacte:**

```bash
railway logs --follow
```

Ou via Dashboard: https://railway.app → workon-backend → Logs

**Chercher:**
- `[DIAGNOSTIC] Prisma error during user creation:`
- Code d'erreur (ex: `P2002`, `P1001`, etc.)

---

### 📋 **PLAN DE CORRECTION (EN ATTENTE DE CONFIRMATION):**

#### Option A: Si Type Enum
```typescript
// src/users/users.repository.ts
import { LocalUserRole } from '@prisma/client';

// Dans create():
role: createUserDto.role as LocalUserRole,
```

#### Option B: Si Base de Données
Configurer PostgreSQL dans Railway + `DATABASE_URL`

#### Option C: Si `updatedAt`
```prisma
// schema.prisma
updatedAt DateTime @updatedAt
```

**⚠️ Attendre confirmation via logs avant d'appliquer!**

