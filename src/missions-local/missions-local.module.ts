import { Module, forwardRef } from '@nestjs/common';
import { MissionsLocalController } from './missions-local.controller';
import { MissionsLocalService } from './missions-local.service';
import { MissionsLocalRepository } from './missions-local.repository';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { PaymentsModule } from '../payments/payments.module';
import { ReputationModule } from '../reputation/reputation.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    forwardRef(() => PaymentsModule),
    ReputationModule,
    NotificationsModule,
  ],
  controllers: [MissionsLocalController],
  providers: [MissionsLocalService, MissionsLocalRepository],
  exports: [MissionsLocalService],
})
export class MissionsLocalModule {}

