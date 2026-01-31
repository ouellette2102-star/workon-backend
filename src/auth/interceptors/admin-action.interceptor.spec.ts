import { Test, TestingModule } from '@nestjs/testing';
import { AdminActionInterceptor, ADMIN_ACTION_KEY } from './admin-action.interceptor';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLoggerService } from '../../common/audit/audit-logger.service';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, throwError } from 'rxjs';

describe('AdminActionInterceptor', () => {
  let interceptor: AdminActionInterceptor;
  let reflector: jest.Mocked<Reflector>;
  let prisma: jest.Mocked<PrismaService>;
  let auditLogger: jest.Mocked<AuditLoggerService>;

  const mockReflector = {
    get: jest.fn(),
  };

  const mockPrismaService = {
    trustAuditLog: {
      create: jest.fn(),
    },
  };

  const mockAuditLogger = {
    logBusinessEvent: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminActionInterceptor,
        { provide: Reflector, useValue: mockReflector },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AuditLoggerService, useValue: mockAuditLogger },
      ],
    }).compile();

    interceptor = module.get<AdminActionInterceptor>(AdminActionInterceptor);
    reflector = module.get(Reflector);
    prisma = module.get(PrismaService);
    auditLogger = module.get(AuditLoggerService);
  });

  const createMockContext = (user?: any, body?: any): ExecutionContext => {
    const mockRequest = {
      user,
      body: body || {},
      method: 'POST',
      url: '/admin/test',
      ip: '192.168.1.1',
      headers: {
        'user-agent': 'Test Agent',
        'x-correlation-id': 'corr-123',
      },
      socket: { remoteAddress: '192.168.1.1' },
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

  const createMockCallHandler = (response: any): CallHandler => ({
    handle: () => of(response),
  });

  describe('intercept', () => {
    it('should pass through when no AdminAction decorator', (done) => {
      mockReflector.get.mockReturnValue(undefined);
      const context = createMockContext({ sub: 'admin_1', role: 'ADMIN' });
      const handler = createMockCallHandler({ success: true });

      interceptor.intercept(context, handler).subscribe({
        next: (result) => {
          expect(result).toEqual({ success: true });
          expect(mockAuditLogger.logBusinessEvent).not.toHaveBeenCalled();
          done();
        },
      });
    });

    it('should log admin action on success', (done) => {
      mockReflector.get.mockReturnValue({
        action: 'test_action',
        description: 'Test description',
      });
      mockPrismaService.trustAuditLog.create.mockResolvedValue({});

      const context = createMockContext({ sub: 'admin_1', role: 'ADMIN' });
      const handler = createMockCallHandler({ success: true });

      interceptor.intercept(context, handler).subscribe({
        next: () => {
          expect(mockAuditLogger.logBusinessEvent).toHaveBeenCalled();
          done();
        },
      });
    });

    it('should sanitize sensitive data in request body', (done) => {
      mockReflector.get.mockReturnValue({
        action: 'test_action',
      });
      mockPrismaService.trustAuditLog.create.mockResolvedValue({});

      const context = createMockContext(
        { sub: 'admin_1', role: 'ADMIN' },
        { password: 'secret123', normalField: 'visible' },
      );
      const handler = createMockCallHandler({ success: true });

      interceptor.intercept(context, handler).subscribe({
        next: () => {
          expect(mockPrismaService.trustAuditLog.create).toHaveBeenCalled();
          const callArgs = mockPrismaService.trustAuditLog.create.mock.calls[0][0];
          expect(callArgs.data.newValue.requestBody.password).toBe('[REDACTED]');
          expect(callArgs.data.newValue.requestBody.normalField).toBe('visible');
          done();
        },
      });
    });

    it('should handle unknown user gracefully', (done) => {
      mockReflector.get.mockReturnValue({
        action: 'test_action',
      });
      mockPrismaService.trustAuditLog.create.mockResolvedValue({});

      const context = createMockContext(undefined);
      const handler = createMockCallHandler({ success: true });

      interceptor.intercept(context, handler).subscribe({
        next: () => {
          expect(mockPrismaService.trustAuditLog.create).toHaveBeenCalledWith(
            expect.objectContaining({
              data: expect.objectContaining({
                actorId: 'unknown',
              }),
            }),
          );
          done();
        },
      });
    });
  });
});
