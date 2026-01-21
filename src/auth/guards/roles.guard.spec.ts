import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { UserRole } from '@prisma/client';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;

  const createMockExecutionContext = (user?: any): ExecutionContext => {
    const mockRequest = { user };

    return {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
      getHandler: () => jest.fn(),
    } as unknown as ExecutionContext;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        {
          provide: Reflector,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get(Reflector);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should return true when no roles are required', () => {
      reflector.get.mockReturnValue(undefined);
      const context = createMockExecutionContext({ sub: 'user_123', role: UserRole.WORKER });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return true when user has required role', () => {
      reflector.get.mockReturnValue([UserRole.WORKER]);
      const context = createMockExecutionContext({ sub: 'user_123', role: UserRole.WORKER });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return true when user has one of multiple required roles', () => {
      reflector.get.mockReturnValue([UserRole.WORKER, UserRole.EMPLOYER]);
      const context = createMockExecutionContext({ sub: 'user_123', role: UserRole.EMPLOYER });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should throw ForbiddenException when user does not have required role', () => {
      reflector.get.mockReturnValue([UserRole.EMPLOYER]);
      const context = createMockExecutionContext({ sub: 'user_123', role: UserRole.WORKER });

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException with descriptive message for WORKER role', () => {
      reflector.get.mockReturnValue([UserRole.WORKER]);
      const context = createMockExecutionContext({ sub: 'user_123', role: UserRole.EMPLOYER });

      expect(() => guard.canActivate(context)).toThrow('Accès réservé aux workers WorkOn');
    });

    it('should throw ForbiddenException with descriptive message for EMPLOYER role', () => {
      reflector.get.mockReturnValue([UserRole.EMPLOYER]);
      const context = createMockExecutionContext({ sub: 'user_123', role: UserRole.WORKER });

      expect(() => guard.canActivate(context)).toThrow('Accès réservé aux employers WorkOn');
    });

    it('should throw ForbiddenException when no user in request', () => {
      reflector.get.mockReturnValue([UserRole.WORKER]);
      const context = createMockExecutionContext(undefined);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow('Authentification requise');
    });

    it('should throw ForbiddenException when user is null', () => {
      reflector.get.mockReturnValue([UserRole.WORKER]);
      const context = createMockExecutionContext(null);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
  });
});

