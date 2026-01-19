import { Module } from '@nestjs/common';
import { SchedulingService } from './scheduling.service';
import { PrismaModule } from '../prisma/prisma.module';

/**
 * Scheduling Module
 * PR-10: Scheduling & Recurrence Primitives
 *
 * Provides:
 * - Recurring mission templates
 * - Worker availability management
 * - Booking system
 *
 * NOTE: No complex UI yet. This is the backend foundation for:
 * - Advance booking
 * - Recurring services
 * - Calendar integration (future)
 */
@Module({
  imports: [PrismaModule],
  providers: [SchedulingService],
  exports: [SchedulingService],
})
export class SchedulingModule {}

