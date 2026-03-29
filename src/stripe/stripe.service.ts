import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PaymentStatus, UserRole, DisputeStatus } from '@prisma/client';
import Stripe from 'stripe';

/**
 * Service de gestion Stripe pour WorkOn (version MVP).
 * 
 * NOTE (Post-MVP): Stripe Connect à implémenter pour transferts directs aux workers.
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
   * NOTE (Post-MVP): Implémenter Stripe Connect pour transfert direct au worker.
   * NOTE (Post-MVP): Vérifier que le worker a complété son onboarding avant de créer le payment.
   */
  async createPaymentIntent(
    userId: string,
    missionId: string,
    amountCentsInput: number,
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

    // NOTE (Post-MVP): Vérifier onboarding Stripe Connect du worker
    // const workerStripeAccountId = mission.assigneeWorker.stripeAccountId;

    const amountCents = amountCentsInput;

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
      // NOTE (Post-MVP): Ajouter Stripe Connect pour transfert direct
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
        amountCents: amountCents,
        currency: 'CAD',
        platformFeePct: this.PLATFORM_FEE_PERCENT * 100, // Convertir en %
        status: PaymentStatus.REQUIRES_ACTION,
        updatedAt: new Date(),
        // stripeConnectAccountId sera ajouté quand Stripe Connect sera implémenté
      },
    });

    this.logger.log(
      `PaymentIntent créé: ${paymentIntent.id} pour mission ${missionId}, montant: ${amountCents / 100} CAD`,
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
   * NOTE (Post-MVP): Ajouter table WebhookEvent pour idempotence
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

    // NOTE (Post-MVP): Vérifier l'idempotence avec une table WebhookEvent
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

      case 'account.updated':
        await this.handleAccountUpdated(
          event.data.object as Stripe.Account,
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
    const previousStatus = payment.status;
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: PaymentStatus.SUCCEEDED },
    });

    await this.recordPaymentEvent(payment.id, 'payment_intent.succeeded', previousStatus, PaymentStatus.SUCCEEDED);

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

    const previousStatus = payment.status;
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: PaymentStatus.DISPUTED },
    });

    await this.recordPaymentEvent(payment.id, 'payment_intent.payment_failed', previousStatus, PaymentStatus.DISPUTED, {
      failureMessage: paymentIntent.last_payment_error?.message,
    });

    this.logger.error(
      `Paiement échoué: ${payment.id}, raison: ${paymentIntent.last_payment_error?.message || 'Inconnue'}`,
    );
  }

  /**
   * Récupérer l'historique des paiements d'un Worker (version simplifiée)
   * 
   * NOTE (Post-MVP): Ajouter filtres par date, statut, etc.
   */
  async getWorkerPayments(
    userId: string,
    options: { cursor?: string; limit?: number } = {},
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { userProfile: true },
    });

    if (!user || !user.userProfile || user.userProfile.role !== UserRole.WORKER) {
      throw new ForbiddenException('Accès réservé aux workers WorkOn');
    }

    const limit = options.limit ?? 20;
    const take = limit + 1;

    const payments = await this.prisma.payment.findMany({
      where: {
        mission: {
          assigneeWorkerId: userId,
        },
        deletedAt: null,
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
      take,
      ...(options.cursor ? { skip: 1, cursor: { id: options.cursor } } : {}),
    });

    const hasMore = payments.length > limit;
    const data = hasMore ? payments.slice(0, limit) : payments;

    return {
      data: data.map((p: any) => ({
        id: p.id,
        missionId: p.missionId,
        missionTitle: p.mission.title,
        missionCategory: p.mission.categoryId,
        amountCents: p.amountCents,
        platformFeePct: p.platformFeePct,
        netAmountCents: p.amountCents * (1 - p.platformFeePct / 100),
        currency: p.currency,
        status: p.status,
        createdAt: p.createdAt,
      })),
      pagination: {
        nextCursor: hasMore && data.length > 0 ? data[data.length - 1].id : null,
        hasMore,
        count: data.length,
      },
    };
  }

  /**
   * Create Stripe Connect onboarding link for a Worker
   * 
   * Creates a Stripe Connect Express account and returns the onboarding URL.
   * The worker will complete identity verification on Stripe's hosted page.
   * 
   * @param userId - Local user ID
   * @returns Stripe Connect onboarding URL
   */
  async createConnectOnboardingLink(userId: string): Promise<string> {
    this.ensureStripeInitialized();

    // Get user from local_users table
    const user = await this.prisma.localUser.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        stripeAccountId: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    if (user.role !== 'worker') {
      throw new ForbiddenException('Seuls les workers peuvent créer un compte Stripe Connect');
    }

    let accountId = user.stripeAccountId;

    // Create Stripe Connect Express account if not exists
    if (!accountId) {
      const account = await this.stripe!.accounts.create({
        type: 'express',
        country: 'CA',
        email: user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'individual',
        individual: {
          first_name: user.firstName || undefined,
          last_name: user.lastName || undefined,
          email: user.email,
        },
        metadata: {
          workon_user_id: userId,
        },
      });

      accountId = account.id;

      // Save account ID to database
      await this.prisma.localUser.update({
        where: { id: userId },
        data: { stripeAccountId: accountId },
      });

      this.logger.log(`Stripe Connect account created: ${accountId} for user ${userId}`);
    }

    // Create onboarding link
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    
    const accountLink = await this.stripe!.accountLinks.create({
      account: accountId,
      refresh_url: `${frontendUrl}/worker/stripe/refresh`,
      return_url: `${frontendUrl}/worker/stripe/complete`,
      type: 'account_onboarding',
    });

    this.logger.log(`Onboarding link created for user ${userId}`);

    return accountLink.url;
  }

  /**
   * Refresh Stripe Connect onboarding link
   * 
   * Used when the previous link has expired
   */
  async refreshConnectOnboardingLink(userId: string): Promise<string> {
    this.ensureStripeInitialized();

    const user = await this.prisma.localUser.findUnique({
      where: { id: userId },
      select: { stripeAccountId: true },
    });

    if (!user?.stripeAccountId) {
      // No account yet, create new one
      return this.createConnectOnboardingLink(userId);
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    const accountLink = await this.stripe!.accountLinks.create({
      account: user.stripeAccountId,
      refresh_url: `${frontendUrl}/worker/stripe/refresh`,
      return_url: `${frontendUrl}/worker/stripe/complete`,
      type: 'account_onboarding',
    });

    return accountLink.url;
  }

  /**
   * Check Stripe Connect onboarding status
   * 
   * Returns the current status of a worker's Stripe Connect account
   */
  async checkOnboardingStatus(userId: string): Promise<{
    hasAccount: boolean;
    accountId: string | null;
    onboarded: boolean;
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    detailsSubmitted: boolean;
    requirementsNeeded: string[];
  }> {
    this.ensureStripeInitialized();

    const user = await this.prisma.localUser.findUnique({
      where: { id: userId },
      select: { stripeAccountId: true },
    });

    if (!user?.stripeAccountId) {
      return {
        hasAccount: false,
        accountId: null,
        onboarded: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
        requirementsNeeded: ['account_not_created'],
      };
    }

    try {
      const account = await this.stripe!.accounts.retrieve(user.stripeAccountId);

      const requirementsNeeded: string[] = [];
      
      if (account.requirements?.currently_due) {
        requirementsNeeded.push(...account.requirements.currently_due);
      }
      if (account.requirements?.eventually_due) {
        requirementsNeeded.push(...account.requirements.eventually_due.filter(
          r => !requirementsNeeded.includes(r)
        ));
      }

      const onboarded = account.details_submitted && 
                        account.charges_enabled && 
                        account.payouts_enabled;

      // Update bank verified status if fully onboarded
      if (onboarded) {
        await this.prisma.localUser.update({
          where: { id: userId },
          data: {
            bankVerified: true,
            bankVerifiedAt: new Date(),
          },
        });
      }

      return {
        hasAccount: true,
        accountId: user.stripeAccountId,
        onboarded,
        chargesEnabled: account.charges_enabled || false,
        payoutsEnabled: account.payouts_enabled || false,
        detailsSubmitted: account.details_submitted || false,
        requirementsNeeded,
      };
    } catch (error) {
      this.logger.error(`Error retrieving Stripe account: ${error}`);
      return {
        hasAccount: true,
        accountId: user.stripeAccountId,
        onboarded: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
        requirementsNeeded: ['error_retrieving_account'],
      };
    }
  }

  /**
   * Create a payment with Stripe Connect (split payment)
   * 
   * Creates a PaymentIntent that automatically transfers funds to the worker
   * after deducting the platform fee.
   * 
   * @param employerId - Employer user ID
   * @param missionId - Mission ID
   * @param amountDollars - Total amount in CAD
   */
  async createConnectPaymentIntent(
    employerId: string,
    missionId: string,
    amountCentsInput: number,
  ): Promise<{
    paymentIntentId: string;
    clientSecret: string;
    amount: number;
    currency: string;
    platformFee: number;
    workerReceives: number;
  }> {
    this.ensureStripeInitialized();

    // Get mission with worker info
    const mission = await this.prisma.localMission.findUnique({
      where: { id: missionId },
      include: {
        assignedToUser: {
          select: {
            id: true,
            stripeAccountId: true,
          },
        },
      },
    });

    if (!mission) {
      throw new NotFoundException('Mission non trouvée');
    }

    if (mission.createdByUserId !== employerId) {
      throw new ForbiddenException('Vous ne pouvez payer que vos propres missions');
    }

    if (!mission.assignedToUserId || !mission.assignedToUser) {
      throw new BadRequestException('Aucun worker assigné à cette mission');
    }

    if (!mission.assignedToUser.stripeAccountId) {
      throw new BadRequestException(
        'Le worker n\'a pas encore configuré son compte de paiement. ' +
        'Veuillez lui demander de compléter son profil Stripe.',
      );
    }

    // Check worker's Stripe account is ready
    const workerStatus = await this.checkOnboardingStatus(mission.assignedToUserId);
    if (!workerStatus.chargesEnabled) {
      throw new BadRequestException(
        'Le compte de paiement du worker n\'est pas encore activé.',
      );
    }

    const amountCents = amountCentsInput;
    const platformFeeCents = Math.round(amountCents * this.PLATFORM_FEE_PERCENT);
    const workerReceivesCents = amountCents - platformFeeCents;

    // Create PaymentIntent with Connect
    const paymentIntent = await this.stripe!.paymentIntents.create({
      amount: amountCents,
      currency: 'cad',
      application_fee_amount: platformFeeCents,
      transfer_data: {
        destination: mission.assignedToUser.stripeAccountId,
      },
      metadata: {
        missionId: mission.id,
        employerId,
        workerId: mission.assignedToUserId,
        platformFeePercent: String(this.PLATFORM_FEE_PERCENT * 100),
      },
      description: `WorkOn - ${mission.title}`,
    });

    this.logger.log(
      `Connect PaymentIntent created: ${paymentIntent.id} for mission ${missionId}`,
    );

    return {
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret!,
      amount: amountCents,
      currency: 'CAD',
      platformFee: platformFeeCents,
      workerReceives: workerReceivesCents,
    };
  }

  /**
   * Handle Stripe Connect account.updated webhook
   * 
   * Updates local database when worker completes onboarding
   */
  async handleAccountUpdated(account: Stripe.Account): Promise<void> {
    const userId = account.metadata?.workon_user_id;
    
    if (!userId) {
      this.logger.warn(`Account ${account.id} has no workon_user_id metadata`);
      return;
    }

    const isFullyOnboarded = account.details_submitted && 
                             account.charges_enabled && 
                             account.payouts_enabled;

    if (isFullyOnboarded) {
      await this.prisma.localUser.update({
        where: { id: userId },
        data: {
          bankVerified: true,
          bankVerifiedAt: new Date(),
        },
      });

      this.logger.log(`Worker ${userId} completed Stripe Connect onboarding`);
    }
  }

  // ============================================
  // REFUNDS
  // ============================================

  /**
   * Issue a full refund for a payment
   */
  async refundPayment(
    userId: string,
    paymentId: string,
    reason?: string,
  ): Promise<{ refundId: string; status: string }> {
    this.ensureStripeInitialized();

    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, deletedAt: null },
      include: { mission: true },
    });

    if (!payment) {
      throw new NotFoundException('Paiement introuvable');
    }

    if (payment.mission.authorClientId !== userId) {
      throw new ForbiddenException('Seul le client peut demander un remboursement');
    }

    if (payment.status !== PaymentStatus.SUCCEEDED) {
      throw new BadRequestException('Seuls les paiements réussis peuvent être remboursés');
    }

    if (!payment.stripePaymentIntentId) {
      throw new BadRequestException('Aucun PaymentIntent Stripe associé');
    }

    const refund = await this.stripe!.refunds.create({
      payment_intent: payment.stripePaymentIntentId,
      reason: 'requested_by_customer',
      metadata: {
        paymentId: payment.id,
        missionId: payment.missionId,
        requestedBy: userId,
        userReason: reason || '',
      },
    });

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.REFUNDED,
        updatedAt: new Date(),
      },
    });

    this.logger.log(`Refund issued: ${refund.id} for payment ${paymentId}`);

    return { refundId: refund.id, status: 'refunded' };
  }

  // ============================================
  // DISPUTES
  // ============================================

  /**
   * Open a dispute on a mission
   */
  async openDispute(
    userId: string,
    missionId: string,
    reason: string,
  ): Promise<{ disputeId: string }> {
    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },
    });

    if (!mission) {
      throw new NotFoundException('Mission introuvable');
    }

    // Only employer or assigned worker can open a dispute
    if (mission.authorClientId !== userId && mission.assigneeWorkerId !== userId) {
      throw new ForbiddenException('Seules les parties impliquées peuvent ouvrir un litige');
    }

    // Check for existing open dispute
    const existing = await this.prisma.dispute.findUnique({
      where: { missionId },
    });

    if (existing && existing.status !== DisputeStatus.CLOSED) {
      throw new BadRequestException('Un litige est déjà ouvert pour cette mission');
    }

    const dispute = await this.prisma.$transaction(async (tx) => {
      const d = await tx.dispute.create({
        data: {
          id: `disp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          missionId,
          openedById: userId,
          reason,
          status: DisputeStatus.OPEN,
          updatedAt: new Date(),
        },
      });

      await tx.disputeTimeline.create({
        data: {
          id: `dt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          disputeId: d.id,
          action: 'OPENED',
          actorId: userId,
          note: reason,
          updatedAt: new Date(),
        },
      });

      return d;
    });

    this.logger.log(`Dispute opened: ${dispute.id} for mission ${missionId}`);

    return { disputeId: dispute.id };
  }

  /**
   * Resolve a dispute (admin or mediation)
   */
  async resolveDispute(
    disputeId: string,
    resolution: string,
    actorId: string,
    refundRequested: boolean,
  ): Promise<{ status: string; refundId?: string }> {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
      include: { mission: { include: { payments: true } } },
    });

    if (!dispute) {
      throw new NotFoundException('Litige introuvable');
    }

    if (dispute.status === DisputeStatus.CLOSED) {
      throw new BadRequestException('Ce litige est déjà fermé');
    }

    let refundId: string | undefined;

    await this.prisma.$transaction(async (tx) => {
      await tx.dispute.update({
        where: { id: disputeId },
        data: {
          status: DisputeStatus.RESOLVED,
          resolution,
          updatedAt: new Date(),
        },
      });

      await tx.disputeTimeline.create({
        data: {
          id: `dt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          disputeId,
          action: 'RESOLVED',
          actorId,
          note: resolution,
          updatedAt: new Date(),
        },
      });
    });

    // Process refund if requested (outside transaction — Stripe call)
    if (refundRequested) {
      const succeededPayment = dispute.mission.payments.find(
        (p: any) => p.status === PaymentStatus.SUCCEEDED && p.stripePaymentIntentId,
      );

      if (succeededPayment) {
        const result = await this.refundPayment(
          dispute.mission.authorClientId,
          succeededPayment.id,
          `Dispute resolution: ${resolution}`,
        );
        refundId = result.refundId;
      }
    }

    this.logger.log(`Dispute resolved: ${disputeId}`);

    return { status: 'resolved', refundId };
  }

  // ============================================
  // PAYMENT EVENT SOURCING
  // ============================================

  private async recordPaymentEvent(
    paymentId: string,
    eventType: string,
    previousStatus: string,
    newStatus: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.prisma.paymentEvent.create({
        data: {
          id: `pe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          paymentId,
          eventType,
          previousStatus,
          newStatus,
          metadata: metadata ?? undefined,
        },
      });
    } catch (err) {
      // Non-blocking: event recording failure should not break payment flow
      this.logger.warn(`Failed to record payment event: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}
