import { Module } from '@nestjs/common';
import { SchedulingService } from './scheduling.service';
import { SchedulingController } from './scheduling.controller';
import { SchedulingCronController } from './scheduling-cron.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

/**
 * Scheduling Module
 *
 * Provides:
 * - Recurring mission templates
 * - Worker availability management
 * - Booking system
 * - Cron endpoint for auto-generation
 */
@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [SchedulingController, SchedulingCronController],
  providers: [SchedulingService],
  exports: [SchedulingService],
})
export class SchedulingModule {}
