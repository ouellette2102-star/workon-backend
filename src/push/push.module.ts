import { Module, Global } from '@nestjs/common';
import { PushService } from './push.service';

/**
 * Global module for push notifications.
 *
 * Marked as Global so it can be injected anywhere without importing.
 * PR-PUSH: Initial implementation.
 */
@Global()
@Module({
  providers: [PushService],
  exports: [PushService],
})
export class PushModule {}

