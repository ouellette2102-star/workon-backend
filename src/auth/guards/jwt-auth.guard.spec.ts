import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from './jwt-auth.guard';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const mockJwtService = {
      verifyAsync: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);
  });

  const createMockContext = (authHeader?: string): ExecutionContext => {
    const mockRequest: any = {
      headers: authHeader ? { authorization: authHeader } : {},
      user: undefined,
    };

    return {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => ({}),
        getNext: () => jest.fn(),
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
      getArgs: () => [],
      getArgByIndex: () => undefined,
      switchToRpc: () => ({} as any),
      switchToWs: () => ({} as any),
      getType: () => 'http',
    } as unknown as ExecutionContext;
  };

  describe('canActivate', () => {
    it('should throw UnauthorizedException when no authorization header', async () => {
      const context = createMockContext();

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when authorization type is not Bearer', async () => {
      const context = createMockContext('Basic abc123');

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when no token provided after Bearer', async () => {
      const context = createMockContext('Bearer ');

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when JWT_SECRET not configured', async () => {
      const context = createMockContext('Bearer valid_token');
      configService.get.mockReturnValue(undefined);

      await expect(guard.canActivate(context)).rejects.toThrow(
        'JWT_SECRET not configured',
      );
    });

    it('should return true and attach user to request when token is valid', async () => {
      const mockPayload = {
        sub: 'user_123',
        email: 'test@example.com',
        role: 'worker',
      };
      
      configService.get.mockReturnValue('test_jwt_secret');
      jwtService.verifyAsync.mockResolvedValue(mockPayload);
      
      const context = createMockContext('Bearer valid_token');
      const request = context.switchToHttp().getRequest();

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(request.user).toEqual({
        sub: 'user_123',
        email: 'test@example.com',
        role: 'worker',
        provider: 'local',
        userId: 'user_123',
      });
    });

    it('should throw UnauthorizedException when token is invalid', async () => {
      configService.get.mockReturnValue('test_jwt_secret');
      jwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

      const context = createMockContext('Bearer invalid_token');

      await expect(guard.canActivate(context)).rejects.toThrow(
        'Invalid or expired token',
      );
    });

    it('should throw UnauthorizedException when token is expired', async () => {
      configService.get.mockReturnValue('test_jwt_secret');
      jwtService.verifyAsync.mockRejectedValue(new Error('jwt expired'));

      const context = createMockContext('Bearer expired_token');

      await expect(guard.canActivate(context)).rejects.toThrow(
        'Invalid or expired token',
      );
    });

    it('should handle lowercase bearer prefix', async () => {
      const mockPayload = {
        sub: 'user_123',
        email: 'test@example.com',
        role: 'employer',
      };
      
      configService.get.mockReturnValue('test_jwt_secret');
      jwtService.verifyAsync.mockResolvedValue(mockPayload);
      
      const context = createMockContext('bearer valid_token');

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });
  });
});
