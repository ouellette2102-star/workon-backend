import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PaymentStatus, UserRole } from '@prisma/client';
import Stripe from 'stripe';

/**
 * Service de gestion Stripe pour WorkOn (version MVP minimale)
 * 
 * TODO: Stripe Connect à implémenter dans une version ultérieure.
 * Pour l'instant, ce service gère uniquement les paiements directs simples.
 */
@Injectable()
export class StripeService {
  private stripe: Stripe | null;
  private readonly logger = new Logger(StripeService.name);
  private readonly PLATFORM_FEE_PERCENT = 0.12; // 12% de frais WorkOn

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    const isDev = process.env.NODE_ENV !== 'production';

    if (!secretKey) {
      if (isDev) {
        this.logger.warn(
          '⚠️  STRIPE_SECRET_KEY not set in development. Payment features will be disabled. ' +
          'Set STRIPE_SECRET_KEY in .env to enable payments.',
        );
        this.stripe = null;
      } else {
        throw new Error(
          'STRIPE_SECRET_KEY manquant dans .env. Paiements impossibles en production.',
        );
      }
    } else {
      this.stripe = new Stripe(secretKey, {
        apiVersion: '2025-02-24.acacia',
      });
      this.logger.log('✅ Stripe initialized successfully');
    }
  }

  /**
   * Vérifie si Stripe est initialisé (clé présente)
   * Lance une exception si Stripe n'est pas disponible
   */
  private ensureStripeInitialized(): void {
    if (!this.stripe) {
      throw new BadRequestException(
        'Stripe is not configured. Payment features are disabled in development mode. ' +
        'Set STRIPE_SECRET_KEY in .env to enable payments.',
      );
    }
  }

  /**
   * Créer un PaymentIntent pour une mission (version simplifiée sans Stripe Connect)
   * 
   * @param userId - ID interne de l'utilisateur (author/employer)
   * @param missionId - ID de la mission
   * @param amountDollars - Montant en dollars CAD
   * @returns Client secret pour le frontend
   * 
   * TODO: Implémenter Stripe Connect pour transfert direct au worker
   * TODO: Vérifier que le worker a complété son onboarding avant de créer le payment
   */
  async createPaymentIntent(
    userId: string,
    missionId: string,
    amountDollars: number,
  ): Promise<{ clientSecret: string; paymentIntentId: string }> {
    this.ensureStripeInitialized();

    // Vérifier que l'utilisateur est un EMPLOYER ou RESIDENTIAL (client)
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { userProfile: true },
    });

    if (!user || !user.userProfile) {
      throw new ForbiddenException('Profil utilisateur introuvable');
    }

    const allowedRoles: UserRole[] = [UserRole.EMPLOYER, UserRole.RESIDENTIAL];
    if (!allowedRoles.includes(user.userProfile.role)) {
      throw new ForbiddenException('Accès réservé aux employeurs et clients WorkOn');
    }

    // Récupérer la mission et vérifier la propriété
    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },
      include: {
        assigneeWorker: {
          select: {
            id: true,
            clerkId: true,
          },
        },
      },
    });

    if (!mission) {
      throw new NotFoundException('Mission introuvable');
    }

    if (mission.authorClientId !== userId) {
      throw new ForbiddenException(
        "Vous ne pouvez payer que vos propres missions",
      );
    }

    if (mission.status !== 'COMPLETED') {
      throw new BadRequestException(
        'La mission doit être complétée avant le paiement',
      );
    }

    if (!mission.assigneeWorkerId) {
      throw new BadRequestException('Aucun worker assigné à cette mission');
    }

    // TODO: Vérifier que le worker a complété son onboarding Stripe Connect
    // const workerStripeAccountId = mission.assigneeWorker.stripeAccountId;

    // Calculer le montant en centimes
    const amountCents = Math.round(amountDollars * 100);

    // Créer le PaymentIntent (simple pour MVP, sans Stripe Connect)
    const paymentIntent = await this.stripe!.paymentIntents.create({
      amount: amountCents,
      currency: 'cad',
      metadata: {
        missionId: mission.id,
        authorClientId: userId,
        assigneeWorkerId: mission.assigneeWorkerId,
      },
      description: `Paiement mission: ${mission.title}`,
      // TODO: Ajouter Stripe Connect pour transfert direct
      // application_fee_amount: Math.ceil(amountCents * this.PLATFORM_FEE_PERCENT),
      // transfer_data: {
      //   destination: workerStripeAccountId,
      // },
    });

    // Créer l'entrée Payment dans la DB
    await this.prisma.payment.create({
      data: {
        id: `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        missionId: mission.id,
        stripePaymentIntentId: paymentIntent.id,
        amount: amountDollars,
        currency: 'CAD',
        platformFeePct: this.PLATFORM_FEE_PERCENT * 100, // Convertir en %
        status: PaymentStatus.REQUIRES_ACTION,
        updatedAt: new Date(),
        // stripeConnectAccountId sera ajouté quand Stripe Connect sera implémenté
      },
    });

    this.logger.log(
      `PaymentIntent créé: ${paymentIntent.id} pour mission ${missionId}, montant: ${amountDollars} CAD`,
    );

    return {
      clientSecret: paymentIntent.client_secret!,
      paymentIntentId: paymentIntent.id,
    };
  }

  /**
   * Traiter les webhooks Stripe (version simplifiée)
   * 
   * @param rawBody - Body brut du webhook
   * @param signature - Signature Stripe
   * @returns Event traité
   * 
   * TODO: Ajouter table WebhookEvent pour idempotence
   */
  async handleWebhook(
    rawBody: Buffer,
    signature: string,
  ): Promise<Stripe.Event> {
    this.ensureStripeInitialized();

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET manquant dans .env');
    }

    let event: Stripe.Event;

    try {
      event = this.stripe!.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret,
      );
    } catch (err) {
      this.logger.error(
        `Erreur de vérification signature webhook: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw new BadRequestException('Signature webhook invalide');
    }

    // TODO: Vérifier l'idempotence avec une table WebhookEvent
    // Pour l'instant, on traite directement

    // Traiter selon le type d'event
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
        this.logger.log(`Event type non géré: ${event.type}`);
    }

    return event;
  }

  /**
   * Gérer le succès d'un PaymentIntent
   */
  private async handlePaymentIntentSucceeded(
    paymentIntent: Stripe.PaymentIntent,
  ): Promise<void> {
    const payment = await this.prisma.payment.findUnique({
      where: { stripePaymentIntentId: paymentIntent.id },
      include: {
        mission: {
          include: {
            assigneeWorker: {
              select: {
                id: true,
                clerkId: true,
              },
            },
            authorClient: {
              select: {
                id: true,
                clerkId: true,
              },
            },
          },
        },
      },
    });

    if (!payment) {
      this.logger.warn(
        `Payment introuvable pour PaymentIntent ${paymentIntent.id}`,
      );
      return;
    }

    // Mettre à jour le statut du paiement
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: PaymentStatus.SUCCEEDED },
    });

    this.logger.log(
      `Paiement réussi: ${payment.id}, mission: ${payment.missionId}`,
    );

    // Notifier le Worker
    if (payment.mission.assigneeWorker) {
      await this.notificationsService.createForMissionStatusChange(
        payment.mission.assigneeWorker.clerkId,
        payment.mission.id,
        'COMPLETED',
        'COMPLETED', // Pas de changement de statut, juste notification de paiement
      );
    }

    // Notifier l'Employer
    if (payment.mission.authorClient) {
      await this.notificationsService.createForMissionStatusChange(
        payment.mission.authorClient.clerkId,
        payment.mission.id,
        'COMPLETED',
        'COMPLETED',
      );
    }
  }

  /**
   * Gérer l'échec d'un PaymentIntent
   */
  private async handlePaymentIntentFailed(
    paymentIntent: Stripe.PaymentIntent,
  ): Promise<void> {
    const payment = await this.prisma.payment.findUnique({
      where: { stripePaymentIntentId: paymentIntent.id },
    });

    if (!payment) {
      return;
    }

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: PaymentStatus.DISPUTED },
    });

    this.logger.error(
      `Paiement échoué: ${payment.id}, raison: ${paymentIntent.last_payment_error?.message || 'Inconnue'}`,
    );
  }

  /**
   * Récupérer l'historique des paiements d'un Worker (version simplifiée)
   * 
   * TODO: Ajouter filtres par date, statut, etc.
   */
  async getWorkerPayments(userId: string): Promise<any[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { userProfile: true },
    });

    if (!user || !user.userProfile || user.userProfile.role !== UserRole.WORKER) {
      throw new ForbiddenException('Accès réservé aux workers WorkOn');
    }

    const payments = await this.prisma.payment.findMany({
      where: {
        mission: {
          assigneeWorkerId: userId,
        },
      },
      include: {
        mission: {
          select: {
            id: true,
            title: true,
            categoryId: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return payments.map((p: any) => ({
      id: p.id,
      missionId: p.missionId,
      missionTitle: p.mission.title,
      missionCategory: p.mission.categoryId,
      amount: p.amount,
      platformFeePct: p.platformFeePct,
      netAmount: p.amount * (1 - p.platformFeePct / 100),
      currency: p.currency,
      status: p.status,
      createdAt: p.createdAt,
    }));
  }

  /**
   * Stub pour l'onboarding Stripe Connect (à implémenter)
   * 
   * TODO: Implémenter l'onboarding complet Stripe Connect pour workers
   * TODO: Ajouter champs stripeAccountId, stripeOnboarded sur User
   */
  async createConnectOnboardingLink(_userId: string): Promise<string> {
    throw new BadRequestException(
      'Stripe Connect onboarding pas encore implémenté. ' +
      'TODO: Ajouter champs stripeAccountId, stripeOnboarded sur User model.',
    );
  }

  /**
   * Stub pour vérifier le statut d'onboarding (à implémenter)
   */
  async checkOnboardingStatus(_userId: string): Promise<{
    onboarded: boolean;
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    requirementsNeeded: string[];
  }> {
    return {
      onboarded: false,
      chargesEnabled: false,
      payoutsEnabled: false,
      requirementsNeeded: ['stripe_connect_not_implemented'],
    };
  }
}
