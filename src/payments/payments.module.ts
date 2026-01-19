import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { InvoiceService } from './invoice.service';
import { StripeSecurityService } from './stripe-security.service';
import { WebhooksController } from './webhooks.controller';
import { CheckoutController } from './checkout.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { ComplianceModule } from '../compliance/compliance.module';
import { AuditModule } from '../common/audit/audit.module';

/**
 * Payments Module
 *
 * PROTECTION LÉGALE: Importe ComplianceModule pour activer ConsentGuard.
 * Tous les endpoints de paiement/checkout sont protégés par @RequireConsent.
 *
 * PR-03: Includes StripeSecurityService for:
 * - Velocity checks (transaction limits)
 * - Payment audit logging
 * - Stripe Radar metadata
 *
 * Note: WebhooksController n'est PAS protégé (machine-to-machine depuis Stripe).
 */
@Module({
  imports: [PrismaModule, AuthModule, ComplianceModule, AuditModule],
  controllers: [PaymentsController, WebhooksController, CheckoutController],
  providers: [PaymentsService, InvoiceService, StripeSecurityService],
  exports: [PaymentsService, InvoiceService, StripeSecurityService],
})
export class PaymentsModule {}

