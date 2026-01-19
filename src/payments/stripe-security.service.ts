import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLoggerService } from '../common/audit/audit-logger.service';
import { PaymentStatus } from '@prisma/client';

/**
 * Velocity limit configuration
 */
interface VelocityLimits {
  maxTransactionsPerHour: number;
  maxTransactionsPerDay: number;
  maxAmountPerDay: number; // in cents
  maxAmountPerTransaction: number; // in cents
}

/**
 * StripeSecurityService - Fraud prevention and audit logging for payments
 * PR-03: Stripe Security & Fraud Baseline
 *
 * Features:
 * - Velocity checks (transaction limits per user)
 * - Payment audit logging (TrustAuditLog integration)
 * - Stripe Radar metadata enrichment
 * - Suspicious activity detection
 */
@Injectable()
export class StripeSecurityService {
  private readonly logger = new Logger(StripeSecurityService.name);
  private readonly limits: VelocityLimits;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly auditLogger: AuditLoggerService,
  ) {
    // Configurable velocity limits with safe defaults
    this.limits = {
      maxTransactionsPerHour: parseInt(
        this.configService.get<string>('STRIPE_MAX_TXN_PER_HOUR', '10'),
        10,
      ),
      maxTransactionsPerDay: parseInt(
        this.configService.get<string>('STRIPE_MAX_TXN_PER_DAY', '50'),
        10,
      ),
      maxAmountPerDay: parseInt(
        this.configService.get<string>('STRIPE_MAX_AMOUNT_PER_DAY', '500000'), // $5000 CAD
        10,
      ),
      maxAmountPerTransaction: parseInt(
        this.configService.get<string>('STRIPE_MAX_AMOUNT_PER_TXN', '100000'), // $1000 CAD
        10,
      ),
    };
  }

  /**
   * Check velocity limits before allowing a payment
   * @returns true if allowed, throws BadRequestException if blocked
   */
  async checkVelocityLimits(
    userId: string,
    amountCents: number,
    correlationId?: string,
  ): Promise<boolean> {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Check per-transaction limit
    if (amountCents > this.limits.maxAmountPerTransaction) {
      this.logSecurityEvent('VELOCITY_BLOCKED', userId, {
        reason: 'max_amount_per_transaction',
        amountCents,
        limit: this.limits.maxAmountPerTransaction,
        correlationId,
      });
      throw new BadRequestException(
        `Le montant maximum par transaction est de ${this.limits.maxAmountPerTransaction / 100} CAD`,
      );
    }

    // Count transactions in the last hour
    const txnLastHour = await this.prisma.payment.count({
      where: {
        mission: { authorClientId: userId },
        createdAt: { gte: oneHourAgo },
        status: { not: PaymentStatus.FAILED },
      },
    });

    if (txnLastHour >= this.limits.maxTransactionsPerHour) {
      this.logSecurityEvent('VELOCITY_BLOCKED', userId, {
        reason: 'max_transactions_per_hour',
        count: txnLastHour,
        limit: this.limits.maxTransactionsPerHour,
        correlationId,
      });
      throw new BadRequestException(
        'Trop de transactions dans la dernière heure. Veuillez réessayer plus tard.',
      );
    }

    // Count transactions in the last 24 hours
    const txnLastDay = await this.prisma.payment.count({
      where: {
        mission: { authorClientId: userId },
        createdAt: { gte: oneDayAgo },
        status: { not: PaymentStatus.FAILED },
      },
    });

    if (txnLastDay >= this.limits.maxTransactionsPerDay) {
      this.logSecurityEvent('VELOCITY_BLOCKED', userId, {
        reason: 'max_transactions_per_day',
        count: txnLastDay,
        limit: this.limits.maxTransactionsPerDay,
        correlationId,
      });
      throw new BadRequestException(
        'Limite quotidienne de transactions atteinte. Veuillez réessayer demain.',
      );
    }

    // Sum amounts in the last 24 hours
    const amountLastDay = await this.prisma.payment.aggregate({
      where: {
        mission: { authorClientId: userId },
        createdAt: { gte: oneDayAgo },
        status: { not: PaymentStatus.FAILED },
      },
      _sum: { amount: true },
    });

    const totalAmountCents = ((amountLastDay._sum.amount || 0) * 100) + amountCents;
    if (totalAmountCents > this.limits.maxAmountPerDay) {
      this.logSecurityEvent('VELOCITY_BLOCKED', userId, {
        reason: 'max_amount_per_day',
        totalAmountCents,
        limit: this.limits.maxAmountPerDay,
        correlationId,
      });
      throw new BadRequestException(
        `Limite quotidienne de ${this.limits.maxAmountPerDay / 100} CAD atteinte.`,
      );
    }

    return true;
  }

  /**
   * Build Stripe Radar metadata for fraud detection
   */
  buildRadarMetadata(
    userId: string,
    missionId: string,
    ipAddress?: string,
    userAgent?: string,
    deviceId?: string,
  ): Record<string, string> {
    return {
      // Required for Stripe Radar
      missionId,
      userId,
      platform: 'workon',
      // Optional signals for Radar
      ...(ipAddress && { client_ip: ipAddress }),
      ...(userAgent && { user_agent: userAgent.substring(0, 255) }), // Stripe limit
      ...(deviceId && { device_id: deviceId }),
      created_at: new Date().toISOString(),
    };
  }

  /**
   * Log payment event to TrustAuditLog
   */
  async logPaymentEvent(
    event: 'initiated' | 'authorized' | 'captured' | 'failed' | 'refunded' | 'disputed',
    userId: string | null,
    paymentId: string,
    missionId: string,
    amountCents: number,
    metadata?: Record<string, unknown>,
    correlationId?: string,
  ): Promise<void> {
    const eventMap = {
      initiated: AuditLoggerService.EVENTS.PAYMENT_INITIATED,
      authorized: AuditLoggerService.EVENTS.PAYMENT_INITIATED,
      captured: AuditLoggerService.EVENTS.PAYMENT_COMPLETED,
      failed: AuditLoggerService.EVENTS.PAYMENT_FAILED,
      refunded: AuditLoggerService.EVENTS.PAYMENT_REFUNDED,
      disputed: AuditLoggerService.EVENTS.PAYMENT_FAILED,
    };

    this.auditLogger.logBusinessEvent(
      eventMap[event],
      {
        paymentId,
        missionId,
        amountCents,
        currency: 'CAD',
        event,
        ...metadata,
      },
      correlationId,
    );

    // Also persist to TrustAuditLog table for long-term retention
    try {
      await this.prisma.trustAuditLog.create({
        data: {
          category: 'PAYMENT',
          action: `payment_${event}`,
          actorId: userId,
          actorType: userId ? 'user' : 'system',
          targetType: 'payment',
          targetId: paymentId,
          newValue: {
            missionId,
            amountCents,
            currency: 'CAD',
            ...metadata,
          },
        },
      });
    } catch (error) {
      // Don't fail the payment if audit log fails
      this.logger.error(`Failed to persist audit log: ${error}`);
    }
  }

  /**
   * Log security event (velocity blocks, suspicious activity)
   */
  private logSecurityEvent(
    event: string,
    userId: string,
    details: Record<string, unknown>,
  ): void {
    this.auditLogger.logBusinessWarning(
      event,
      `Security event: ${event}`,
      { userId, ...details },
    );

    // Persist to TrustAuditLog
    this.prisma.trustAuditLog
      .create({
        data: {
          category: 'SECURITY',
          action: event.toLowerCase(),
          actorId: userId,
          actorType: 'user',
          targetType: 'payment',
          targetId: 'velocity_check',
          newValue: details as object,
        },
      })
      .catch((err) => this.logger.error(`Failed to log security event: ${err}`));
  }

  /**
   * Validate webhook idempotency
   * @returns true if event should be processed, false if already processed
   */
  async checkWebhookIdempotency(
    paymentId: string,
    eventId: string,
  ): Promise<boolean> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      select: { lastStripeEventId: true },
    });

    if (payment?.lastStripeEventId === eventId) {
      this.logger.log(`Webhook event ${eventId} already processed for payment ${paymentId}`);
      return false;
    }

    return true;
  }

  /**
   * Mark webhook event as processed
   */
  async markWebhookProcessed(paymentId: string, eventId: string): Promise<void> {
    await this.prisma.payment.update({
      where: { id: paymentId },
      data: { lastStripeEventId: eventId },
    });
  }
}

