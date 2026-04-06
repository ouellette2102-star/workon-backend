import { Module } from '@nestjs/common';
import { DisputesController } from './disputes.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

/**
 * Disputes Module
 * Exposes dispute management endpoints for the existing
 * Dispute, DisputeEvidence, and DisputeTimeline schema models.
 */
@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [DisputesController],
})
export class DisputesModule {}
