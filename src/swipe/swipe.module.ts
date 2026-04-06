import { Module } from '@nestjs/common';
import { SwipeService } from './swipe.service';
import { SwipeController } from './swipe.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { PushModule } from '../push/push.module';
import { DevicesModule } from '../devices/devices.module';

/**
 * Swipe Discovery Module
 *
 * Provides talent discovery through a swipe-based interface.
 * Complements the Map module (mission discovery).
 *
 * MAP = find work
 * SWIPE = find talent
 */
@Module({
  imports: [PrismaModule, AuthModule, PushModule, DevicesModule],
  controllers: [SwipeController],
  providers: [SwipeService],
  exports: [SwipeService],
})
export class SwipeModule {}
