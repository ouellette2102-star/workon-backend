import { Module, Global } from '@nestjs/common';
import { AlertService } from './alert.service';

/**
 * AlertModule - Global alerting service
 * PR-01: Observability
 *
 * Provides AlertService globally for production alerting.
 * Configure via:
 * - ALERT_WEBHOOK_URL: Slack/Discord/generic webhook URL
 * - ALERTS_ENABLED: Set to "0" to disable (defaults to enabled)
 */
@Global()
@Module({
  providers: [AlertService],
  exports: [AlertService],
})
export class AlertModule {}

