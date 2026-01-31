import { Test, TestingModule } from '@nestjs/testing';
import { JwtRefreshStrategy } from './jwt-refresh.strategy';
import { ConfigService } from '@nestjs/config';

describe('JwtRefreshStrategy', () => {
  let strategy: JwtRefreshStrategy;

  const mockConfigService = {
    get: jest.fn().mockReturnValue('test_refresh_secret'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtRefreshStrategy,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    strategy = module.get<JwtRefreshStrategy>(JwtRefreshStrategy);
  });

  describe('validate', () => {
    it('should return user payload from refresh token', async () => {
      const payload = {
        sub: 'user_123',
        email: 'test@example.com',
        role: 'employer',
      };

      const result = await strategy.validate(payload);

      expect(result).toEqual({
        sub: 'user_123',
        email: 'test@example.com',
        role: 'employer',
      });
    });

    it('should pass through all payload properties', async () => {
      const payload = {
        sub: 'user_456',
        email: 'worker@example.com',
        role: 'worker',
        extra: 'should_be_ignored',
      };

      const result = await strategy.validate(payload);

      expect(result.sub).toBe('user_456');
      expect(result.email).toBe('worker@example.com');
      expect(result.role).toBe('worker');
      expect(result).not.toHaveProperty('extra');
    });
  });
});
