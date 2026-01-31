import { Test, TestingModule } from '@nestjs/testing';
import { JwtStrategy } from './jwt.strategy';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { UnauthorizedException } from '@nestjs/common';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  const mockConfigService = {
    get: jest.fn().mockReturnValue('test_jwt_secret'),
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  describe('validate', () => {
    it('should return user payload when user exists', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user_123',
        email: 'test@example.com',
        role: 'worker',
      });

      const payload = {
        sub: 'user_123',
        email: 'test@example.com',
        role: 'worker',
      };

      const result = await strategy.validate(payload);

      expect(result).toEqual({
        sub: 'user_123',
        email: 'test@example.com',
        role: 'worker',
      });
    });

    it('should throw UnauthorizedException when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const payload = {
        sub: 'nonexistent_user',
        email: 'test@example.com',
        role: 'worker',
      };

      await expect(strategy.validate(payload)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException with correct message', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const payload = { sub: 'user_123', email: 'test@example.com', role: 'worker' };

      await expect(strategy.validate(payload)).rejects.toThrow(
        'Utilisateur invalide',
      );
    });
  });
});
