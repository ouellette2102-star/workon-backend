import { Test, TestingModule } from '@nestjs/testing';
import { LocalStrategy } from './local.strategy';
import { LocalAuthService } from '../local-auth.service';
import { UnauthorizedException } from '@nestjs/common';

describe('LocalStrategy', () => {
  let strategy: LocalStrategy;

  const mockLocalAuthService = {
    login: jest.fn(),
    validateUser: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocalStrategy,
        { provide: LocalAuthService, useValue: mockLocalAuthService },
      ],
    }).compile();

    strategy = module.get<LocalStrategy>(LocalStrategy);
  });

  describe('validate', () => {
    it('should throw UnauthorizedException as this strategy is not used', async () => {
      await expect(strategy.validate('test@example.com', 'password123')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should instruct to use /auth/login endpoint', async () => {
      await expect(strategy.validate('test@example.com', 'password123')).rejects.toThrow(
        'Use /auth/login endpoint instead of passport local strategy',
      );
    });
  });
});
