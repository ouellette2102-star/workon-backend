import { Module } from '@nestjs/common';
import {
  SubscriptionsController,
  UsageController,
} from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { MissionQuotaGuard } from './guards/mission-quota.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [SubscriptionsController, UsageController],
  providers: [SubscriptionsService, MissionQuotaGuard],
  exports: [SubscriptionsService, MissionQuotaGuard],
})
export class SubscriptionsModule {}
