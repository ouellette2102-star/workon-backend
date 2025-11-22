# NestJS Module Dependency Graph

## 🏗️ Module Structure

### Core Modules

```
AppModule
├── ConfigModule (global)
├── ThrottlerModule (global with guard)
├── WinstonModule (global logger)
├── PrismaModule
├── LoggerModule
│
├── AuthModule ⭐ (provides JwtService & JwtAuthGuard)
│   ├── imports:
│   │   ├── PrismaModule
│   │   ├── UsersModule (for LocalAuthService → UsersService)
│   │   ├── PassportModule
│   │   └── JwtModule (configured with JWT_SECRET)
│   ├── providers:
│   │   ├── AuthService
│   │   ├── JwtStrategy
│   │   ├── JwtRefreshStrategy
│   │   ├── LocalStrategy
│   │   ├── ClerkAuthService
│   │   ├── JwtAuthGuard ⭐
│   │   ├── LocalAuthService
│   │   └── JwtLocalStrategy
│   └── exports:
│       ├── AuthService
│       ├── ClerkAuthService
│       ├── JwtAuthGuard ⭐
│       ├── JwtModule ⭐ (provides JwtService)
│       ├── PassportModule
│       └── LocalAuthService
│
├── UsersModule
│   ├── imports:
│   │   ├── PrismaModule
│   │   └── AuthModule ⭐ (gets JwtAuthGuard & JwtService)
│   ├── providers:
│   │   ├── UsersService
│   │   └── UsersRepository
│   ├── exports:
│   │   └── UsersService (used by LocalAuthService)
│   └── uses: JwtAuthGuard in controllers
│
├── MissionsLocalModule
│   ├── imports:
│   │   ├── PrismaModule
│   │   └── AuthModule ⭐ (gets JwtAuthGuard & JwtService)
│   └── uses: JwtAuthGuard in controllers
│
├── PaymentsLocalModule
│   ├── imports:
│   │   ├── PrismaModule
│   │   └── AuthModule ⭐ (gets JwtAuthGuard & JwtService)
│   └── uses: JwtAuthGuard in controllers
│
├── MetricsModule
│   ├── imports: PrismaModule
│   └── controllers: No auth required (public endpoints)
│
├── HealthModule
│   └── controllers: No auth required (health check)
│
└── [Other existing modules...]
    ├── MissionsModule (old)
    ├── PaymentsModule (old)
    ├── ProfileModule
    ├── MessagesModule
    ├── NotificationsModule
    └── etc.
```

---

## 🔑 Key Points

### 1. AuthModule - Central Auth Provider

**Provides:**
- `JwtService` (via JwtModule export)
- `JwtAuthGuard` (custom guard)
- `ClerkAuthService` (Clerk integration)
- `LocalAuthService` (email/password auth)

**Exports:**
- `JwtModule` → Makes `JwtService` available to importing modules
- `PassportModule` → Makes Passport strategies available
- `JwtAuthGuard` → Custom guard for protected routes
- `AuthService`, `ClerkAuthService`, `LocalAuthService`

**Configuration:**
- JWT_SECRET from ConfigService
- JWT_EXPIRES_IN: 7 days default
- JWT_REFRESH_SECRET for refresh tokens

### 2. Dependency Flow

**Circular Dependency Resolved with forwardRef:**

```
AuthModule
  ↓ forwardRef(() => UsersModule)  ← Deferred import
UsersModule
  ↓ exports UsersService
  ↓ forwardRef(() => AuthModule)  ← Deferred import
AuthModule (uses UsersService in LocalAuthService)
        ↓ exports JwtAuthGuard
UsersModule (uses JwtAuthGuard in controllers)

✅ Circular dependency broken by forwardRef
```

**Other modules (no forwardRef needed):**

```
MissionsLocalModule → imports → AuthModule → gets JwtAuthGuard & JwtService
PaymentsLocalModule → imports → AuthModule → gets JwtAuthGuard & JwtService
MetricsModule → imports → PrismaModule only (no auth)
```

### 3. JwtAuthGuard Usage

**Where it's used:**
- `UsersController`: `@UseGuards(JwtAuthGuard)`
- `MissionsLocalController`: `@UseGuards(JwtAuthGuard)`
- `PaymentsLocalController`: `@UseGuards(JwtAuthGuard)`
- `LocalAuthController`: `GET /auth/me` endpoint

**Dependencies resolved by AuthModule:**
- `JwtService` (from JwtModule)
- `ConfigService` (global)
- `ClerkAuthService` (from AuthModule providers)

### 4. Import Order in AppModule

**Critical order (UPDATED):**
1. ConfigModule (global, first)
2. PrismaModule (used by many modules)
3. **UsersModule** (provides UsersService, defers AuthModule import with forwardRef)
4. **AuthModule** (uses UsersService, provides JwtService & guards, defers UsersModule with forwardRef)
5. Old modules (MissionsModule, PaymentsModule, etc.)
6. MissionsLocalModule, PaymentsLocalModule, etc. (depend on AuthModule)

**Why UsersModule comes first:**
- AuthModule needs UsersService for LocalAuthService
- UsersModule is initialized first, making UsersService available
- forwardRef allows both modules to reference each other during initialization

---

## 🚫 What NOT to Do

✅ **UPDATE:** forwardRef IS REQUIRED for AuthModule ↔ UsersModule

**The circular dependency is REAL:**
```typescript
// CORRECT - Use forwardRef for circular dependencies
// AuthModule
@Module({
  imports: [
    forwardRef(() => UsersModule), // ✅ Required
  ],
})

// UsersModule
@Module({
  imports: [
    forwardRef(() => AuthModule), // ✅ Required
  ],
})
```

❌ **DO NOT** use forwardRef unnecessarily:
```typescript
// BAD - No circular dependency here
@Module({
  imports: [
    forwardRef(() => PrismaModule), // ❌ Not needed
  ],
})
```

❌ **DO NOT** import JwtModule directly in other modules:
```typescript
// BAD - Duplicate JWT configuration
@Module({
  imports: [
    JwtModule.register({ secret: '...' }), // ❌ Don't do this
  ],
})
```

❌ **DO NOT** provide JwtAuthGuard in multiple modules:
```typescript
// BAD - Guard should only be in AuthModule
@Module({
  providers: [JwtAuthGuard], // ❌ Don't do this
})
```

✅ **CORRECT** way:
```typescript
// GOOD - Import AuthModule to get everything
@Module({
  imports: [AuthModule],
})
export class MyFeatureModule {}
```

---

## 🔧 How to Add Auth to a New Module

### Step 1: Import AuthModule

```typescript
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    AuthModule, // Gets JwtAuthGuard & JwtService
  ],
  // ...
})
export class MyNewModule {}
```

### Step 2: Use JwtAuthGuard in Controller

```typescript
import { Controller, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('my-resource')
@UseGuards(JwtAuthGuard) // Apply to entire controller
export class MyController {
  // Protected routes
}
```

### Step 3: Access User from Request

```typescript
@Get('protected')
@UseGuards(JwtAuthGuard)
async protectedRoute(@Request() req: any) {
  const userId = req.user.sub;
  const userRole = req.user.role;
  // Use userId and userRole
}
```

---

## 📊 Dependency Resolution

### JwtAuthGuard Dependencies

```typescript
@Injectable()
export class JwtAuthGuard {
  constructor(
    private jwtService: JwtService,        // ← From JwtModule
    private configService: ConfigService,  // ← Global
    private clerkAuthService: ClerkAuthService, // ← From AuthModule
  ) {}
}
```

**How NestJS resolves:**

1. Module imports `AuthModule`
2. `AuthModule` exports:
   - `JwtModule` → provides `JwtService`
   - `JwtAuthGuard` → registered in providers
   - `ClerkAuthService` → registered in providers
3. When controller uses `@UseGuards(JwtAuthGuard)`:
   - NestJS finds `JwtAuthGuard` in AuthModule exports
   - Injects `JwtService` from exported JwtModule
   - Injects `ConfigService` (global)
   - Injects `ClerkAuthService` from AuthModule providers
4. ✅ All dependencies resolved

---

## 🎯 Summary

| Module | Provides | Depends On | Exports |
|--------|----------|------------|---------|
| **AuthModule** | JwtService, JwtAuthGuard, Auth services | UsersModule (for UsersService) | JwtModule, JwtAuthGuard, Auth services |
| **UsersModule** | UsersService, UsersRepository | AuthModule (for JwtAuthGuard) | UsersService |
| **MissionsLocalModule** | Mission CRUD | AuthModule (for JwtAuthGuard) | MissionsLocalService |
| **PaymentsLocalModule** | Payments | AuthModule (for JwtAuthGuard) | PaymentsLocalService |
| **MetricsModule** | Public metrics | PrismaModule only | MetricsService |

**Key Insight:** AuthModule is the **single source of truth** for JWT authentication. All modules needing auth import AuthModule, not individual pieces.

---

**Last Updated:** 2024-11-18  
**NestJS Version:** 10.x  
**Status:** ✅ No circular dependencies, clean module graph

