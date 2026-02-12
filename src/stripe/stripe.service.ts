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

    // NOTE (Post-MVP): Vérifier onboarding Stripe Connect du worker
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
   * NOTE (Post-MVP): Ajouter filtres par date, statut, etc.
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
    amountDollars: number,
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

    const amountCents = Math.round(amountDollars * 100);
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
}
