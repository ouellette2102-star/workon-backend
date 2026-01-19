import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ProductionConfigModule } from '../config/production-config.module';
import { NotificationWorkerService } from '../notifications/notification-worker.service';

/**
 * Notification Worker Module
 * PR-B: Minimal module for worker process
 *
 * Contains only what's needed for the worker:
 * - Configuration
 * - Database (Prisma)
 * - Notifications module (queue + delivery)
 * - Worker service
 *
 * Does NOT include:
 * - HTTP controllers
 * - Auth module
 * - Other business modules
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    PrismaModule,
    ProductionConfigModule,
    NotificationsModule,
  ],
  providers: [NotificationWorkerService],
})
export class NotificationsWorkerModule {}

