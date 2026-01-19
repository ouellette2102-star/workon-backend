import { Module } from '@nestjs/common';
import { EarningsController } from './earnings.controller';
import { EarningsService } from './earnings.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

/**
 * Module for worker earnings.
 *
 * Provides endpoints for:
 * - GET /api/v1/earnings/summary
 * - GET /api/v1/earnings/history
 * - GET /api/v1/earnings/by-mission/:missionId
 *
 * PR-EARNINGS: Earnings module implementation.
 */
@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [EarningsController],
  providers: [EarningsService],
  exports: [EarningsService],
})
export class EarningsModule {}

