import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NotificationsController } from './notifications.controller';
import { NotificationPreferencesController } from './notification-preferences.controller';
import { NotificationQueueController } from './notification-queue.controller';
import { NotificationsService } from './notifications.service';
import { NotificationPreferencesService } from './notification-preferences.service';
import { NotificationQueueService } from './notification-queue.service';
import { NotificationDeliveryService } from './notification-delivery.service';
import { NotificationWorkerService } from './notification-worker.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { DevicesModule } from '../devices/devices.module';
import { PushModule } from '../push/push.module';
import { ProductionConfigModule } from '../config/production-config.module';

// Providers
import {
  DELIVERY_PROVIDERS,
  SendGridEmailProvider,
  FcmPushProvider,
} from './providers';

/**
 * NotificationsModule
 * 
 * PR-12: Production-grade notification system with:
 * - User notification preferences (per type, per channel)
 * - Reliable notification queue with retry logic
 * - Delivery tracking and analytics
 * - Quiet hours support
 * - Idempotency protection
 *
 * PR-A: Delivery providers for actual notification sending:
 * - SendGrid for email
 * - FCM for push notifications
 * - Feature flags control (default: OFF)
 *
 * PR-B: Worker process for queue consumption:
 * - NotificationWorkerService for reliable delivery
 * - Batch processing with locking
 * - Retry with exponential backoff
 */
@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    forwardRef(() => AuthModule),
    DevicesModule,
    PushModule,
    ProductionConfigModule,
  ],
  controllers: [
    NotificationsController,
    NotificationPreferencesController,
    NotificationQueueController,
  ],
  providers: [
    NotificationsService,
    NotificationPreferencesService,
    NotificationQueueService,
    NotificationDeliveryService,
    NotificationWorkerService,
    // Email provider
    SendGridEmailProvider,
    {
      provide: DELIVERY_PROVIDERS.EMAIL,
      useExisting: SendGridEmailProvider,
    },
    // Push provider
    FcmPushProvider,
    {
      provide: DELIVERY_PROVIDERS.PUSH,
      useExisting: FcmPushProvider,
    },
  ],
  exports: [
    NotificationsService,
    NotificationPreferencesService,
    NotificationQueueService,
    NotificationDeliveryService,
    NotificationWorkerService,
  ],
})
export class NotificationsModule {}

