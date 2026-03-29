import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  RawBodyRequest,
  Req,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { StripeService } from './stripe.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import { OpenDisputeDto } from './dto/open-dispute.dto';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';

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
      dto.amountCents,
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
      dto.amountCents,
    );
  }

  /**
   * Récupérer l'historique des paiements d'un Worker
   * GET /api/v1/payments/worker/history
   */
  @Get('worker/history')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.WORKER)
  @ApiQuery({ name: 'cursor', required: false, description: 'Cursor for next page' })
  @ApiQuery({ name: 'limit', required: false, example: 20, description: 'Items per page (max 100)' })
  async getWorkerPayments(
    @Request() req: any,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.stripeService.getWorkerPayments(
      req.user.userId || req.user.sub,
      { cursor, limit: limit ? parseInt(limit, 10) : undefined },
    );
  }

  // ============================================
  // REFUNDS
  // ============================================

  /**
   * Demander un remboursement
   * POST /api/v1/payments/stripe/refund
   */
  @Post('refund')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Request a refund',
    description: 'Issues a full refund for a succeeded payment. Only the mission employer can request.',
  })
  @ApiResponse({ status: 200, description: 'Refund issued' })
  @ApiResponse({ status: 400, description: 'Payment not eligible for refund' })
  async refundPayment(@Request() req: any, @Body() dto: RefundPaymentDto) {
    return this.stripeService.refundPayment(
      req.user.userId || req.user.sub,
      dto.paymentId,
      dto.reason,
    );
  }

  // ============================================
  // DISPUTES
  // ============================================

  /**
   * Ouvrir un litige
   * POST /api/v1/payments/stripe/disputes
   */
  @Post('disputes')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Open a dispute',
    description: 'Opens a dispute on a mission. Only the employer or assigned worker can open.',
  })
  @ApiResponse({ status: 201, description: 'Dispute created' })
  async openDispute(@Request() req: any, @Body() dto: OpenDisputeDto) {
    return this.stripeService.openDispute(
      req.user.userId || req.user.sub,
      dto.missionId,
      dto.reason,
    );
  }

  /**
   * Résoudre un litige
   * POST /api/v1/payments/stripe/disputes/:id/resolve
   */
  @Post('disputes/:id/resolve')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Resolve a dispute',
    description: 'Resolves a dispute with optional refund.',
  })
  @ApiResponse({ status: 200, description: 'Dispute resolved' })
  async resolveDispute(
    @Param('id') disputeId: string,
    @Request() req: any,
    @Body() dto: ResolveDisputeDto,
  ) {
    return this.stripeService.resolveDispute(
      disputeId,
      dto.resolution,
      req.user.userId || req.user.sub,
      dto.refundRequested,
    );
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

