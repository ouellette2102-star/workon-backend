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
import { StripeService } from './stripe.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';

@Controller('payments')
export class StripeController {
  constructor(private readonly stripeService: StripeService) {}

  /**
   * Créer un lien d'onboarding Stripe Connect pour un Worker
   * GET /api/v1/payments/connect/onboarding
   */
  @Get('connect/onboarding')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.WORKER)
  async createOnboardingLink(@Request() req: any) {
    const url = await this.stripeService.createConnectOnboardingLink(
      req.user.userId || req.user.sub,
    );
    return { url };
  }

  /**
   * Vérifier le statut d'onboarding d'un Worker
   * GET /api/v1/payments/connect/status
   */
  @Get('connect/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.WORKER)
  async getOnboardingStatus(@Request() req: any) {
    return this.stripeService.checkOnboardingStatus(req.user.userId || req.user.sub);
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

