import { Module } from '@nestjs/common';
import { GhlController } from './ghl.controller';
import { GhlService } from './ghl.service';
import { PrismaModule } from '../prisma/prisma.module';

/**
 * GHL Integration Module
 *
 * Handles GoHighLevel webhook integrations via N8N.
 * Provides public endpoints for:
 * - Mission creation from GHL forms
 * - Worker signup from GHL forms
 */
@Module({
  imports: [PrismaModule],
  controllers: [GhlController],
  providers: [GhlService],
  exports: [GhlService],
})
export class GhlModule {}
