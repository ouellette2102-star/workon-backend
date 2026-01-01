import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { InvoiceService } from './invoice.service';
import { WebhooksController } from './webhooks.controller';
import { CheckoutController } from './checkout.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [PaymentsController, WebhooksController, CheckoutController],
  providers: [PaymentsService, InvoiceService],
  exports: [PaymentsService, InvoiceService],
})
export class PaymentsModule {}

