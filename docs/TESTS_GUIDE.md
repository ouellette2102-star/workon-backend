# 🧪 Guide des Tests - WorkOn Backend

**Version:** 1.0.0  
**Date:** 9 décembre 2025  
**Framework:** Jest + Supertest

---

## 📋 Table des matières

1. [Lancer les tests](#1-lancer-les-tests)
2. [Structure des tests](#2-structure-des-tests)
3. [Couverture par module](#3-couverture-par-module)
4. [Écrire de nouveaux tests](#4-écrire-de-nouveaux-tests)
5. [Tests E2E](#5-tests-e2e)
6. [Limitations actuelles](#6-limitations-actuelles)

---

## 1. Lancer les tests

### Commandes npm

```bash
# Tous les tests unitaires
npm test

# Tests avec watch mode (développement)
npm run test:watch

# Tests avec couverture
npm run test:cov

# Tests E2E uniquement
npm run test:e2e

# Test d'un fichier spécifique
npm test -- --testPathPattern=auth.service.spec.ts
```

### Prérequis

1. **Base de données de test** : Les tests utilisent une DB SQLite in-memory ou la DB locale selon la configuration.

2. **Variables d'environnement** : Créer un fichier `.env.test` :
   ```env
   NODE_ENV=test
   DATABASE_URL="postgresql://postgres:workon@localhost:5432/workon_test?schema=public"
   JWT_SECRET=test-secret-key-for-testing
   ```

3. **Installer les dépendances de test** :
   ```bash
   npm install --save-dev @nestjs/testing supertest
   ```

---

## 2. Structure des tests

```
backend/
├── src/
│   ├── auth/
│   │   ├── auth.service.ts
│   │   └── auth.service.spec.ts      ← Tests unitaires
│   ├── missions-local/
│   │   ├── missions-local.service.ts
│   │   └── missions-local.service.spec.ts
│   └── ...
├── test/
│   ├── app.e2e-spec.ts               ← Test E2E de base
│   ├── auth.e2e-spec.ts              ← Tests E2E Auth
│   ├── missions.e2e-spec.ts          ← Tests E2E Missions
│   └── jest-e2e.json                 ← Config Jest E2E
├── jest.config.js                    ← Config Jest unitaire
└── package.json
```

### Convention de nommage

- Tests unitaires : `*.spec.ts` (dans le même dossier que le service)
- Tests E2E : `*.e2e-spec.ts` (dans le dossier `test/`)

---

## 3. Couverture par module

### État actuel de la couverture

| Module | Unitaires | E2E | Priorité |
|--------|-----------|-----|----------|
| Auth | ⬜ À faire | ⬜ À faire | 🔴 Haute |
| MissionsLocal | ⬜ À faire | ⬜ À faire | 🔴 Haute |
| Ratings | ⬜ À faire | ⬜ À faire | 🟡 Moyenne |
| Photos | ⬜ À faire | ⬜ À faire | 🟡 Moyenne |
| PaymentsLocal | ⬜ À faire | ⬜ À faire | 🟡 Moyenne |
| Notifications | ⬜ À faire | ⬜ À faire | 🟢 Basse |
| Metrics | ⬜ À faire | ⬜ À faire | 🟢 Basse |

### Objectifs de couverture

- **MVP Phase 1** : Auth + MissionsLocal (flux critique)
- **MVP Phase 2** : Ratings + Photos + Payments
- **Future** : 80% couverture globale

---

## 4. Écrire de nouveaux tests

### 4.1 Test unitaire (Service)

```typescript
// src/auth/auth.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { LocalAuthService } from './local-auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';

describe('LocalAuthService', () => {
  let service: LocalAuthService;
  let usersService: UsersService;

  // Mock des dépendances
  const mockUsersService = {
    findByEmail: jest.fn(),
    create: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock-token'),
  };

  const mockPrismaService = {
    localUser: {
      findUnique: jest.fn(),
    },
    passwordResetToken: {
      create: jest.fn(),
      findFirst: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocalAuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<LocalAuthService>(LocalAuthService);
    usersService = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should create a new user and return token', async () => {
      const dto = {
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
        role: 'worker',
      };

      const mockUser = {
        id: 'user-123',
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: dto.role,
      };

      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.create.mockResolvedValue(mockUser);

      const result = await service.register(dto);

      expect(result.accessToken).toBe('mock-token');
      expect(result.user.email).toBe(dto.email);
    });

    it('should throw ConflictException if email exists', async () => {
      mockUsersService.findByEmail.mockResolvedValue({ id: 'existing' });

      await expect(
        service.register({
          email: 'existing@example.com',
          password: 'Password123!',
          firstName: 'Test',
          lastName: 'User',
          role: 'worker',
        }),
      ).rejects.toThrow('Email already registered');
    });
  });

  describe('login', () => {
    it('should return token for valid credentials', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        hashedPassword: '$2a$10$...', // bcrypt hash
        firstName: 'Test',
        lastName: 'User',
        role: 'worker',
      };

      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      // Mock bcrypt.compare
      jest.spyOn(require('bcryptjs'), 'compare').mockResolvedValue(true);

      const result = await service.login({
        email: 'test@example.com',
        password: 'Password123!',
      });

      expect(result.accessToken).toBe('mock-token');
    });
  });
});
```

### 4.2 Test E2E (Controller)

```typescript
// test/auth.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: `test-${Date.now()}@example.com`,
          password: 'Password123!',
          firstName: 'Test',
          lastName: 'User',
          role: 'worker',
        })
        .expect(201);

      expect(response.body.accessToken).toBeDefined();
      expect(response.body.user.email).toContain('test-');
      authToken = response.body.accessToken;
    });

    it('should reject duplicate email', async () => {
      const email = `dup-${Date.now()}@example.com`;
      
      // First registration
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email,
          password: 'Password123!',
          firstName: 'Test',
          lastName: 'User',
          role: 'worker',
        })
        .expect(201);

      // Duplicate attempt
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email,
          password: 'Password123!',
          firstName: 'Test',
          lastName: 'User',
          role: 'worker',
        })
        .expect(409);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login with valid credentials', async () => {
      const email = `login-${Date.now()}@example.com`;
      const password = 'Password123!';

      // Register first
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email,
          password,
          firstName: 'Test',
          lastName: 'User',
          role: 'worker',
        });

      // Login
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password })
        .expect(201);

      expect(response.body.accessToken).toBeDefined();
    });

    it('should reject invalid password', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'WrongPassword!',
        })
        .expect(401);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return current user with valid token', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.email).toBeDefined();
    });

    it('should reject without token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .expect(401);
    });
  });
});
```

### 4.3 Test du workflow mission

```typescript
// test/missions.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('MissionsLocal Workflow (e2e)', () => {
  let app: INestApplication;
  let employerToken: string;
  let workerToken: string;
  let missionId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    // Create employer
    const employerRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `employer-${Date.now()}@test.com`,
        password: 'Password123!',
        firstName: 'Employer',
        lastName: 'Test',
        role: 'employer',
      });
    employerToken = employerRes.body.accessToken;

    // Create worker
    const workerRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `worker-${Date.now()}@test.com`,
        password: 'Password123!',
        firstName: 'Worker',
        lastName: 'Test',
        role: 'worker',
      });
    workerToken = workerRes.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('Step 1: Employer creates a mission', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/missions')
      .set('Authorization', `Bearer ${employerToken}`)
      .send({
        title: 'Test Cleaning Mission',
        description: 'Clean the apartment',
        category: 'cleaning',
        price: 100,
        latitude: 45.5017,
        longitude: -73.5673,
        city: 'Montreal',
      })
      .expect(201);

    expect(response.body.status).toBe('open');
    missionId = response.body.id;
  });

  it('Step 2: Worker finds nearby missions', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/missions/nearby')
      .set('Authorization', `Bearer ${workerToken}`)
      .query({ latitude: 45.5017, longitude: -73.5673, radiusKm: 10 })
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.some((m: any) => m.id === missionId)).toBe(true);
  });

  it('Step 3: Worker accepts the mission', async () => {
    const response = await request(app.getHttpServer())
      .post(`/api/v1/missions/${missionId}/accept`)
      .set('Authorization', `Bearer ${workerToken}`)
      .expect(200);

    expect(response.body.status).toBe('assigned');
  });

  it('Step 4: Worker starts the mission', async () => {
    const response = await request(app.getHttpServer())
      .post(`/api/v1/missions/${missionId}/start`)
      .set('Authorization', `Bearer ${workerToken}`)
      .expect(200);

    expect(response.body.status).toBe('in_progress');
  });

  it('Step 5: Worker completes the mission', async () => {
    const response = await request(app.getHttpServer())
      .post(`/api/v1/missions/${missionId}/complete`)
      .set('Authorization', `Bearer ${workerToken}`)
      .expect(200);

    expect(response.body.status).toBe('completed');
  });
});
```

---

## 5. Tests E2E

### Configuration Jest E2E

```json
// test/jest-e2e.json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testEnvironment": "node",
  "testRegex": ".e2e-spec.ts$",
  "transform": {
    "^.+\\.(t|j)s$": "ts-jest"
  },
  "moduleNameMapper": {
    "^@/(.*)$": "<rootDir>/../src/$1"
  },
  "setupFilesAfterEnv": ["<rootDir>/setup.ts"],
  "testTimeout": 30000
}
```

### Setup file (optionnel)

```typescript
// test/setup.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

beforeAll(async () => {
  // Clean test database before running tests
  // await prisma.localUser.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});
```

---

## 6. Limitations actuelles

### Ce qui n'est PAS testé

| Fonctionnalité | Raison | Risque |
|----------------|--------|--------|
| Stripe Webhooks | Nécessite mock Stripe | 🟡 Moyen |
| Stripe Connect | Nécessite compte Stripe | 🟡 Moyen |
| Email réel (forgot-password) | Pas de provider email | 🟢 Faible |
| Upload photos Supabase | Service externe | 🟢 Faible |

### Stratégie de contournement

1. **Stripe** : Utiliser `stripe-mock` ou mocker le service Stripe
2. **Email** : Le service log le token en dev, pas d'envoi réel
3. **Photos** : Tester uniquement l'enregistrement d'URL, pas l'upload

---

## 7. Checklist avant commit

- [ ] `npm test` passe sans erreur
- [ ] `npm run build` compile sans erreur
- [ ] Tests E2E passent localement
- [ ] Couverture maintenue ou améliorée

---

*Document généré le 9 décembre 2025*
