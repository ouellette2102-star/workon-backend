import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

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
    it('devrait créer un nouvel utilisateur', async () => {
      const signupDto = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        role: 'WORKER' as const,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue({
        id: 'user-1',
        email: signupDto.email,
        name: signupDto.name,
        role: signupDto.role,
        createdAt: new Date(),
      });
      mockPrismaService.worker.create.mockResolvedValue({
        id: 'worker-1',
        userId: 'user-1',
      });
      mockJwtService.signAsync.mockResolvedValue('token');

      const result = await service.signup(signupDto);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(mockPrismaService.user.create).toHaveBeenCalled();
    });

    it('devrait échouer si l\'email existe déjà', async () => {
      const signupDto = {
        email: 'existing@example.com',
        password: 'password123',
        name: 'Test User',
        role: 'WORKER' as const,
      };

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'existing-user',
        email: signupDto.email,
      });

      await expect(service.signup(signupDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('devrait connecter un utilisateur avec des identifiants valides', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const hashedPassword = await bcrypt.hash(loginDto.password, 10);

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: loginDto.email,
        name: 'Test User',
        role: 'WORKER',
        active: true,
        profile: {
          passwordHash: hashedPassword,
        },
      });
      mockJwtService.signAsync.mockResolvedValue('token');

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('devrait échouer avec des identifiants invalides', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });
});

