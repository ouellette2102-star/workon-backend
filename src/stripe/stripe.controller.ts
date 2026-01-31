import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  RawBodyRequest,
  Req,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { StripeService } from './stripe.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';

@ApiTags('Payments - Stripe Connect')
@Controller('api/v1/payments/stripe')
export class StripeController {
  constructor(private readonly stripeService: StripeService) {}

  // ============================================
  // STRIPE CONNECT - Worker Onboarding
  // ============================================

  /**
   * Créer un lien d'onboarding Stripe Connect pour un Worker
   * GET /api/v1/payments/stripe/connect/onboarding
   */
  @Get('connect/onboarding')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Get Stripe Connect onboarding link',
    description: 'Creates or retrieves a Stripe Connect Express account and returns the onboarding URL. Worker must complete identity verification on Stripe.',
  })
  @ApiResponse({ status: 200, description: 'Onboarding URL returned' })
  @ApiResponse({ status: 403, description: 'Only workers can access this endpoint' })
  async createOnboardingLink(@Request() req: any) {
    const url = await this.stripeService.createConnectOnboardingLink(
      req.user.userId || req.user.sub,
    );
    return { url };
  }

  /**
   * Rafraîchir le lien d'onboarding (si expiré)
   * POST /api/v1/payments/stripe/connect/refresh
   */
  @Post('connect/refresh')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Refresh Stripe Connect onboarding link',
    description: 'Use this if the previous onboarding link has expired.',
  })
  @ApiResponse({ status: 200, description: 'New onboarding URL returned' })
  async refreshOnboardingLink(@Request() req: any) {
    const url = await this.stripeService.refreshConnectOnboardingLink(
      req.user.userId || req.user.sub,
    );
    return { url };
  }

  /**
   * Vérifier le statut d'onboarding d'un Worker
   * GET /api/v1/payments/stripe/connect/status
   */
  @Get('connect/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Check Stripe Connect account status',
    description: 'Returns the current onboarding status including charges_enabled and payouts_enabled.',
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Account status',
    schema: {
      example: {
        hasAccount: true,
        accountId: 'acct_xxxxx',
        onboarded: true,
        chargesEnabled: true,
        payoutsEnabled: true,
        detailsSubmitted: true,
        requirementsNeeded: [],
      },
    },
  })
  async getOnboardingStatus(@Request() req: any) {
    return this.stripeService.checkOnboardingStatus(req.user.userId || req.user.sub);
  }

  // ============================================
  // STRIPE CONNECT - Payments with Split
  // ============================================

  /**
   * Créer un paiement Connect (avec split automatique)
   * POST /api/v1/payments/stripe/connect/intent
   */
  @Post('connect/intent')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Create Connect payment intent',
    description: 'Creates a PaymentIntent that automatically transfers funds to the worker after deducting the 12% platform fee.',
  })
  @ApiResponse({
    status: 201,
    description: 'Payment intent created',
    schema: {
      example: {
        paymentIntentId: 'pi_xxxxx',
        clientSecret: 'pi_xxxxx_secret_xxxxx',
        amount: 10000,
        currency: 'CAD',
        platformFee: 1200,
        workerReceives: 8800,
      },
    },
  })
  async createConnectPaymentIntent(
    @Request() req: any,
    @Body() dto: CreatePaymentIntentDto,
  ) {
    return this.stripeService.createConnectPaymentIntent(
      req.user.userId || req.user.sub,
      dto.missionId,
      dto.amount,
    );
  }

  /**
   * Créer un PaymentIntent pour une mission
   * POST /api/v1/payments/create-intent
   */
  @Post('create-intent')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.EMPLOYER, UserRole.RESIDENTIAL)
  async createPaymentIntent(
    @Request() req: any,
    @Body() dto: CreatePaymentIntentDto,
  ) {
    // req.user.userId contient l'id interne (ou sub pour clerkId)
    return this.stripeService.createPaymentIntent(
      req.user.userId || req.user.sub,
      dto.missionId,
      dto.amount,
    );
  }

  /**
   * Récupérer l'historique des paiements d'un Worker
   * GET /api/v1/payments/worker/history
   */
  @Get('worker/history')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.WORKER)
  async getWorkerPayments(@Request() req: any) {
    return this.stripeService.getWorkerPayments(req.user.userId || req.user.sub);
  }

  /**
   * Webhook Stripe
   * POST /api/v1/payments/webhook
   * Note: Ce endpoint ne doit PAS avoir de guards (Stripe l'appelle directement)
   */
  @Post('webhook')
  async handleWebhook(
    @Req() req: RawBodyRequest<any>,
    @Headers('stripe-signature') signature: string,
  ) {
    const rawBody = req.rawBody;
    if (!rawBody) {
      throw new Error('Raw body manquant');
    }

    await this.stripeService.handleWebhook(rawBody, signature);

    return { received: true };
  }
}

