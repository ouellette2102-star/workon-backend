import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtLocalStrategy } from './jwt-local.strategy';
import { LocalAuthService } from '../local-auth.service';

describe('JwtLocalStrategy', () => {
  let strategy: JwtLocalStrategy;
  let localAuthService: any;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    role: 'worker',
  };

  beforeEach(async () => {
    const mockLocalAuthService = {
      validateUser: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'JWT_SECRET') return 'test-secret';
        return undefined;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtLocalStrategy,
        { provide: LocalAuthService, useValue: mockLocalAuthService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    strategy = module.get<JwtLocalStrategy>(JwtLocalStrategy);
    localAuthService = module.get(LocalAuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validate', () => {
    it('should return user object for valid local token', async () => {
      const payload = { sub: 'user-1', role: 'worker', provider: 'local' };
      localAuthService.validateUser.mockResolvedValue(mockUser);

      const result = await strategy.validate(payload);

      expect(localAuthService.validateUser).toHaveBeenCalledWith('user-1');
      expect(result).toEqual({
        sub: 'user-1',
        email: 'test@example.com',
        role: 'worker',
        provider: 'local',
      });
    });

    it('should throw UnauthorizedException for non-local provider', async () => {
      const payload = { sub: 'user-1', role: 'worker', provider: 'clerk' };

      await expect(strategy.validate(payload)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw when localAuthService.validateUser throws', async () => {
      const payload = { sub: 'user-1', role: 'worker', provider: 'local' };
      localAuthService.validateUser.mockRejectedValue(
        new UnauthorizedException('User not found'),
      );

      await expect(strategy.validate(payload)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
