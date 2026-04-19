import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import Stripe from 'stripe';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { BoostStatus, BoostType } from '@prisma/client';

const BOOST_CONFIG: Record<
  BoostType,
  { amountCents: number; durationMs: number | null; label: string }
> = {
  URGENT_9: {
    amountCents: 900,
    durationMs: 24 * 60 * 60 * 1000, // 24h
    label: 'Mission urgente',
  },
  TOP_48H_14: {
    amountCents: 1400,
    durationMs: 48 * 60 * 60 * 1000, // 48h
    label: 'Top visibilité 48h',
  },
  VERIFY_EXPRESS_19: {
    amountCents: 1900,
    durationMs: null, // account-level, no expiry on the boost itself
    label: 'Vérification express',
  },
};

@Injectable()
export class BoostsService {
  private readonly logger = new Logger(BoostsService.name);
  private readonly stripe: Stripe | null;
  private readonly webhookSecret?: string;

  constructor(private readonly prisma: PrismaService) {
    const secret = process.env.STRIPE_SECRET_KEY;
    this.webhookSecret =
      process.env.STRIPE_BOOSTS_WEBHOOK_SECRET ||
      process.env.STRIPE_WEBHOOK_SECRET;
    this.stripe = secret
      ? new Stripe(secret, { apiVersion: '2025-02-24.acacia' })
      : null;
    if (!secret) this.logger.warn('STRIPE_SECRET_KEY not set — boosts disabled');
  }

  private ensureStripe(): Stripe {
    if (!this.stripe) {
      throw new BadRequestException('Stripe not configured');
    }
    return this.stripe;
  }

  private async assertMissionOwner(
    missionId: string,
    userId: string,
  ): Promise<void> {
    const m = await this.prisma.localMission.findUnique({
      where: { id: missionId },
      select: { createdByUserId: true },
    });
    if (!m) throw new NotFoundException('Mission introuvable');
    if (m.createdByUserId !== userId) {
      throw new ForbiddenException(
        "Vous ne pouvez booster que vos propres missions",
      );
    }
  }

  /**
   * Create a Stripe PaymentIntent for a boost. Returns clientSecret so
   * the frontend can confirm with Stripe.js. Boost row is created in
   * PENDING state and upgraded to PAID by the webhook handler.
   */
  async createBoost(
    userId: string,
    type: BoostType,
    missionId?: string,
  ): Promise<{ boostId: string; clientSecret: string; amountCents: number }> {
    const stripe = this.ensureStripe();
    const cfg = BOOST_CONFIG[type];

    // Mission-scoped boosts require ownership
    if (type !== BoostType.VERIFY_EXPRESS_19) {
      if (!missionId) {
        throw new BadRequestException('missionId requis pour ce type de boost');
      }
      await this.assertMissionOwner(missionId, userId);
    }

    const user = await this.prisma.localUser.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const id = `bst_${crypto.randomUUID().replace(/-/g, '')}`;

    // Create PaymentIntent FIRST so we have stripePaymentIntentId
    const pi = await stripe.paymentIntents.create({
      amount: cfg.amountCents,
      currency: 'cad',
      metadata: {
        userId,
        boostId: id,
        type,
        missionId: missionId ?? '',
      },
      description: `${cfg.label}${missionId ? ` — mission ${missionId}` : ''}`,
      receipt_email: user.email || undefined,
    });

    if (!pi.client_secret) {
      throw new InternalServerErrorException('Stripe clientSecret missing');
    }

    await this.prisma.boost.create({
      data: {
        id,
        userId,
        missionId: type === BoostType.VERIFY_EXPRESS_19 ? null : missionId,
        type,
        amountCents: cfg.amountCents,
        currency: 'CAD',
        stripePaymentIntentId: pi.id,
        status: BoostStatus.PENDING,
      },
    });

    this.logger.log(
      `Boost ${type} created (pending): ${id} user=${userId} mission=${missionId ?? '-'}`,
    );

    return {
      boostId: id,
      clientSecret: pi.client_secret,
      amountCents: cfg.amountCents,
    };
  }

  /**
   * Apply the boost effects on payment success.
   */
  async applyBoost(boost: {
    id: string;
    type: BoostType;
    missionId: string | null;
  }): Promise<void> {
    const cfg = BOOST_CONFIG[boost.type];
    const now = new Date();
    const expiresAt = cfg.durationMs
      ? new Date(now.getTime() + cfg.durationMs)
      : null;

    if (boost.type === BoostType.TOP_48H_14 && boost.missionId) {
      await this.prisma.localMission.update({
        where: { id: boost.missionId },
        data: { boostedUntil: expiresAt ?? undefined },
      });
    } else if (boost.type === BoostType.URGENT_9 && boost.missionId) {
      const mission = await this.prisma.localMission.update({
        where: { id: boost.missionId },
        data: { isUrgent: true, urgentUntil: expiresAt ?? undefined },
        select: { title: true, city: true, latitude: true, longitude: true },
      });

      // Notify workers within ~25km via in-app LocalNotification
      if (mission.latitude && mission.longitude) {
        const deltaLat = 0.225; // ~25km in degrees
        const deltaLng = 0.3;
        const nearbyWorkers = await this.prisma.localUser.findMany({
          where: {
            role: 'worker',
            latitude: { gte: mission.latitude - deltaLat, lte: mission.latitude + deltaLat },
            longitude: { gte: mission.longitude - deltaLng, lte: mission.longitude + deltaLng },
          },
          select: { id: true },
          take: 100,
        });

        if (nearbyWorkers.length > 0) {
          await this.prisma.localNotification.createMany({
            data: nearbyWorkers.map((w) => ({
              userId: w.id,
              type: 'mission_urgent',
              title: '🔥 Mission urgente près de toi',
              body: `"${mission.title}" cherche un pro maintenant — ${mission.city ?? 'à proximité'}.`,
              data: { missionId: boost.missionId },
            })),
            skipDuplicates: true,
          });
          this.logger.log(
            `URGENT_9 applied: notified ${nearbyWorkers.length} nearby workers`,
          );
        }
      }
    } else if (boost.type === BoostType.VERIFY_EXPRESS_19) {
      // Send confirmation to the user and log for admin review queue
      await this.prisma.localNotification.create({
        data: {
          userId: boost.userId,
          type: 'verify_express_queued',
          title: '✅ Vérification express en cours',
          body: 'Ton dossier a été transmis. Tu recevras ton badge vérifié dans les 24h.',
          data: { boostId: boost.id },
        },
      });
      this.logger.log(
        `VERIFY_EXPRESS_19 PAID — user ${boost.userId} queued for review (boostId=${boost.id})`,
      );
    }

    await this.prisma.boost.update({
      where: { id: boost.id },
      data: {
        status: BoostStatus.PAID,
        appliedAt: now,
        expiresAt,
      },
    });

    this.logger.log(`Boost applied: ${boost.id} (${boost.type})`);
  }

  /**
   * Handle Stripe webhook — signature-verified, idempotent via
   * stripePaymentIntentId unique constraint on Boost.
   */
  verifyWebhook(rawBody: Buffer, signature: string): Stripe.Event {
    const stripe = this.ensureStripe();
    if (!this.webhookSecret) {
      throw new BadRequestException(
        'STRIPE_BOOSTS_WEBHOOK_SECRET not configured',
      );
    }
    return stripe.webhooks.constructEvent(
      rawBody,
      signature,
      this.webhookSecret,
    );
  }

  async handleWebhook(event: Stripe.Event): Promise<{ handled: boolean }> {
    if (
      event.type !== 'payment_intent.succeeded' &&
      event.type !== 'payment_intent.payment_failed'
    ) {
      return { handled: false };
    }

    const pi = event.data.object as Stripe.PaymentIntent;
    const boost = await this.prisma.boost.findUnique({
      where: { stripePaymentIntentId: pi.id },
    });

    if (!boost) {
      // PaymentIntent not ours (e.g. belongs to payments-local or subs)
      return { handled: false };
    }

    if (boost.status === BoostStatus.PAID && event.type === 'payment_intent.succeeded') {
      // Idempotent — already applied
      return { handled: true };
    }

    if (event.type === 'payment_intent.succeeded') {
      await this.applyBoost({
        id: boost.id,
        type: boost.type,
        missionId: boost.missionId,
      });
    } else {
      // payment failed
      await this.prisma.boost.update({
        where: { id: boost.id },
        data: { status: BoostStatus.FAILED },
      });
      this.logger.warn(`Boost payment failed: ${boost.id}`);
    }

    return { handled: true };
  }

  /**
   * List boosts for a user — for history/receipt.
   */
  async listMine(userId: string) {
    return this.prisma.boost.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}
