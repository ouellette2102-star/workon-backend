import { Test, TestingModule } from '@nestjs/testing';
import { ClerkAuthService } from './clerk-auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { UserRole } from '@prisma/client';

// Mock @clerk/clerk-sdk-node
jest.mock('@clerk/clerk-sdk-node', () => ({
  verifyToken: jest.fn(),
}));

import { verifyToken } from '@clerk/clerk-sdk-node';

describe('ClerkAuthService', () => {
  let service: ClerkAuthService;
  let prisma: jest.Mocked<PrismaService>;
  let configService: jest.Mocked<ConfigService>;
  const mockVerifyToken = verifyToken as jest.Mock;

  const mockPrismaService = {
    user: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: string) => {
      const config: Record<string, string> = {
        CLERK_SECRET_KEY: 'sk_test_123',
        CLERK_ISSUER: 'https://clerk.accounts.dev',
      };
      return config[key] ?? defaultValue;
    }),
  };

  const mockUser = {
    id: 'user_clerk_123',
    clerkId: 'clerk_123',
    userProfile: {
      name: 'John Doe',
      role: UserRole.WORKER,
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClerkAuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<ClerkAuthService>(ClerkAuthService);
    prisma = module.get(PrismaService);
    configService = module.get(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('verifyAndSyncUser', () => {
    it('should throw UnauthorizedException when CLERK_SECRET_KEY is missing', async () => {
      (mockConfigService.get as jest.Mock).mockReturnValue(undefined);

      await expect(service.verifyAndSyncUser('token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when token verification fails', async () => {
      (mockConfigService.get as jest.Mock).mockImplementation((key: string) => {
        if (key === 'CLERK_SECRET_KEY') return 'sk_test_123';
        return undefined;
      });
      mockVerifyToken.mockRejectedValue(new Error('Invalid token'));

      await expect(service.verifyAndSyncUser('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when sub is missing from token', async () => {
      (mockConfigService.get as jest.Mock).mockImplementation((key: string) => {
        if (key === 'CLERK_SECRET_KEY') return 'sk_test_123';
        return undefined;
      });
      mockVerifyToken.mockResolvedValue({ email: 'test@example.com' }); // No sub

      await expect(service.verifyAndSyncUser('token-without-sub')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should return existing user data', async () => {
      (mockConfigService.get as jest.Mock).mockImplementation((key: string, defaultValue?: string) => {
        if (key === 'CLERK_SECRET_KEY') return 'sk_test_123';
        if (key === 'CLERK_ISSUER') return defaultValue || 'https://clerk.accounts.dev';
        return defaultValue || '';
      });
      mockVerifyToken.mockResolvedValue({
        sub: 'clerk_123',
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
      });
      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);

      const result = await service.verifyAndSyncUser('valid-token');

      expect(result).toEqual({
        sub: 'user_clerk_123',
        clerkId: 'clerk_123',
        email: 'test@example.com',
        role: UserRole.WORKER,
        claims: expect.any(Object),
      });
    });

    it('should create new user when not found', async () => {
      (mockConfigService.get as jest.Mock).mockImplementation((key: string, defaultValue?: string) => {
        if (key === 'CLERK_SECRET_KEY') return 'sk_test_123';
        if (key === 'CLERK_ISSUER') return defaultValue || 'https://clerk.accounts.dev';
        return defaultValue || '';
      });
      mockVerifyToken.mockResolvedValue({
        sub: 'new_clerk_id',
        email: 'new@example.com',
        first_name: 'New',
        last_name: 'User',
      });
      mockPrismaService.user.findFirst.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue({
        id: 'user_new_clerk_id',
        clerkId: 'new_clerk_id',
        userProfile: {
          name: 'New User',
          role: UserRole.WORKER,
        },
      });

      const result = await service.verifyAndSyncUser('new-user-token');

      expect(mockPrismaService.user.create).toHaveBeenCalled();
      expect(result.sub).toBe('user_new_clerk_id');
    });

    it('should update user without clerkId', async () => {
      (mockConfigService.get as jest.Mock).mockImplementation((key: string, defaultValue?: string) => {
        if (key === 'CLERK_SECRET_KEY') return 'sk_test_123';
        if (key === 'CLERK_ISSUER') return defaultValue || 'https://clerk.accounts.dev';
        return defaultValue || '';
      });
      mockVerifyToken.mockResolvedValue({
        sub: 'clerk_update',
        email: 'update@example.com',
      });
      mockPrismaService.user.findFirst.mockResolvedValue({
        id: 'existing_user',
        clerkId: null, // No clerkId yet
        userProfile: { role: UserRole.EMPLOYER },
      });
      mockPrismaService.user.update.mockResolvedValue({
        id: 'existing_user',
        clerkId: 'clerk_update',
        userProfile: { role: UserRole.EMPLOYER },
      });

      const result = await service.verifyAndSyncUser('token');

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'existing_user' },
        data: expect.objectContaining({
          clerkId: 'clerk_update',
        }),
        include: { userProfile: true },
      });
      expect(result.role).toBe(UserRole.EMPLOYER);
    });

    it('should extract email from email_address field', async () => {
      (mockConfigService.get as jest.Mock).mockImplementation((key: string, defaultValue?: string) => {
        if (key === 'CLERK_SECRET_KEY') return 'sk_test_123';
        return defaultValue || '';
      });
      mockVerifyToken.mockResolvedValue({
        sub: 'clerk_123',
        email_address: 'via-email-address@example.com',
      });
      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);

      const result = await service.verifyAndSyncUser('token');

      expect(result.email).toBe('via-email-address@example.com');
    });

    it('should extract email from email_addresses array', async () => {
      (mockConfigService.get as jest.Mock).mockImplementation((key: string, defaultValue?: string) => {
        if (key === 'CLERK_SECRET_KEY') return 'sk_test_123';
        return defaultValue || '';
      });
      mockVerifyToken.mockResolvedValue({
        sub: 'clerk_123',
        email_addresses: [{ email_address: 'array@example.com' }],
      });
      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);

      const result = await service.verifyAndSyncUser('token');

      expect(result.email).toBe('array@example.com');
    });

    it('should use fallback email when none provided', async () => {
      (mockConfigService.get as jest.Mock).mockImplementation((key: string, defaultValue?: string) => {
        if (key === 'CLERK_SECRET_KEY') return 'sk_test_123';
        return defaultValue || '';
      });
      mockVerifyToken.mockResolvedValue({
        sub: 'clerk_no_email',
      });
      mockPrismaService.user.findFirst.mockResolvedValue({
        ...mockUser,
        clerkId: 'clerk_no_email',
      });

      const result = await service.verifyAndSyncUser('token');

      expect(result.email).toBe('clerk_no_email@clerk.local');
    });
  });
});
