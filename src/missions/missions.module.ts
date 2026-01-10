import { Module, forwardRef } from '@nestjs/common';
import { MissionsController } from './missions.controller';
import { MissionsService } from './missions.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ComplianceModule } from '../compliance/compliance.module';

@Module({
  imports: [PrismaModule, AuthModule, forwardRef(() => NotificationsModule), ComplianceModule],
  controllers: [MissionsController],
  providers: [MissionsService],
  exports: [MissionsService],
})
export class MissionsModule {}

