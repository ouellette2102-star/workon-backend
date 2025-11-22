import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentStatus } from '@prisma/client';
import Stripe from 'stripe';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';

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
   * Créer un PaymentIntent Stripe pour une mission
   * 
   * TODO: Cette version minimale utilise amount du schema Payment existant.
   * TODO: À terme, ajouter les champs priceCents/currency sur Mission si nécessaire.
   */
  async createPaymentIntent(
    userId: string,
    createPaymentIntentDto: CreatePaymentIntentDto,
  ) {
    if (!this.stripe) {
      throw new BadRequestException("Stripe n'est pas configuré");
    }

    const { missionId, amount } = createPaymentIntentDto;

    // Vérifier que la mission existe et que l'utilisateur est l'auteur (employer/client)
    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },
      include: {
        authorClient: {
          include: {
            userProfile: true,
          },
        },
        assigneeWorker: {
          select: {
            id: true,
            clerkId: true,
          },
        },
        payments: {
          where: {
            status: PaymentStatus.SUCCEEDED,
          },
          select: { id: true },
        },
      },
    });

    if (!mission) {
      throw new NotFoundException('Mission non trouvée');
    }

    // Vérifier que l'utilisateur est bien l'auteur de la mission
    if (mission.authorClient.id !== userId) {
      throw new ForbiddenException(
        'Vous ne pouvez pas créer un paiement pour cette mission',
      );
    }

    // Vérifier qu'il n'y a pas déjà un paiement réussi
    if (mission.payments.length > 0) {
      throw new BadRequestException('Un paiement a déjà été effectué pour cette mission');
    }

    // Vérifier qu'un PaymentIntent n'existe pas déjà en attente
    const existingPayment = await this.prisma.payment.findFirst({
      where: {
        missionId,
        status: PaymentStatus.REQUIRES_ACTION,
        stripePaymentIntentId: {
          not: null,
        },
      },
    });

    if (existingPayment) {
      // Retourner le PaymentIntent existant
      try {
        const paymentIntent = await this.stripe.paymentIntents.retrieve(
          existingPayment.stripePaymentIntentId!,
        );
        return {
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id,
          paymentId: existingPayment.id,
        };
      } catch (error) {
        this.logger.error(`Erreur lors de la récupération du PaymentIntent: ${error}`);
        // Continuer pour créer un nouveau PaymentIntent
      }
    }

    // Calculer le montant en centimes (amount est en dollars, multiplier par 100)
    const amountCents = Math.round(amount * 100);
    const platformFeePct = 10; // 10% par défaut (field du schema)

    // Créer le PaymentIntent Stripe
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'cad', // CAD par défaut pour WorkOn
      metadata: {
        missionId: mission.id,
        authorClientId: mission.authorClientId,
        assigneeWorkerId: mission.assigneeWorkerId || '',
      },
      description: `Mission: ${mission.title}`,
      // TODO: Ajouter Stripe Connect pour transfert direct au worker
      // application_fee_amount: Math.round(amountCents * platformFeePct / 100),
      // transfer_data: {
      //   destination: workerStripeAccountId,
      // },
    });

    // Créer l'enregistrement Payment dans la DB
    const payment = await this.prisma.payment.create({
      data: {
        id: `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        missionId: mission.id,
        stripePaymentIntentId: paymentIntent.id,
        amount: amount, // Montant en dollars
        currency: 'CAD',
        platformFeePct: platformFeePct,
        status: PaymentStatus.REQUIRES_ACTION,
        updatedAt: new Date(),
        // stripeConnectAccountId sera ajouté quand Stripe Connect sera implémenté
      },
    });

    this.logger.log(`PaymentIntent créé: ${paymentIntent.id} pour mission ${missionId}, montant: ${amount} CAD`);

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      paymentId: payment.id,
    };
  }

  /**
   * Traiter un webhook Stripe (idempotent)
   */
  async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    this.logger.debug(`Réception webhook Stripe ${event.type}`, {
      eventId: event.id,
    });

    try {
      // Traiter selon le type d'événement
      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentIntentSucceeded(
            event.data.object as Stripe.PaymentIntent,
          );
          break;

        case 'payment_intent.payment_failed':
          await this.handlePaymentIntentFailed(
            event.data.object as Stripe.PaymentIntent,
          );
          break;

        default:
          this.logger.debug(`Type d'événement non géré: ${event.type}`);
      }
    } catch (error) {
      this.logger.error(
        `Erreur lors du traitement du webhook ${event.id}: ${error}`,
      );
      throw error;
    }
  }

  /**
   * Gérer un PaymentIntent réussi
   */
  private async handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
    const missionId = paymentIntent.metadata.missionId;

    if (!missionId) {
      this.logger.warn(`PaymentIntent ${paymentIntent.id} sans missionId dans metadata`);
      return;
    }

    // Mettre à jour le paiement
    const payment = await this.prisma.payment.updateMany({
      where: {
        stripePaymentIntentId: paymentIntent.id,
        status: PaymentStatus.REQUIRES_ACTION,
      },
      data: {
        status: PaymentStatus.SUCCEEDED,
      },
    });

    if (payment.count === 0) {
      this.logger.warn(`Payment non trouvé pour PaymentIntent ${paymentIntent.id}`);
      return;
    }

    this.logger.log(`Paiement réussi: ${paymentIntent.id} pour mission ${missionId}`);

    // Placeholder: Notifier l'employer et le worker
    // Placeholder: Mettre à jour le statut de la mission si nécessaire
  }

  /**
   * Gérer un PaymentIntent échoué
   */
  private async handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
    await this.prisma.payment.updateMany({
      where: {
        stripePaymentIntentId: paymentIntent.id,
        status: PaymentStatus.REQUIRES_ACTION,
      },
      data: {
        status: PaymentStatus.DISPUTED,
      },
    });

    this.logger.warn(`Paiement échoué: ${paymentIntent.id}`);
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

