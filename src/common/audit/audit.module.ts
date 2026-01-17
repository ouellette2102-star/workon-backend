import { Global, Module } from '@nestjs/common';
import { AuditLoggerService } from './audit-logger.service';

/**
 * AuditModule - Module global pour le logging d'audit
 * PR-I2: Production Monitoring Hardening
 *
 * @Global permet d'injecter AuditLoggerService dans n'importe quel module
 * sans avoir à importer AuditModule explicitement.
 */
@Global()
@Module({
  providers: [AuditLoggerService],
  exports: [AuditLoggerService],
})
export class AuditModule {}

