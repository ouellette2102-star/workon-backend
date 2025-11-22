import { Controller, Post, Headers, Body, RawBodyRequest, Req, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentsService } from './payments.service';
import Stripe from 'stripe';
import { Request } from 'express';

@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);
  private readonly stripe: Stripe | null;

  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly configService: ConfigService,
  ) {
    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');

    if (stripeSecretKey) {
      this.stripe = new Stripe(stripeSecretKey);
    } else {
      this.stripe = null;
    }
  }

  @Post('stripe')
  async handleStripeWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    if (!this.stripe) {
      this.logger.error('Stripe non configuré');
      return { received: false };
    }

    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) {
      this.logger.error('STRIPE_WEBHOOK_SECRET non configuré');
      return { received: false };
    }

    let event: Stripe.Event;

    try {
      // Vérifier la signature du webhook
      // Note: req.rawBody doit être un Buffer pour Stripe
      const rawBody = req.rawBody instanceof Buffer ? req.rawBody : Buffer.from(req.rawBody || '');
      
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret,
      );
    } catch (err) {
      this.logger.error(`Erreur de signature webhook: ${err}`);
      return { received: false, error: 'Invalid signature' };
    }

    // Traiter l'événement de manière idempotente
    try {
      await this.paymentsService.handleWebhookEvent(event);
      return { received: true };
    } catch (error) {
      this.logger.error(`Erreur lors du traitement du webhook: ${error}`);
      // Retourner reçu mais avec erreur (Stripe retryera)
      return { received: true, error: 'Processing failed' };
    }
  }
}
