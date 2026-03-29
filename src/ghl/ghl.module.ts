import { Module } from '@nestjs/common';
import { GhlController } from './ghl.controller';
import { GhlService } from './ghl.service';
import { GhlWebhookGuard } from './guards/ghl-webhook.guard';
import { PrismaModule } from '../prisma/prisma.module';

/**
 * GHL Integration Module
 *
 * Handles GoHighLevel webhook integrations via N8N.
 * All endpoints protected by GHL_WEBHOOK_SECRET (x-ghl-secret header).
 */
@Module({
  imports: [PrismaModule],
  controllers: [GhlController],
  providers: [GhlService, GhlWebhookGuard],
  exports: [GhlService, GhlWebhookGuard],
})
export class GhlModule {}
