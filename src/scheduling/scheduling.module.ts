import { Module } from '@nestjs/common';
import { SchedulingService } from './scheduling.service';
import { SchedulingController } from './scheduling.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

/**
 * Scheduling Module
 * PR-10: Scheduling & Recurrence Primitives
 *
 * Provides:
 * - Recurring mission templates
 * - Worker availability management
 * - Booking system
 */
@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [SchedulingController],
  providers: [SchedulingService],
  exports: [SchedulingService],
})
export class SchedulingModule {}

