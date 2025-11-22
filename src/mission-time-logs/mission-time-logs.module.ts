import { Module, forwardRef } from '@nestjs/common';
import { MissionTimeLogsController } from './mission-time-logs.controller';
import { MissionTimeLogsService } from './mission-time-logs.service';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => NotificationsModule),
    forwardRef(() => AuthModule),
  ],
  controllers: [MissionTimeLogsController],
  providers: [MissionTimeLogsService],
  exports: [MissionTimeLogsService],
})
export class MissionTimeLogsModule {}

