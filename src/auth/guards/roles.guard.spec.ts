import { Test, TestingModule } from '@nestjs/testing';
import { RolesGuard } from './roles.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(async () => {
    const mockReflector = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        { provide: Reflector, useValue: mockReflector },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get(Reflector);
  });

  const createMockContext = (user?: any): ExecutionContext => ({
    switchToHttp: () => ({
      getRequest: () => ({ user }),
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
  } as unknown as ExecutionContext);

  describe('canActivate', () => {
    it('should return true when no roles are required', () => {
      reflector.get.mockReturnValue(undefined);
      const context = createMockContext({ sub: 'user_1', role: UserRole.WORKER });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return true when user has required role', () => {
      reflector.get.mockReturnValue([UserRole.WORKER]);
      const context = createMockContext({ sub: 'user_1', role: UserRole.WORKER });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return true when user has one of multiple required roles', () => {
      reflector.get.mockReturnValue([UserRole.WORKER, UserRole.EMPLOYER]);
      const context = createMockContext({ sub: 'user_1', role: UserRole.EMPLOYER });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should throw ForbiddenException when no user in request', () => {
      reflector.get.mockReturnValue([UserRole.WORKER]);
      const context = createMockContext(undefined);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when user does not have required role', () => {
      reflector.get.mockReturnValue([UserRole.WORKER]);
      const context = createMockContext({ sub: 'user_1', role: UserRole.EMPLOYER });

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException with worker message', () => {
      reflector.get.mockReturnValue([UserRole.WORKER]);
      const context = createMockContext({ sub: 'user_1', role: UserRole.EMPLOYER });

      expect(() => guard.canActivate(context)).toThrow(
        'Accès réservé aux workers WorkOn',
      );
    });

    it('should throw ForbiddenException with employer message', () => {
      reflector.get.mockReturnValue([UserRole.EMPLOYER]);
      const context = createMockContext({ sub: 'user_1', role: UserRole.WORKER });

      expect(() => guard.canActivate(context)).toThrow(
        'Accès réservé aux employers WorkOn',
      );
    });

    it('should throw ForbiddenException with combined message for multiple roles', () => {
      reflector.get.mockReturnValue([UserRole.WORKER, UserRole.EMPLOYER]);
      const context = createMockContext({ sub: 'user_1', role: UserRole.ADMIN });

      expect(() => guard.canActivate(context)).toThrow(
        'Accès réservé aux workers et employers WorkOn',
      );
    });
  });
});
