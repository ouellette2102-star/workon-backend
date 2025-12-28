import { Module, forwardRef } from '@nestjs/common';
import { MissionEventsController } from './mission-events.controller';
import { MissionEventsService } from './mission-events.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, forwardRef(() => AuthModule)],
  controllers: [MissionEventsController],
  providers: [MissionEventsService],
  exports: [MissionEventsService],
})
export class MissionEventsModule {}

