import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import Stripe from 'stripe';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionPlan, SubscriptionStatus } from '@prisma/client';
import { CheckoutPlan } from './dto/checkout.dto';

/**
 * Plans eligible for checkout. FREE is default, never sold.
 * Legacy PRO / PREMIUM are kept in the enum but not offered.
 */
const CHECKOUT_PLANS = new Set<string>([
  'CLIENT_PRO',
  'WORKER_PRO',
  'CLIENT_BUSINESS',
]);

const PLAN_TO_PRICE_ENV: Record<CheckoutPlan, string> = {
  CLIENT_PRO: 'STRIPE_PRICE_CLIENT_PRO_MONTHLY',
  WORKER_PRO: 'STRIPE_PRICE_WORKER_PRO_MONTHLY',
  CLIENT_BUSINESS: 'STRIPE_PRICE_CLIENT_BUSINESS_MONTHLY',
};

const PAID_STATUSES: SubscriptionStatus[] = [
  SubscriptionStatus.ACTIVE,
  SubscriptionStatus.TRIALING,
];

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);
  private readonly stripe: Stripe | null;
  private readonly webhookSecret: string | undefined;

  constructor(private readonly prisma: PrismaService) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    this.webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!secretKey) {
      this.logger.warn(
        'STRIPE_SECRET_KEY not set — subscription checkout disabled',
      );
      this.stripe = null;
    } else {
      this.stripe = new Stripe(secretKey, { apiVersion: '2025-02-24.acacia' });
    }
  }

  private ensureStripe(): Stripe {
    if (!this.stripe) {
      throw new BadRequestException(
        'Stripe not configured. Set STRIPE_SECRET_KEY to enable subscriptions.',
      );
    }
    return this.stripe;
  }

  /**
   * Resolve active subscription for a user. Returns FREE placeholder
   * if none found.
   */
  async getMySubscription(userId: string) {
    const sub = await this.prisma.subscription.findFirst({
      where: { userId, status: { in: PAID_STATUSES } },
      orderBy: { startedAt: 'desc' },
    });

    if (!sub) {
      return {
        plan: SubscriptionPlan.FREE as SubscriptionPlan,
        status: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      };
    }

    return {
      id: sub.id,
      plan: sub.plan,
      status: sub.status,
      currentPeriodEnd: sub.currentPeriodEnd,
      cancelAtPeriodEnd: Boolean(sub.canceledAt),
      stripeSubscriptionId: sub.stripeSubscriptionId,
    };
  }

  /**
   * Check if the user has any active paid plan (not FREE).
   */
  async hasActiveSubscription(userId: string): Promise<boolean> {
    const sub = await this.prisma.subscription.findFirst({
      where: {
        userId,
        status: { in: PAID_STATUSES },
        plan: { not: SubscriptionPlan.FREE },
      },
      select: { id: true },
    });
    return !!sub;
  }

  /**
   * Check if the user has one of the listed plans active.
   */
  async hasPlan(userId: string, plans: SubscriptionPlan[]): Promise<boolean> {
    const sub = await this.prisma.subscription.findFirst({
      where: {
        userId,
        status: { in: PAID_STATUSES },
        plan: { in: plans },
      },
      select: { id: true },
    });
    return !!sub;
  }

  /**
   * Create a Stripe Checkout Session for a plan.
   */
  async createCheckout(
    userId: string,
    plan: CheckoutPlan,
    opts: { successUrl?: string; cancelUrl?: string },
  ): Promise<{ url: string; sessionId: string }> {
    if (!CHECKOUT_PLANS.has(plan)) {
      throw new BadRequestException('Plan invalide');
    }

    const stripe = this.ensureStripe();
    const priceId = process.env[PLAN_TO_PRICE_ENV[plan]];

    if (!priceId) {
      throw new InternalServerErrorException(
        `Stripe price ID manquant (${PLAN_TO_PRICE_ENV[plan]} non configuré)`,
      );
    }

    const user = await this.prisma.localUser.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const frontendBase =
      process.env.FRONTEND_URL ||
      process.env.CORS_ORIGIN?.split(',')[0] ||
      'https://workonapp.vercel.app';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url:
        opts.successUrl || `${frontendBase}/settings/subscription?ok=1`,
      cancel_url:
        opts.cancelUrl || `${frontendBase}/pricing?canceled=1`,
      client_reference_id: userId,
      metadata: { userId, plan },
      subscription_data: { metadata: { userId, plan } },
    });

    if (!session.url) {
      throw new InternalServerErrorException('Stripe session URL missing');
    }

    this.logger.log(
      `Checkout session created: ${session.id} for userId=${userId} plan=${plan}`,
    );

    return { url: session.url, sessionId: session.id };
  }

  /**
   * Cancel an active subscription at period end.
   */
  async cancelMine(userId: string): Promise<{ canceledAt: Date }> {
    const stripe = this.ensureStripe();

    const sub = await this.prisma.subscription.findFirst({
      where: { userId, status: { in: PAID_STATUSES } },
      orderBy: { startedAt: 'desc' },
    });

    if (!sub || !sub.stripeSubscriptionId) {
      throw new NotFoundException('Aucun abonnement actif à annuler');
    }

    await stripe.subscriptions.update(sub.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    const canceledAt = new Date();
    await this.prisma.subscription.update({
      where: { id: sub.id },
      data: { canceledAt },
    });

    this.logger.log(`Subscription canceled (period-end): ${sub.id}`);
    return { canceledAt };
  }

  /**
   * Verify Stripe webhook signature and return the parsed event.
   */
  verifyWebhook(rawBody: Buffer, signature: string): Stripe.Event {
    const stripe = this.ensureStripe();
    if (!this.webhookSecret) {
      throw new BadRequestException(
        'STRIPE_WEBHOOK_SECRET not configured on this environment',
      );
    }
    return stripe.webhooks.constructEvent(
      rawBody,
      signature,
      this.webhookSecret,
    );
  }

  /**
   * Handle a Stripe webhook event. Idempotent — rejects duplicate event
   * IDs via SubscriptionEvent.stripeEventId unique constraint.
   */
  async handleWebhook(event: Stripe.Event): Promise<{ handled: boolean }> {
    // Only act on subscription-related events
    const relevant = [
      'checkout.session.completed',
      'customer.subscription.created',
      'customer.subscription.updated',
      'customer.subscription.deleted',
      'invoice.paid',
      'invoice.payment_failed',
    ];
    if (!relevant.includes(event.type)) {
      return { handled: false };
    }

    try {
      if (event.type === 'checkout.session.completed') {
        await this.onCheckoutCompleted(event);
      } else if (event.type === 'customer.subscription.created' ||
                 event.type === 'customer.subscription.updated') {
        await this.syncFromSubscription(event);
      } else if (event.type === 'customer.subscription.deleted') {
        await this.onSubscriptionDeleted(event);
      } else if (event.type === 'invoice.paid') {
        await this.onInvoicePaid(event);
      } else if (event.type === 'invoice.payment_failed') {
        await this.onInvoiceFailed(event);
      }
      return { handled: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Webhook handler failed for ${event.type} (${event.id}): ${msg}`,
      );
      throw err;
    }
  }

  private async recordEvent(
    subscriptionId: string,
    event: Stripe.Event,
  ): Promise<boolean> {
    try {
      await this.prisma.subscriptionEvent.create({
        data: {
          subscriptionId,
          stripeEventId: event.id,
          type: event.type,
          payload: event.data.object as any,
        },
      });
      return true;
    } catch (err) {
      // Duplicate stripeEventId = already processed → skip
      const code = (err as { code?: string })?.code;
      if (code === 'P2002') {
        this.logger.log(`Event ${event.id} already processed — skipping`);
        return false;
      }
      throw err;
    }
  }

  private planFromPriceId(priceId: string | null | undefined): SubscriptionPlan {
    if (!priceId) return SubscriptionPlan.FREE;
    if (priceId === process.env.STRIPE_PRICE_CLIENT_PRO_MONTHLY) {
      return SubscriptionPlan.CLIENT_PRO;
    }
    if (priceId === process.env.STRIPE_PRICE_WORKER_PRO_MONTHLY) {
      return SubscriptionPlan.WORKER_PRO;
    }
    if (priceId === process.env.STRIPE_PRICE_CLIENT_BUSINESS_MONTHLY) {
      return SubscriptionPlan.CLIENT_BUSINESS;
    }
    return SubscriptionPlan.FREE;
  }

  private mapStatus(stripeStatus: string): SubscriptionStatus {
    switch (stripeStatus) {
      case 'active':
        return SubscriptionStatus.ACTIVE;
      case 'past_due':
        return SubscriptionStatus.PAST_DUE;
      case 'canceled':
        return SubscriptionStatus.CANCELED;
      case 'trialing':
        return SubscriptionStatus.TRIALING;
      case 'incomplete':
      case 'incomplete_expired':
      case 'unpaid':
        return SubscriptionStatus.INCOMPLETE;
      default:
        return SubscriptionStatus.ACTIVE;
    }
  }

  private async onCheckoutCompleted(event: Stripe.Event): Promise<void> {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.client_reference_id || session.metadata?.userId;
    const stripeSubId = typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription?.id;
    const stripeCustId = typeof session.customer === 'string'
      ? session.customer
      : session.customer?.id;

    if (!userId || !stripeSubId) {
      this.logger.warn(
        `checkout.session.completed missing userId/subscription: ${session.id}`,
      );
      return;
    }

    // Fetch subscription details to get priceId
    const stripe = this.ensureStripe();
    const stripeSub = await stripe.subscriptions.retrieve(stripeSubId);
    const priceId = stripeSub.items.data[0]?.price?.id;
    const plan = this.planFromPriceId(priceId);

    const existingByStripe = await this.prisma.subscription.findUnique({
      where: { stripeSubscriptionId: stripeSubId },
    });

    const sub = existingByStripe
      ? await this.prisma.subscription.update({
          where: { id: existingByStripe.id },
          data: {
            status: this.mapStatus(stripeSub.status),
            plan,
            stripeCustomerId: stripeCustId ?? undefined,
            currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
            updatedAt: new Date(),
          },
        })
      : await this.prisma.subscription.create({
          data: {
            id: `sub_${crypto.randomUUID().replace(/-/g, '')}`,
            userId,
            plan,
            status: this.mapStatus(stripeSub.status),
            stripeCustomerId: stripeCustId,
            stripeSubscriptionId: stripeSubId,
            currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
            updatedAt: new Date(),
          },
        });

    await this.recordEvent(sub.id, event);
    this.logger.log(`Subscription activated: ${sub.id} (${plan}) for ${userId}`);
  }

  private async syncFromSubscription(event: Stripe.Event): Promise<void> {
    const s = event.data.object as Stripe.Subscription;
    const sub = await this.prisma.subscription.findUnique({
      where: { stripeSubscriptionId: s.id },
    });
    if (!sub) {
      this.logger.warn(
        `subscription ${event.type} for unknown stripeSubId=${s.id} — skipping`,
      );
      return;
    }
    const priceId = s.items.data[0]?.price?.id;
    const plan = this.planFromPriceId(priceId);

    const updated = await this.prisma.subscription.update({
      where: { id: sub.id },
      data: {
        status: this.mapStatus(s.status),
        plan,
        currentPeriodEnd: new Date(s.current_period_end * 1000),
        canceledAt: s.cancel_at_period_end ? new Date() : null,
        updatedAt: new Date(),
      },
    });
    await this.recordEvent(updated.id, event);
  }

  private async onSubscriptionDeleted(event: Stripe.Event): Promise<void> {
    const s = event.data.object as Stripe.Subscription;
    const sub = await this.prisma.subscription.findUnique({
      where: { stripeSubscriptionId: s.id },
    });
    if (!sub) return;
    const updated = await this.prisma.subscription.update({
      where: { id: sub.id },
      data: {
        status: SubscriptionStatus.CANCELED,
        canceledAt: new Date(),
        updatedAt: new Date(),
      },
    });
    await this.recordEvent(updated.id, event);
  }

  private async onInvoicePaid(event: Stripe.Event): Promise<void> {
    const invoice = event.data.object as Stripe.Invoice;
    const stripeSubId = typeof invoice.subscription === 'string'
      ? invoice.subscription
      : invoice.subscription?.id;
    if (!stripeSubId) return;
    const sub = await this.prisma.subscription.findUnique({
      where: { stripeSubscriptionId: stripeSubId },
    });
    if (!sub) return;
    await this.recordEvent(sub.id, event);
  }

  private async onInvoiceFailed(event: Stripe.Event): Promise<void> {
    const invoice = event.data.object as Stripe.Invoice;
    const stripeSubId = typeof invoice.subscription === 'string'
      ? invoice.subscription
      : invoice.subscription?.id;
    if (!stripeSubId) return;
    const sub = await this.prisma.subscription.findUnique({
      where: { stripeSubscriptionId: stripeSubId },
    });
    if (!sub) return;
    const updated = await this.prisma.subscription.update({
      where: { id: sub.id },
      data: { status: SubscriptionStatus.PAST_DUE, updatedAt: new Date() },
    });
    await this.recordEvent(updated.id, event);
  }

  /**
   * Count missions created by user this calendar month.
   * Used by MissionQuotaGuard.
   */
  async missionsThisMonth(userId: string): Promise<number> {
    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);

    return this.prisma.localMission.count({
      where: {
        createdByUserId: userId,
        createdAt: { gte: start },
      },
    });
  }
}
