import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GhlController } from './ghl.controller';
import { GhlService } from './ghl.service';
import { GhlWebhookGuard } from './guards/ghl-webhook.guard';
import { PrismaModule } from '../prisma/prisma.module';

/**
 * GHL Integration Module
 *
 * Handles GoHighLevel webhook integrations via N8N.
 * Protected by GhlWebhookGuard (API key or HMAC signature).
 */
@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [GhlController],
  providers: [GhlService, GhlWebhookGuard],
  exports: [GhlService],
})
export class GhlModule {}
