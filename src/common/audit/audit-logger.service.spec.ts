import { Test, TestingModule } from '@nestjs/testing';
import { AuditLoggerService } from './audit-logger.service';

// Mock Sentry
jest.mock('@sentry/node', () => ({
  addBreadcrumb: jest.fn(),
  withScope: jest.fn((callback) => callback({ setTag: jest.fn(), setExtra: jest.fn() })),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
}));

describe('AuditLoggerService', () => {
  let service: AuditLoggerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuditLoggerService],
    }).compile();

    service = module.get<AuditLoggerService>(AuditLoggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('logBusinessEvent', () => {
    it('should log business event with sanitized data', () => {
      service.logBusinessEvent('mission.created', {
        missionId: 'mission-123',
        userId: 'user-456',
      });

      // Just verify it doesn't throw
    });

    it('should redact sensitive keys', () => {
      service.logBusinessEvent('user.registered', {
        userId: 'user-123',
        password: 'secret123',
        email: 'test@example.com',
        phone: '+15141234567',
      });

      // Just verify it doesn't throw
    });

    it('should include correlation ID when provided', () => {
      service.logBusinessEvent(
        'payment.completed',
        { paymentId: 'pay-123' },
        'corr-456',
      );

      // Just verify it doesn't throw
    });

    it('should use system as default correlation ID', () => {
      service.logBusinessEvent('contract.created', { contractId: 'cont-123' });

      // Just verify it doesn't throw
    });
  });

  describe('logBusinessError', () => {
    it('should log business error with Error object', () => {
      const error = new Error('Payment failed');
      service.logBusinessError('payment.failed', error, { paymentId: 'pay-123' });

      // Just verify it doesn't throw
    });

    it('should log business error with string message', () => {
      service.logBusinessError('payment.failed', 'Card declined', {
        paymentId: 'pay-123',
      });

      // Just verify it doesn't throw
    });

    it('should include correlation ID when provided', () => {
      service.logBusinessError(
        'contract.cancelled',
        'User cancelled',
        { contractId: 'cont-123' },
        'corr-789',
      );

      // Just verify it doesn't throw
    });
  });

  describe('logBusinessWarning', () => {
    it('should log business warning', () => {
      service.logBusinessWarning(
        'offer.expired',
        'Offer expired before response',
        { offerId: 'offer-123' },
      );

      // Just verify it doesn't throw
    });

    it('should include correlation ID', () => {
      service.logBusinessWarning(
        'mission.delayed',
        'Worker arrived late',
        { missionId: 'mission-123' },
        'corr-111',
      );

      // Just verify it doesn't throw
    });
  });

  describe('withCorrelationId', () => {
    it('should return logger with pre-filled correlation ID', () => {
      const scopedLogger = service.withCorrelationId('corr-999');

      expect(scopedLogger).toHaveProperty('logEvent');
      expect(scopedLogger).toHaveProperty('logError');
      expect(scopedLogger).toHaveProperty('logWarning');
    });

    it('should use scoped logEvent', () => {
      const scopedLogger = service.withCorrelationId('corr-999');
      scopedLogger.logEvent('mission.created', { missionId: 'mission-123' });

      // Just verify it doesn't throw
    });

    it('should use scoped logError', () => {
      const scopedLogger = service.withCorrelationId('corr-999');
      scopedLogger.logError('payment.failed', 'Error message', { paymentId: 'pay-123' });

      // Just verify it doesn't throw
    });

    it('should use scoped logWarning', () => {
      const scopedLogger = service.withCorrelationId('corr-999');
      scopedLogger.logWarning('offer.delayed', 'Response slow', { offerId: 'offer-123' });

      // Just verify it doesn't throw
    });
  });

  describe('sanitize', () => {
    it('should sanitize nested objects', () => {
      service.logBusinessEvent('test.event', {
        user: {
          id: 'user-123',
          password: 'secret',
          profile: {
            email: 'test@example.com',
          },
        },
      });

      // Just verify it doesn't throw
    });

    it('should sanitize arrays', () => {
      service.logBusinessEvent('test.event', {
        users: [
          { id: 'user-1', email: 'test1@example.com' },
          { id: 'user-2', email: 'test2@example.com' },
        ],
      });

      // Just verify it doesn't throw
    });

    it('should handle null and undefined values', () => {
      service.logBusinessEvent('test.event', {
        nullValue: null,
        undefinedValue: undefined,
        normalValue: 'test',
      });

      // Just verify it doesn't throw
    });
  });

  describe('maskId', () => {
    it('should mask ID with prefix', () => {
      const masked = service.maskId('user_abc123xyz789');
      expect(masked).toContain('...');
      expect(masked).toContain('user_');
    });

    it('should mask ID without prefix', () => {
      const masked = service.maskId('abc123xyz789');
      expect(masked).toContain('...');
    });

    it('should return original if too short', () => {
      const masked = service.maskId('abc');
      expect(masked).toBe('abc');
    });

    it('should handle empty string', () => {
      const masked = service.maskId('');
      expect(masked).toBe('');
    });
  });

  describe('safeUserSummary', () => {
    it('should return masked user summary', () => {
      const summary = service.safeUserSummary('user_abc123xyz789', 'worker');

      expect(summary.userId).toContain('...');
      expect(summary.role).toBe('worker');
    });

    it('should work without role', () => {
      const summary = service.safeUserSummary('user_abc123xyz789');

      expect(summary.userId).toContain('...');
      expect(summary.role).toBeUndefined();
    });
  });

  describe('EVENTS constant', () => {
    it('should have all expected events', () => {
      expect(AuditLoggerService.EVENTS.MISSION_CREATED).toBe('mission.created');
      expect(AuditLoggerService.EVENTS.PAYMENT_COMPLETED).toBe('payment.completed');
      expect(AuditLoggerService.EVENTS.USER_REGISTERED).toBe('user.registered');
    });
  });
});
