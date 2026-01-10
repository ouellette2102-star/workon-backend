import { Controller, Post, Headers, RawBodyRequest, Req, Logger, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { PaymentsService } from './payments.service';
import { InvoiceService } from './invoice.service';
import Stripe from 'stripe';
import { Request } from 'express';

@ApiTags('Webhooks')
@Controller('api/v1/webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);
  private readonly stripe: Stripe | null;

  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly invoiceService: InvoiceService,
    private readonly configService: ConfigService,
  ) {
    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');

    if (stripeSecretKey) {
      this.stripe = new Stripe(stripeSecretKey);
    } else {
      this.stripe = null;
    }
  }

  /**
   * POST /api/v1/webhooks/stripe
   * Webhook endpoint pour Stripe (signature vérifiée)
   */
  @Post('stripe')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Stripe webhook endpoint',
    description:
      'Receives and processes Stripe webhook events. ' +
      'Signature is verified using STRIPE_WEBHOOK_SECRET. ' +
      'Supports: payment_intent.amount_capturable_updated, payment_intent.succeeded, ' +
      'payment_intent.canceled, payment_intent.payment_failed. ' +
      'Idempotent via lastStripeEventId.',
  })
  @ApiResponse({ status: 200, description: 'Webhook received and processed' })
  @ApiResponse({ status: 400, description: 'Invalid signature' })
  async handleStripeWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    if (!this.stripe) {
      this.logger.error('Stripe non configuré');
      return { received: false, error: 'Stripe not configured' };
    }

    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) {
      this.logger.error('STRIPE_WEBHOOK_SECRET non configuré');
      return { received: false, error: 'Webhook secret not configured' };
    }

    if (!signature) {
      this.logger.warn('Webhook reçu sans signature');
      return { received: false, error: 'Missing signature' };
    }

    let event: Stripe.Event;

    try {
      // Récupérer le raw body (Buffer) pour vérification signature
      const rawBody = req.rawBody instanceof Buffer ? req.rawBody : Buffer.from(req.rawBody || '');

      event = this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err) {
      this.logger.error(`Erreur de signature webhook: ${err instanceof Error ? err.message : String(err)}`);
      return { received: false, error: 'Invalid signature' };
    }

    this.logger.log(`Webhook Stripe reçu: ${event.type} (${event.id})`);

    // Traiter l'événement de manière idempotente
    try {
      // Handle Checkout Session events (for Invoice flow)
      if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        await this.invoiceService.handleCheckoutCompleted(session, event.id);
        this.logger.log(`Checkout session completed: ${session.id}`);
        return { received: true, eventId: event.id, type: event.type };
      }

      if (event.type === 'checkout.session.expired') {
        const session = event.data.object as Stripe.Checkout.Session;
        await this.invoiceService.handleCheckoutExpired(session, event.id);
        this.logger.log(`Checkout session expired: ${session.id}`);
        return { received: true, eventId: event.id, type: event.type };
      }

      // Handle PaymentIntent events (for escrow flow)
      await this.paymentsService.handleWebhookEvent(event);
      return { received: true, eventId: event.id, type: event.type };
    } catch (error) {
      this.logger.error(`Erreur lors du traitement du webhook ${event.id}: ${error}`);
      // Toujours retourner 200 pour éviter les retries inutiles
      return { received: true, error: 'Processing failed', eventId: event.id };
    }
  }
}
