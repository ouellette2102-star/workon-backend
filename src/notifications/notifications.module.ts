import { Module, forwardRef } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationPreferencesService } from './notification-preferences.service';
import { NotificationQueueService } from './notification-queue.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { DevicesModule } from '../devices/devices.module';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => AuthModule),
    DevicesModule, // PR-PUSH: For getting push tokens
  ],
  controllers: [NotificationsController],
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

