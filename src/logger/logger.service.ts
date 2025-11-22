import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Inject } from '@nestjs/common';

@Injectable()
export class LoggerService implements NestLoggerService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: NestLoggerService,
  ) {}

  log(message: any, context?: string) {
    this.logger?.log?.(message, context);
  }

  error(message: any, trace?: string, context?: string) {
    this.logger?.error?.(message, trace, context);
  }

  warn(message: any, context?: string) {
    this.logger?.warn?.(message, context);
  }

  debug(message: any, context?: string) {
    this.logger?.debug?.(message, context);
  }

  verbose(message: any, context?: string) {
    this.logger?.verbose?.(message, context);
  }
}

