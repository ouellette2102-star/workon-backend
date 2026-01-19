import { Module, forwardRef } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationPreferencesController } from './notification-preferences.controller';
import { NotificationQueueController } from './notification-queue.controller';
import { NotificationsService } from './notifications.service';
import { NotificationPreferencesService } from './notification-preferences.service';
import { NotificationQueueService } from './notification-queue.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { DevicesModule } from '../devices/devices.module';

/**
 * NotificationsModule
 * 
 * PR-12: Production-grade notification system with:
 * - User notification preferences (per type, per channel)
 * - Reliable notification queue with retry logic
 * - Delivery tracking and analytics
 * - Quiet hours support
 * - Idempotency protection
 */
@Module({
  imports: [
    PrismaModule,
    forwardRef(() => AuthModule),
    DevicesModule, // PR-PUSH: For getting push tokens
  ],
  controllers: [
    NotificationsController,           // Legacy in-app notifications
    NotificationPreferencesController, // PR-12: User preferences API
    NotificationQueueController,       // PR-12: Queue management API
  ],
  providers: [
    NotificationsService,
    NotificationPreferencesService, // PR-12: User notification preferences
    NotificationQueueService,       // PR-12: Notification queue management
  ],
  exports: [
    NotificationsService,
    NotificationPreferencesService,
    NotificationQueueService,
  ],
})
export class NotificationsModule {}

