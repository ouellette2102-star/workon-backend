import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotImplementedException } from '@nestjs/common';

// Mock Prisma
const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  employer: {
    create: jest.fn(),
  },
  worker: {
    create: jest.fn(),
  },
};

// Mock JWT
const mockJwtService = {
  signAsync: jest.fn(),
  verify: jest.fn(),
};

// Mock Config
const mockConfigService = {
  get: jest.fn((key: string, defaultValue?: any) => {
    const config: Record<string, any> = {
      JWT_SECRET: 'test-secret',
      JWT_REFRESH_SECRET: 'test-refresh-secret',
      JWT_EXPIRES_IN: '15m',
      JWT_REFRESH_EXPIRES_IN: '7d',
      BCRYPT_ROUNDS: 10,
    };
    return config[key] || defaultValue;
  }),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('signup', () => {
    /**
     * AuthService.signup() est DÉLIBÉRÉMENT deprecated.
     * Il lance NotImplementedException car l'authentification
     * doit passer par LocalAuthService ou Clerk.
     */
    it('devrait lancer NotImplementedException (méthode deprecated)', async () => {
      const signupDto = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        role: 'WORKER' as const,
      };

      await expect(service.signup(signupDto)).rejects.toThrow(NotImplementedException);
      await expect(service.signup(signupDto)).rejects.toThrow(
        'AuthService.register() is deprecated',
      );
    });
  });

  describe('login', () => {
    /**
     * AuthService.login() est DÉLIBÉRÉMENT deprecated.
     * Il lance NotImplementedException car l'authentification
     * doit passer par LocalAuthService ou Clerk.
     */
    it('devrait lancer NotImplementedException (méthode deprecated)', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      await expect(service.login(loginDto)).rejects.toThrow(NotImplementedException);
      await expect(service.login(loginDto)).rejects.toThrow(
        'AuthService.login() is deprecated',
      );
    });
  });
});

