import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;

  const mockJwtPayload = {
    sub: 'user_123',
    email: 'test@example.com',
    role: 'worker',
  };

  const createMockExecutionContext = (authHeader?: string): ExecutionContext => {
    const mockRequest = {
      headers: authHeader ? { authorization: authHeader } : {},
      user: null as any,
    };

    return {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
    } as ExecutionContext;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        {
          provide: JwtService,
          useValue: {
            verifyAsync: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'JWT_SECRET') return 'test-jwt-secret';
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should return true and set user on valid token', async () => {
      jwtService.verifyAsync.mockResolvedValue(mockJwtPayload);
      const context = createMockExecutionContext('Bearer valid.jwt.token');

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      const request = context.switchToHttp().getRequest();
      expect(request.user).toEqual({
        sub: 'user_123',
        email: 'test@example.com',
        role: 'worker',
        provider: 'local',
        userId: 'user_123',
      });
    });

    it('should throw UnauthorizedException when no authorization header', async () => {
      const context = createMockExecutionContext();

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(context)).rejects.toThrow('Authorization manquante');
    });

    it('should throw UnauthorizedException when authorization header is not Bearer', async () => {
      const context = createMockExecutionContext('Basic credentials');

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when Bearer token is missing', async () => {
      const context = createMockExecutionContext('Bearer ');

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException on invalid token', async () => {
      jwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));
      const context = createMockExecutionContext('Bearer invalid.token');

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(context)).rejects.toThrow('Invalid or expired token');
    });

    it('should throw UnauthorizedException on expired token', async () => {
      jwtService.verifyAsync.mockRejectedValue(new Error('jwt expired'));
      const context = createMockExecutionContext('Bearer expired.token');

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when JWT_SECRET is not configured', async () => {
      configService.get.mockReturnValue(undefined);
      const context = createMockExecutionContext('Bearer valid.token');

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(context)).rejects.toThrow('JWT_SECRET not configured');
    });
  });

  describe('extractTokenFromHeader', () => {
    it('should extract token from valid Bearer header', async () => {
      jwtService.verifyAsync.mockResolvedValue(mockJwtPayload);
      const context = createMockExecutionContext('Bearer my.jwt.token');

      await guard.canActivate(context);

      expect(jwtService.verifyAsync).toHaveBeenCalledWith('my.jwt.token', { secret: 'test-jwt-secret' });
    });

    it('should handle lowercase bearer', async () => {
      jwtService.verifyAsync.mockResolvedValue(mockJwtPayload);
      const context = createMockExecutionContext('bearer my.jwt.token');

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });
  });
});

