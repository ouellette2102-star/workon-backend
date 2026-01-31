import { Test, TestingModule } from '@nestjs/testing';
import { ConsentGuard, REQUIRE_CONSENT_KEY } from './consent.guard';
import { Reflector } from '@nestjs/core';
import { ComplianceService } from '../compliance.service';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';

describe('ConsentGuard', () => {
  let guard: ConsentGuard;
  let reflector: jest.Mocked<Reflector>;
  let complianceService: jest.Mocked<ComplianceService>;

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  const mockComplianceService = {
    requireValidConsent: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConsentGuard,
        { provide: Reflector, useValue: mockReflector },
        { provide: ComplianceService, useValue: mockComplianceService },
      ],
    }).compile();

    guard = module.get<ConsentGuard>(ConsentGuard);
    reflector = module.get(Reflector);
    complianceService = module.get(ComplianceService);
  });

  const createMockContext = (user?: any): ExecutionContext => {
    const mockRequest = {
      user,
      method: 'GET',
      url: '/api/v1/test',
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
    it('should return true when @RequireConsent is not present', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(false);
      const context = createMockContext({ sub: 'user_1' });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(complianceService.requireValidConsent).not.toHaveBeenCalled();
    });

    it('should return true when no user is present', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(true);
      const context = createMockContext(undefined);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return true when user has no sub', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(true);
      const context = createMockContext({ email: 'test@example.com' });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return true when consent is valid', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(true);
      mockComplianceService.requireValidConsent.mockResolvedValue(undefined);
      const context = createMockContext({ sub: 'user_1' });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(complianceService.requireValidConsent).toHaveBeenCalledWith('user_1');
    });

    it('should throw ForbiddenException when consent is missing', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(true);
      mockComplianceService.requireValidConsent.mockRejectedValue(
        new ForbiddenException('Consent required'),
      );
      const context = createMockContext({ sub: 'user_1' });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should rethrow other errors', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(true);
      mockComplianceService.requireValidConsent.mockRejectedValue(
        new Error('Database error'),
      );
      const context = createMockContext({ sub: 'user_1' });

      await expect(guard.canActivate(context)).rejects.toThrow('Database error');
    });
  });
});
