import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { InvoiceService } from './invoice.service';
import { WebhooksController } from './webhooks.controller';
import { CheckoutController } from './checkout.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { ComplianceModule } from '../compliance/compliance.module';

/**
 * Payments Module
 *
 * PROTECTION LÉGALE: Importe ComplianceModule pour activer ConsentGuard.
 * Tous les endpoints de paiement/checkout sont protégés par @RequireConsent.
 *
 * Note: WebhooksController n'est PAS protégé (machine-to-machine depuis Stripe).
 */
@Module({
  imports: [PrismaModule, AuthModule, ComplianceModule],
  controllers: [PaymentsController, WebhooksController, CheckoutController],
  providers: [PaymentsService, InvoiceService],
  exports: [PaymentsService, InvoiceService],
})
export class PaymentsModule {}

