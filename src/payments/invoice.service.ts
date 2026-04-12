import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
// InvoiceStatus imported from Prisma but managed internally
import Stripe from 'stripe';
import { getAppConfig } from '../config/safe-defaults.config';

/**
 * Invoice calculation result
 */
export interface InvoiceCalculation {
  subtotalCents: number;
  platformFeeCents: number;
  taxesCents: number;
  totalCents: number;
  currency: string;
  description: string;
  platformFeeRate: number;
}

/**
 * Checkout result
 */
export interface CheckoutResult {
  invoiceId: string;
  checkoutUrl: string;
  sessionId: string;
}

@Injectable()
export class InvoiceService {
  private readonly stripe?: Stripe;
  private readonly logger = new Logger(InvoiceService.name);
  
  // Platform fee from centralized config (default 15%)
  private readonly PLATFORM_FEE_RATE: number;

  // Tax rates (Quebec - TPS 5% + TVQ 9.975%)
  private readonly TAX_ENABLED: boolean;
  private readonly TPS_RATE = 0.05;
  private readonly TVQ_RATE = 0.09975;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const appConfig = getAppConfig();
    this.PLATFORM_FEE_RATE = appConfig.payments.platformFeePercent / 100;
    // Default: enabled in production, disabled in dev (override with TAX_ENABLED env var)
    const taxEnvVar = this.configService.get<string>('TAX_ENABLED');
    this.TAX_ENABLED = taxEnvVar !== undefined
      ? taxEnvVar === 'true'
      : process.env.NODE_ENV === 'production';

    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      this.logger.warn('STRIPE_SECRET_KEY not configured - payment features disabled');
      this.stripe = undefined;
    } else {
      this.stripe = new Stripe(stripeSecretKey);
      this.logger.log(`✅ InvoiceService: Stripe initialized (fee: ${this.PLATFORM_FEE_RATE * 100}%, tax: ${this.TAX_ENABLED ? 'ON' : 'OFF'})`);
    }
  }

  private ensureStripeConfigured(): void {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured. Set STRIPE_SECRET_KEY in environment.');
    }
  }

  /**
   * Calculate invoice for a LocalMission
   * Source of truth for all amounts - NEVER trust client-side calculations
   */
  calculateInvoice(priceCents: number, description: string): InvoiceCalculation {
    if (priceCents <= 0) {
      throw new BadRequestException('Price must be greater than 0');
    }

    const subtotalCents = priceCents;
    const platformFeeCents = Math.ceil(subtotalCents * this.PLATFORM_FEE_RATE);
    
    let taxesCents = 0;
    if (this.TAX_ENABLED) {
      // Taxes on subtotal only (not on platform fee)
      const tpsCents = Math.ceil(subtotalCents * this.TPS_RATE);
      const tvqCents = Math.ceil(subtotalCents * this.TVQ_RATE);
      taxesCents = tpsCents + tvqCents;
    }

    const totalCents = subtotalCents + platformFeeCents + taxesCents;

    return {
      subtotalCents,
      platformFeeCents,
      taxesCents,
      totalCents,
      currency: 'CAD',
      description,
      platformFeeRate: this.PLATFORM_FEE_RATE,
    };
  }

  /**
   * Create a Stripe Checkout Session for a LocalMission
   * Returns checkout URL for mobile/web redirect
   */
  async createCheckoutSession(
    localMissionId: string,
    payerLocalUserId: string,
  ): Promise<CheckoutResult> {
    this.ensureStripeConfigured();

    // 1. Fetch mission and validate
    const mission = await this.prisma.localMission.findUnique({
      where: { id: localMissionId },
      include: {
        createdByUser: { select: { id: true, email: true, firstName: true } },
        assignedToUser: { select: { id: true, email: true, firstName: true } },
      },
    });

    if (!mission) {
      throw new NotFoundException('Mission not found');
    }

    // 2. Validate payer is the mission creator (employer)
    if (mission.createdByUserId !== payerLocalUserId) {
      throw new ForbiddenException('Only the mission creator can pay');
    }

    // 3. Validate mission status
    const payableStatuses = ['completed'];
    if (!payableStatuses.includes(mission.status)) {
      throw new BadRequestException(
        `Cannot pay for mission in status "${mission.status}". Must be "completed".`
      );
    }

    // 4. Check for existing pending invoice
    const existingInvoice = await this.prisma.invoice.findFirst({
      where: {
        localMissionId,
        status: { in: ['PENDING', 'PROCESSING'] },
      },
    });

    if (existingInvoice) {
      // If we have an existing checkout session, return it
      if (existingInvoice.stripeCheckoutSessionId && existingInvoice.status === 'PROCESSING') {
        try {
          const session = await this.stripe!.checkout.sessions.retrieve(
            existingInvoice.stripeCheckoutSessionId
          );
          if (session.status === 'open' && session.url) {
            this.logger.log(`Returning existing checkout session: ${session.id}`);
            return {
              invoiceId: existingInvoice.id,
              checkoutUrl: session.url,
              sessionId: session.id,
            };
          }
        } catch (err) {
          this.logger.warn(`Existing session invalid, creating new one`);
        }
      }
    }

    // 5. Calculate invoice (source of truth)
    const priceCents = Math.round(mission.price * 100);
    const calculation = this.calculateInvoice(priceCents, `Mission: ${mission.title}`);

    // 6. Get URLs from config
    const appPublicUrl = this.configService.get<string>('APP_PUBLIC_URL') || 'http://localhost:3000';
    const successUrl = this.configService.get<string>('STRIPE_SUCCESS_URL') 
      || `${appPublicUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = this.configService.get<string>('STRIPE_CANCEL_URL') 
      || `${appPublicUrl}/payment/cancel`;

    // 7. Create or update invoice in DB
    const invoice = await this.prisma.invoice.upsert({
      where: existingInvoice ? { id: existingInvoice.id } : { id: `inv_new_${Date.now()}` },
      update: {
        subtotalCents: calculation.subtotalCents,
        platformFeeCents: calculation.platformFeeCents,
        taxesCents: calculation.taxesCents,
        totalCents: calculation.totalCents,
        status: 'PROCESSING',
        updatedAt: new Date(),
      },
      create: {
        localMissionId,
        payerLocalUserId,
        payerUserId: payerLocalUserId, // For compatibility
        subtotalCents: calculation.subtotalCents,
        platformFeeCents: calculation.platformFeeCents,
        taxesCents: calculation.taxesCents,
        totalCents: calculation.totalCents,
        currency: calculation.currency,
        description: calculation.description,
        status: 'PENDING',
      },
    });

    // 8. Create Stripe Checkout Session
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        price_data: {
          currency: 'cad',
          product_data: {
            name: mission.title,
            description: `Service: ${mission.category}`,
          },
          unit_amount: calculation.subtotalCents,
        },
        quantity: 1,
      },
      {
        price_data: {
          currency: 'cad',
          product_data: {
            name: 'WorkOn Platform Fee',
            description: `Platform service fee (${this.PLATFORM_FEE_RATE * 100}%)`,
          },
          unit_amount: calculation.platformFeeCents,
        },
        quantity: 1,
      },
    ];

    // Add tax line items if taxes are enabled (Quebec TPS/TVQ)
    if (this.TAX_ENABLED && calculation.taxesCents > 0) {
      const tpsCents = Math.ceil(calculation.subtotalCents * this.TPS_RATE);
      const tvqCents = Math.ceil(calculation.subtotalCents * this.TVQ_RATE);
      lineItems.push(
        {
          price_data: {
            currency: 'cad',
            product_data: {
              name: 'TPS (GST)',
              description: `Taxe sur les produits et services (${this.TPS_RATE * 100}%)`,
            },
            unit_amount: tpsCents,
          },
          quantity: 1,
        },
        {
          price_data: {
            currency: 'cad',
            product_data: {
              name: 'TVQ (QST)',
              description: `Taxe de vente du Québec (${this.TVQ_RATE * 100}%)`,
            },
            unit_amount: tvqCents,
          },
          quantity: 1,
        },
      );
    }

    const session = await this.stripe!.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: lineItems,
      metadata: {
        invoiceId: invoice.id,
        localMissionId: mission.id,
        payerLocalUserId,
        type: 'local_mission_payment',
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
      expires_at: Math.floor(Date.now() / 1000) + (30 * 60), // 30 minutes
    });

    // 9. Update invoice with session ID
    await this.prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        stripeCheckoutSessionId: session.id,
        status: 'PROCESSING',
      },
    });

    this.logger.log(
      `Checkout session created: ${session.id} for invoice ${invoice.id}, ` +
      `total: ${calculation.totalCents / 100} ${calculation.currency}`
    );

    return {
      invoiceId: invoice.id,
      checkoutUrl: session.url!,
      sessionId: session.id,
    };
  }

  /**
   * Get invoice by ID
   */
  async getInvoice(invoiceId: string, requesterId?: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    // Optional: verify requester is the payer
    if (requesterId && invoice.payerUserId !== requesterId && invoice.payerLocalUserId !== requesterId) {
      throw new ForbiddenException('You can only view your own invoices');
    }

    return {
      id: invoice.id,
      missionId: invoice.missionId || invoice.localMissionId,
      subtotal: invoice.subtotalCents / 100,
      platformFee: invoice.platformFeeCents / 100,
      taxes: invoice.taxesCents / 100,
      total: invoice.totalCents / 100,
      currency: invoice.currency,
      status: invoice.status,
      description: invoice.description,
      paidAt: invoice.paidAt,
      createdAt: invoice.createdAt,
    };
  }

  /**
   * Handle Stripe webhook event (checkout.session.completed)
   * Updates invoice and mission status
   */
  async handleCheckoutCompleted(session: Stripe.Checkout.Session, eventId: string): Promise<void> {
    const invoiceId = session.metadata?.invoiceId;
    const localMissionId = session.metadata?.localMissionId;

    if (!invoiceId) {
      this.logger.warn(`Checkout session ${session.id} has no invoiceId in metadata`);
      return;
    }

    // 1. Check idempotence
    const existingEvent = await this.prisma.stripeEvent.findUnique({
      where: { id: eventId },
    });

    if (existingEvent?.processed) {
      this.logger.debug(`Event ${eventId} already processed, skipping`);
      return;
    }

    // 2. Record event for idempotence
    await this.prisma.stripeEvent.upsert({
      where: { id: eventId },
      update: { processed: true, processedAt: new Date() },
      create: {
        id: eventId,
        type: 'checkout.session.completed',
        processed: true,
        processedAt: new Date(),
      },
    });

    // 3. Use transaction for invoice + mission update
    const invoice = await this.prisma.$transaction(async (tx) => {
      const inv = await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          status: 'PAID',
          paidAt: new Date(),
          stripePaymentIntentId: session.payment_intent as string,
        },
      });

      if (localMissionId) {
        await tx.localMission.update({
          where: { id: localMissionId },
          data: {
            status: 'paid',
            paidAt: new Date(),
            stripePaymentIntentId: session.payment_intent as string,
          },
        });
      }

      return inv;
    });

    this.logger.log(`Invoice ${invoiceId} marked as PAID (transaction committed)`);

    // 4. Auto-payout to worker via Stripe Connect (outside transaction — external call)
    if (localMissionId && this.stripe && session.payment_intent) {
      const mission = await this.prisma.localMission.findUnique({
        where: { id: localMissionId },
        include: {
          assignedToUser: {
            select: { id: true, stripeAccountId: true },
          },
        },
      });

      if (mission?.assignedToUser?.stripeAccountId) {
        try {
          // Check payoutsEnabled before transferring
          const account = await this.stripe.accounts.retrieve(
            mission.assignedToUser.stripeAccountId,
          );

          if (!account.payouts_enabled) {
            this.logger.error(
              `Worker ${mission.assignedToUser.id} Stripe account payouts not enabled. ` +
              `Transfer deferred for mission ${localMissionId}. Manual payout required.`,
            );
            return;
          }

          const workerAmount = invoice.subtotalCents;

          await this.stripe.transfers.create({
            amount: workerAmount,
            currency: 'cad',
            destination: mission.assignedToUser.stripeAccountId,
            transfer_group: `mission_${localMissionId}`,
            metadata: {
              invoiceId: invoice.id,
              missionId: localMissionId,
              workerId: mission.assignedToUser.id,
            },
          });

          this.logger.log(
            `Payout of ${workerAmount / 100} CAD sent to worker ${mission.assignedToUser.id} ` +
            `(Stripe account: ${mission.assignedToUser.stripeAccountId})`,
          );
        } catch (payoutErr) {
          this.logger.error(
            `CRITICAL: Failed to create payout for mission ${localMissionId}. ` +
            `Invoice ${invoice.id} is PAID but worker transfer failed. ` +
            `Error: ${payoutErr instanceof Error ? payoutErr.message : String(payoutErr)}. ` +
            `MANUAL PAYOUT REQUIRED.`,
          );
          // Don't fail the webhook — payout can be retried manually
        }
      }
    }
  }

  /**
   * Handle expired checkout session
   */
  async handleCheckoutExpired(session: Stripe.Checkout.Session, eventId: string): Promise<void> {
    const invoiceId = session.metadata?.invoiceId;

    if (!invoiceId) return;

    // Record event
    await this.prisma.stripeEvent.upsert({
      where: { id: eventId },
      update: { processed: true, processedAt: new Date() },
      create: {
        id: eventId,
        type: 'checkout.session.expired',
        processed: true,
        processedAt: new Date(),
      },
    });

    // Update invoice status
    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: 'CANCELLED' },
    });

    this.logger.log(`Invoice ${invoiceId} cancelled (session expired)`);
  }
}

