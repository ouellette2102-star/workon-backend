import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentStatus } from '@prisma/client';
import Stripe from 'stripe';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import * as crypto from 'crypto';

@Injectable()
export class PaymentsService {
  private readonly stripe?: Stripe;
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const stripeSecretKey =
      this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      this.logger.warn(
        "STRIPE_SECRET_KEY non configuré - les fonctionnalités de paiement seront désactivées",
      );
      this.stripe = undefined;
    } else {
      this.stripe = new Stripe(stripeSecretKey);
    }
  }

  /**
   * Generate stable idempotency key for Stripe operations
   */
  private generateIdempotencyKey(missionId: string, operation: string): string {
    const hash = crypto.createHash('sha256').update(`${missionId}:${operation}`).digest('hex');
    return hash.substring(0, 32);
  }

  private ensureStripeConfigured(): void {
    if (!this.stripe) {
      throw new BadRequestException("Stripe n'est pas configuré");
    }
  }

  /**
   * Créer un PaymentIntent Stripe pour une mission (escrow avec capture manuelle)
   * 
   * @param userId - ID de l'utilisateur (employer/client)
   * @param createPaymentIntentDto - DTO avec missionId et amount
   * @returns clientSecret pour le frontend + paymentIntentId + status
   */
  async createPaymentIntent(
    userId: string,
    createPaymentIntentDto: CreatePaymentIntentDto,
  ) {
    this.ensureStripeConfigured();

    const { missionId, amount } = createPaymentIntentDto;

    if (amount <= 0) {
      throw new BadRequestException('Le montant doit être supérieur à 0');
    }

    // Vérifier que la mission existe et que l'utilisateur est l'auteur
    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },
      include: {
        authorClient: true,
        assigneeWorker: { select: { id: true } },
      },
    });

    if (!mission) {
      throw new NotFoundException('Mission non trouvée');
    }

    if (mission.authorClientId !== userId) {
      throw new ForbiddenException('Vous ne pouvez pas créer un paiement pour cette mission');
    }

    // Vérifier s'il existe déjà un Payment pour cette mission (missionId unique)
    const existingPayment = await this.prisma.payment.findUnique({
      where: { missionId },
    });

    if (existingPayment) {
      // Si déjà CAPTURED ou SUCCEEDED, refuser
      if (existingPayment.status === PaymentStatus.CAPTURED || existingPayment.status === PaymentStatus.SUCCEEDED) {
        throw new ConflictException('Un paiement a déjà été capturé pour cette mission');
      }

      // Si existe et en attente, retourner le PaymentIntent existant
      if (existingPayment.stripePaymentIntentId) {
        try {
          const pi = await this.stripe!.paymentIntents.retrieve(existingPayment.stripePaymentIntentId);
          return {
            clientSecret: pi.client_secret,
            paymentIntentId: pi.id,
            paymentId: existingPayment.id,
            status: existingPayment.status,
          };
        } catch (err) {
          this.logger.warn(`PaymentIntent ${existingPayment.stripePaymentIntentId} invalide, création d'un nouveau`);
        }
      }
    }

    const amountCents = Math.round(amount * 100);
    const idempotencyKey = this.generateIdempotencyKey(missionId!, 'create');

    // Créer le PaymentIntent avec capture_method: 'manual' (escrow)
    const paymentIntent = await this.stripe!.paymentIntents.create(
      {
        amount: amountCents,
        currency: 'cad',
        capture_method: 'manual', // ESCROW: autorisation sans capture immédiate
        automatic_payment_methods: { enabled: true },
        metadata: {
          missionId: mission.id,
          authorClientId: mission.authorClientId,
          assigneeWorkerId: mission.assigneeWorkerId || '',
          type: 'escrow',
        },
        description: `WorkOn Mission: ${mission.title}`,
      },
      { idempotencyKey },
    );

    // Upsert Payment dans la DB
    const payment = await this.prisma.payment.upsert({
      where: { missionId },
      update: {
        stripePaymentIntentId: paymentIntent.id,
        amount,
        status: PaymentStatus.CREATED,
        updatedAt: new Date(),
      },
      create: {
        id: `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        missionId: mission.id,
        stripePaymentIntentId: paymentIntent.id,
        amount,
        currency: 'CAD',
        platformFeePct: 10,
        status: PaymentStatus.CREATED,
        updatedAt: new Date(),
      },
    });

    this.logger.log(`PaymentIntent escrow créé: ${paymentIntent.id} pour mission ${missionId}, montant: ${amount} CAD`);

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      paymentId: payment.id,
      status: payment.status,
    };
  }

  /**
   * Capturer les fonds d'un PaymentIntent (après mission complétée)
   */
  async capturePaymentIntent(userId: string, missionId: string) {
    this.ensureStripeConfigured();

    const payment = await this.prisma.payment.findUnique({
      where: { missionId },
      include: { mission: { include: { authorClient: true } } },
    });

    if (!payment) {
      throw new NotFoundException('Paiement non trouvé pour cette mission');
    }

    // Vérifier autorisation (seul l'auteur peut capturer)
    if (payment.mission.authorClientId !== userId) {
      throw new ForbiddenException('Vous ne pouvez pas capturer ce paiement');
    }

    // Vérifier que le paiement est capturable
    const capturableStatuses: PaymentStatus[] = [PaymentStatus.AUTHORIZED, PaymentStatus.REQUIRES_ACTION, PaymentStatus.CREATED];
    if (!capturableStatuses.includes(payment.status)) {
      throw new BadRequestException(`Impossible de capturer un paiement en status ${payment.status}`);
    }

    if (!payment.stripePaymentIntentId) {
      throw new BadRequestException('PaymentIntent Stripe manquant');
    }

    // Capturer via Stripe
    const paymentIntent = await this.stripe!.paymentIntents.capture(
      payment.stripePaymentIntentId,
      {},
      { idempotencyKey: this.generateIdempotencyKey(missionId, 'capture') },
    );

    // Mettre à jour le status en DB
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.CAPTURED,
        updatedAt: new Date(),
      },
    });

    this.logger.log(`PaymentIntent capturé: ${paymentIntent.id} pour mission ${missionId}`);

    return {
      paymentIntentId: paymentIntent.id,
      status: PaymentStatus.CAPTURED,
      amountCaptured: paymentIntent.amount_received,
    };
  }

  /**
   * Annuler un PaymentIntent (avant capture)
   */
  async cancelPaymentIntent(userId: string, missionId: string) {
    this.ensureStripeConfigured();

    const payment = await this.prisma.payment.findUnique({
      where: { missionId },
      include: { mission: { include: { authorClient: true } } },
    });

    if (!payment) {
      throw new NotFoundException('Paiement non trouvé pour cette mission');
    }

    // Vérifier autorisation
    if (payment.mission.authorClientId !== userId) {
      throw new ForbiddenException('Vous ne pouvez pas annuler ce paiement');
    }

    // Vérifier que le paiement est annulable
    const nonCancelableStatuses: PaymentStatus[] = [PaymentStatus.CAPTURED, PaymentStatus.SUCCEEDED, PaymentStatus.CANCELED];
    if (nonCancelableStatuses.includes(payment.status)) {
      throw new BadRequestException(`Impossible d'annuler un paiement en status ${payment.status}`);
    }

    if (!payment.stripePaymentIntentId) {
      throw new BadRequestException('PaymentIntent Stripe manquant');
    }

    // Annuler via Stripe
    const paymentIntent = await this.stripe!.paymentIntents.cancel(
      payment.stripePaymentIntentId,
      {},
      { idempotencyKey: this.generateIdempotencyKey(missionId, 'cancel') },
    );

    // Mettre à jour le status en DB
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.CANCELED,
        updatedAt: new Date(),
      },
    });

    this.logger.log(`PaymentIntent annulé: ${paymentIntent.id} pour mission ${missionId}`);

    return {
      paymentIntentId: paymentIntent.id,
      status: PaymentStatus.CANCELED,
    };
  }

  /**
   * Récupérer le status d'un paiement
   */
  async getPaymentStatus(missionId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { missionId },
      select: {
        id: true,
        status: true,
        amount: true,
        currency: true,
        stripePaymentIntentId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!payment) {
      throw new NotFoundException('Paiement non trouvé pour cette mission');
    }

    return payment;
  }

  /**
   * Traiter un webhook Stripe (idempotent via lastStripeEventId)
   */
  async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    this.logger.debug(`Réception webhook Stripe ${event.type}`, { eventId: event.id });

    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const stripePaymentIntentId = paymentIntent.id;

    // Vérifier idempotence: ignorer si event déjà traité
    const existingPayment = await this.prisma.payment.findUnique({
      where: { stripePaymentIntentId },
    });

    if (existingPayment?.lastStripeEventId === event.id) {
      this.logger.debug(`Event ${event.id} déjà traité, ignoré`);
      return;
    }

    try {
      switch (event.type) {
        case 'payment_intent.amount_capturable_updated':
          // Fonds autorisés, prêts pour capture
          await this.handlePaymentIntentAuthorized(paymentIntent, event.id);
          break;

        case 'payment_intent.succeeded':
          // Capture réussie (ou paiement direct)
          await this.handlePaymentIntentSucceeded(paymentIntent, event.id);
          break;

        case 'payment_intent.canceled':
          await this.handlePaymentIntentCanceled(paymentIntent, event.id);
          break;

        case 'payment_intent.payment_failed':
          await this.handlePaymentIntentFailed(paymentIntent, event.id);
          break;

        default:
          this.logger.debug(`Type d'événement non géré: ${event.type}`);
      }
    } catch (error) {
      this.logger.error(`Erreur lors du traitement du webhook ${event.id}: ${error}`);
      throw error;
    }
  }

  /**
   * Gérer l'autorisation d'un PaymentIntent (fonds bloqués, capturable)
   */
  private async handlePaymentIntentAuthorized(paymentIntent: Stripe.PaymentIntent, eventId: string) {
    const result = await this.prisma.payment.updateMany({
      where: {
        stripePaymentIntentId: paymentIntent.id,
        status: { in: [PaymentStatus.CREATED, PaymentStatus.REQUIRES_ACTION] },
      },
      data: {
        status: PaymentStatus.AUTHORIZED,
        lastStripeEventId: eventId,
        updatedAt: new Date(),
      },
    });

    if (result.count > 0) {
      this.logger.log(`PaymentIntent autorisé: ${paymentIntent.id}, montant capturable: ${paymentIntent.amount_capturable}`);
    }
  }

  /**
   * Gérer un PaymentIntent réussi (capture effectuée)
   */
  private async handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent, eventId: string) {
    const result = await this.prisma.payment.updateMany({
      where: {
        stripePaymentIntentId: paymentIntent.id,
        status: { notIn: [PaymentStatus.SUCCEEDED, PaymentStatus.CAPTURED] },
      },
      data: {
        status: PaymentStatus.CAPTURED,
        lastStripeEventId: eventId,
        updatedAt: new Date(),
      },
    });

    if (result.count > 0) {
      this.logger.log(`PaymentIntent capturé via webhook: ${paymentIntent.id}`);
    }
  }

  /**
   * Gérer un PaymentIntent annulé
   */
  private async handlePaymentIntentCanceled(paymentIntent: Stripe.PaymentIntent, eventId: string) {
    await this.prisma.payment.updateMany({
      where: {
        stripePaymentIntentId: paymentIntent.id,
        status: { notIn: [PaymentStatus.CANCELED] },
      },
      data: {
        status: PaymentStatus.CANCELED,
        lastStripeEventId: eventId,
        updatedAt: new Date(),
      },
    });

    this.logger.log(`PaymentIntent annulé: ${paymentIntent.id}`);
  }

  /**
   * Gérer un PaymentIntent échoué
   */
  private async handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent, eventId: string) {
    await this.prisma.payment.updateMany({
      where: {
        stripePaymentIntentId: paymentIntent.id,
      },
      data: {
        status: PaymentStatus.FAILED,
        lastStripeEventId: eventId,
        updatedAt: new Date(),
      },
    });

    this.logger.warn(`PaymentIntent échoué: ${paymentIntent.id}, raison: ${paymentIntent.last_payment_error?.message || 'Inconnue'}`);
  }

  /**
   * Réconciliation manuelle des paiements (admin)
   */
  async reconcilePayments(
    adminId: string,
    options?: { startDate?: Date; endDate?: Date },
  ) {
    if (!this.stripe) {
      throw new BadRequestException("Stripe n'est pas configuré");
    }

    const startDate =
      options?.startDate ?? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const endDate = options?.endDate ?? new Date();

    const pendingPayments = await this.prisma.payment.findMany({
      where: {
        status: PaymentStatus.REQUIRES_ACTION,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        stripePaymentIntentId: {
          not: null,
        },
      },
    });

    const results = {
      checked: pendingPayments.length,
      updated: 0,
      errors: [] as string[],
    };

    for (const payment of pendingPayments) {
      try {
        if (!payment.stripePaymentIntentId) {
          continue;
        }

        const paymentIntent = await this.stripe.paymentIntents.retrieve(
          payment.stripePaymentIntentId,
        );

        if (
          paymentIntent.status === 'succeeded' &&
          payment.status !== PaymentStatus.SUCCEEDED
        ) {
          await this.prisma.payment.update({
            where: { id: payment.id },
            data: { status: PaymentStatus.SUCCEEDED },
          });
          results.updated++;
        } else if (
          paymentIntent.status === 'canceled' ||
          paymentIntent.status === 'requires_payment_method'
        ) {
          await this.prisma.payment.update({
            where: { id: payment.id },
            data: { status: PaymentStatus.DISPUTED },
          });
          results.updated++;
        }
      } catch (error) {
        results.errors.push(
          `Payment ${payment.id}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    this.logger.log(
      `Réconciliation terminée: ${results.updated} paiements mis à jour`,
    );

    return results;
  }
}

