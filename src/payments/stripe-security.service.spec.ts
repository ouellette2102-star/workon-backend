import { Test, TestingModule } from '@nestjs/testing';
import { StripeSecurityService } from './stripe-security.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { AuditLoggerService } from '../common/audit/audit-logger.service';
import { BadRequestException } from '@nestjs/common';
import { PaymentStatus } from '@prisma/client';

describe('StripeSecurityService', () => {
  let service: StripeSecurityService;
  let prisma: jest.Mocked<PrismaService>;
  let auditLogger: jest.Mocked<AuditLoggerService>;

  const mockPrismaService = {
    payment: {
      count: jest.fn(),
      aggregate: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    trustAuditLog: {
      create: jest.fn().mockReturnValue({
        catch: jest.fn().mockReturnValue(Promise.resolve()),
      }),
    },
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: string) => {
      const config: Record<string, string> = {
        STRIPE_MAX_TXN_PER_HOUR: '10',
        STRIPE_MAX_TXN_PER_DAY: '50',
        STRIPE_MAX_AMOUNT_PER_DAY: '500000', // $5000
        STRIPE_MAX_AMOUNT_PER_TXN: '100000', // $1000
      };
      return config[key] ?? defaultValue;
    }),
  };

  const mockAuditLogger = {
    logBusinessEvent: jest.fn(),
    logBusinessWarning: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StripeSecurityService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: AuditLoggerService, useValue: mockAuditLogger },
      ],
    }).compile();

    service = module.get<StripeSecurityService>(StripeSecurityService);
    prisma = module.get(PrismaService);
    auditLogger = module.get(AuditLoggerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('checkVelocityLimits', () => {
    it('should allow payment within limits', async () => {
      mockPrismaService.payment.count.mockResolvedValue(0);
      mockPrismaService.payment.aggregate.mockResolvedValue({ _sum: { amount: 0 } });

      const result = await service.checkVelocityLimits('user-1', 10000);

      expect(result).toBe(true);
    });

    it('should block payment exceeding per-transaction limit', async () => {
      await expect(
        service.checkVelocityLimits('user-1', 200000), // $2000 > $1000 limit
      ).rejects.toThrow(BadRequestException);

      expect(mockAuditLogger.logBusinessWarning).toHaveBeenCalled();
    });

    it('should block when hourly transaction limit exceeded', async () => {
      mockPrismaService.payment.count.mockResolvedValue(10); // At limit

      await expect(
        service.checkVelocityLimits('user-1', 5000),
      ).rejects.toThrow(BadRequestException);
    });

    it('should block when daily transaction limit exceeded', async () => {
      mockPrismaService.payment.count
        .mockResolvedValueOnce(5) // hourly ok
        .mockResolvedValueOnce(50); // daily at limit

      await expect(
        service.checkVelocityLimits('user-1', 5000),
      ).rejects.toThrow(BadRequestException);
    });

    it('should block when daily amount limit exceeded', async () => {
      mockPrismaService.payment.count
        .mockResolvedValueOnce(5) // hourly ok
        .mockResolvedValueOnce(10); // daily ok
      mockPrismaService.payment.aggregate.mockResolvedValue({
        _sum: { amount: 4900 }, // $4900 already spent, $5000 limit
      });

      await expect(
        service.checkVelocityLimits('user-1', 20000), // $200 would exceed $5000
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('buildRadarMetadata', () => {
    it('should build basic metadata', () => {
      const result = service.buildRadarMetadata('user-1', 'mission-1');

      expect(result).toEqual({
        missionId: 'mission-1',
        userId: 'user-1',
        platform: 'workon',
        created_at: expect.any(String),
      });
    });

    it('should include optional fields when provided', () => {
      const result = service.buildRadarMetadata(
        'user-1',
        'mission-1',
        '192.168.1.1',
        'Mozilla/5.0',
        'device-123',
      );

      expect(result).toEqual({
        missionId: 'mission-1',
        userId: 'user-1',
        platform: 'workon',
        client_ip: '192.168.1.1',
        user_agent: 'Mozilla/5.0',
        device_id: 'device-123',
        created_at: expect.any(String),
      });
    });

    it('should truncate long user agent', () => {
      const longUserAgent = 'X'.repeat(300);
      const result = service.buildRadarMetadata(
        'user-1',
        'mission-1',
        undefined,
        longUserAgent,
      );

      expect(result.user_agent!.length).toBe(255);
    });
  });

  describe('logPaymentEvent', () => {
    it('should log payment initiated event', async () => {
      mockPrismaService.trustAuditLog.create.mockReturnValue(Promise.resolve({}));

      await service.logPaymentEvent(
        'initiated',
        'user-1',
        'pay-1',
        'mission-1',
        10000,
      );

      expect(mockAuditLogger.logBusinessEvent).toHaveBeenCalled();
      expect(mockPrismaService.trustAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          category: 'PAYMENT',
          action: 'payment_initiated',
          actorId: 'user-1',
          targetId: 'pay-1',
        }),
      });
    });

    it('should handle audit log failure gracefully', async () => {
      mockPrismaService.trustAuditLog.create.mockReturnValue(Promise.reject(new Error('DB error')));

      // Should not throw
      await expect(
        service.logPaymentEvent('captured', 'user-1', 'pay-1', 'mission-1', 10000),
      ).resolves.not.toThrow();
    });

    it('should log system events without user ID', async () => {
      mockPrismaService.trustAuditLog.create.mockReturnValue(Promise.resolve({}));

      await service.logPaymentEvent(
        'failed',
        null,
        'pay-1',
        'mission-1',
        10000,
      );

      expect(mockPrismaService.trustAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          actorId: null,
          actorType: 'system',
        }),
      });
    });
  });

  describe('checkWebhookIdempotency', () => {
    it('should return true for new events', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue({
        lastStripeEventId: 'old-event',
      });

      const result = await service.checkWebhookIdempotency('pay-1', 'new-event');

      expect(result).toBe(true);
    });

    it('should return false for already processed events', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue({
        lastStripeEventId: 'same-event',
      });

      const result = await service.checkWebhookIdempotency('pay-1', 'same-event');

      expect(result).toBe(false);
    });

    it('should return true when payment not found', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue(null);

      const result = await service.checkWebhookIdempotency('non-existent', 'event-1');

      expect(result).toBe(true);
    });
  });

  describe('markWebhookProcessed', () => {
    it('should update payment with event ID', async () => {
      mockPrismaService.payment.update.mockResolvedValue({});

      await service.markWebhookProcessed('pay-1', 'event-123');

      expect(mockPrismaService.payment.update).toHaveBeenCalledWith({
        where: { id: 'pay-1' },
        data: { lastStripeEventId: 'event-123' },
      });
    });
  });
});
