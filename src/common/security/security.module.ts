import { Module, Global } from '@nestjs/common';
import { LogSanitizerService } from './log-sanitizer.service';
import { InputValidatorService } from './input-validator.service';

/**
 * Security Module
 * PR-09: Final Guard Rails
 *
 * Provides security utilities:
 * - Log sanitization (prevent PII leakage)
 * - Input validation (defense in depth)
 *
 * GLOBAL: Available to all modules without explicit import
 */
@Global()
@Module({
  providers: [LogSanitizerService, InputValidatorService],
  exports: [LogSanitizerService, InputValidatorService],
})
export class SecurityModule {}

