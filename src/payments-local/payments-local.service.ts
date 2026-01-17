import {
  Injectable,
  BadRequestException,
  ServiceUnavailableException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import Stripe from 'stripe';

/**
 * Payments Service - Stripe PaymentIntent management
 * 
 * Handles payment processing for missions
 * Stripe is optional in development, required in production
 */
@Injectable()
export class PaymentsLocalService {
  private stripe: Stripe | null;
  private readonly logger = new Logger(PaymentsLocalService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    const isDev = this.configService.get<string>('NODE_ENV') !== 'production';

    if (stripeSecretKey) {
      this.stripe = new Stripe(stripeSecretKey, {
        apiVersion: '2025-02-24.acacia',
      });
      this.logger.log('✅ Stripe initialized successfully');
    } else {
      this.stripe = null;
      if (isDev) {
        this.logger.warn(
          '⚠️  Stripe not configured. Payment features disabled in development.',
        );
      } else {
        this.logger.error(
          '❌ STRIPE_SECRET_KEY required in production. Payments will fail.',
        );
      }
    }
  }

  /**
   * Create a PaymentIntent for a mission
   * 
   * @param missionId Mission ID
   * @param userId User ID (must be mission creator)
   * @param userRole User role
   */
  async createPaymentIntent(
    missionId: string,
    userId: string,
    userRole: string,
  ) {
    // Check if Stripe is configured
    if (!this.stripe) {
      throw new ServiceUnavailableException(
        'Payment service not configured. Set STRIPE_SECRET_KEY in .env to enable payments.',
      );
    }

    // Only employers and residential clients can create payments
    if (userRole !== 'employer' && userRole !== 'residential_client') {
      throw new BadRequestException(
        'Only employers and residential clients can create payments',
      );
    }

    // Find mission
    const mission = await this.prisma.localMission.findUnique({
      where: { id: missionId },
    });

    if (!mission) {
      throw new NotFoundException('Mission not found');
    }

    // Verify user is the mission creator
    if (mission.createdByUserId !== userId) {
      throw new BadRequestException(
        'You can only create payments for your own missions',
      );
    }

    // Mission must be completed to create payment
    if (mission.status !== 'completed') {
      throw new BadRequestException(
        'Payment can only be created for completed missions',
      );
    }

    // Convert price to cents
    const amountInCents = Math.round(mission.price * 100);

    try {
      // Create Stripe PaymentIntent
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: amountInCents,
        currency: 'cad',
        metadata: {
          missionId: mission.id,
          missionTitle: mission.title,
          userId: userId,
        },
        description: `Payment for mission: ${mission.title}`,
      });

      this.logger.log(
        `PaymentIntent created: ${paymentIntent.id} for mission ${missionId}`,
      );

      return {
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret!,
        amount: amountInCents,
        currency: 'CAD',
        missionId: mission.id,
      };
    } catch (error: any) {
      this.logger.error(
        `Failed to create PaymentIntent: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(
        `Failed to create payment: ${error.message}`,
      );
    }
  }

  /**
   * Handle Stripe webhook events
   * 
   * PR-6: Full webhook implementation
   * - Verify webhook signature
   * - Handle payment_intent.succeeded → mark mission as paid
   * - Handle payment_intent.payment_failed → log warning
   */
  async handleWebhook(rawBody: Buffer, signature: string) {
    if (!this.stripe) {
      throw new ServiceUnavailableException('Stripe not configured');
    }

    const webhookSecret = this.configService.get<string>(
      'STRIPE_WEBHOOK_SECRET',
    );

    if (!webhookSecret) {
      throw new ServiceUnavailableException(
        'Stripe webhook secret not configured',
      );
    }

    try {
      // Verify webhook signature
      const event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret,
      );

      this.logger.log(`[Webhook] Event received: ${event.type}`);

      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
          break;

        case 'payment_intent.payment_failed':
          this.handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
          break;

        default:
          this.logger.log(`[Webhook] Unhandled event type: ${event.type}`);
      }

      return { received: true };
    } catch (error: any) {
      this.logger.error(
        `[Webhook] Error: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(`Webhook error: ${error.message}`);
    }
  }

  /**
   * Get payment history for local missions
   */
  async getPaymentHistory(userId: string) {
    const missions = await this.prisma.localMission.findMany({
      where: {
        createdByUserId: userId,
        stripePaymentIntentId: { not: null },
      },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        price: true,
        status: true,
        stripePaymentIntentId: true,
        updatedAt: true,
        createdAt: true,
      },
    });

    return missions.map((mission) => ({
      id: mission.stripePaymentIntentId ?? mission.id,
      amount: Math.round(mission.price * 100),
      currency: 'CAD',
      status: mission.status,
      missionId: mission.id,
      missionTitle: mission.title,
      createdAt: mission.updatedAt ?? mission.createdAt,
      description: `Paiement mission: ${mission.title}`,
    }));
  }

  /**
   * Handle successful payment
   * 
   * PR-6: Mark mission as paid in database
   */
  private async handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
    const missionId = paymentIntent.metadata?.missionId;

    if (!missionId) {
      this.logger.warn(
        `[Webhook] payment_intent.succeeded without missionId: ${paymentIntent.id}`,
      );
      return;
    }

    this.logger.log(
      `[Webhook] Payment succeeded for mission ${missionId}, PI: ${paymentIntent.id}`,
    );

    try {
      // Update mission status to paid
      const mission = await this.prisma.localMission.update({
        where: { id: missionId },
        data: {
          status: 'paid',
          paidAt: new Date(),
          stripePaymentIntentId: paymentIntent.id,
          updatedAt: new Date(),
        },
      });

      this.logger.log(
        `[Webhook] ✅ Mission ${missionId} marked as PAID (amount: ${paymentIntent.amount / 100} ${paymentIntent.currency.toUpperCase()})`,
      );

      return mission;
    } catch (error: any) {
      // Mission not found or already updated - idempotent
      if (error.code === 'P2025') {
        this.logger.warn(
          `[Webhook] Mission ${missionId} not found - may have been deleted`,
        );
        return;
      }
      throw error;
    }
  }

  /**
   * Handle failed payment
   * 
   * PR-6: Log payment failure for audit
   */
  private handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
    const missionId = paymentIntent.metadata?.missionId;
    const error = paymentIntent.last_payment_error;

    this.logger.warn(
      `[Webhook] ❌ Payment FAILED for mission ${missionId || 'unknown'}`,
      {
        paymentIntentId: paymentIntent.id,
        errorCode: error?.code,
        errorMessage: error?.message,
      },
    );
  }
}

