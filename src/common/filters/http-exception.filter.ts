import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Global HTTP Exception Filter
 * 
 * Standardise toutes les réponses d'erreur API avec le format :
 * { statusCode, message, path, requestId, timestamp }
 * 
 * SÉCURITÉ: Ne jamais exposer les stacktraces en production
 */
@Catch()
export class GlobalHttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalHttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const requestId = (request as any).requestId || 'unknown';
    const path = request.url;
    const timestamp = new Date().toISOString();
    const isProduction = process.env.NODE_ENV === 'production';

    let statusCode: number;
    let message: string | string[];

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const resp = exceptionResponse as Record<string, unknown>;
        message = (resp.message as string | string[]) || exception.message;
      } else {
        message = exception.message;
      }
    } else if (exception instanceof Error) {
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      message = isProduction ? 'Internal server error' : exception.message;

      // Log l'erreur complète côté serveur
      this.logger.error(
        `Unhandled exception: ${exception.message}`,
        exception.stack,
        { requestId, path },
      );
    } else {
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';
    }

    // Log des erreurs 5xx
    if (statusCode >= 500) {
      this.logger.error(`[${requestId}] ${statusCode} ${path}`, {
        exception: isProduction ? undefined : exception,
      });
    }

    const errorResponse = {
      statusCode,
      message,
      path,
      requestId,
      timestamp,
    };

    response.status(statusCode).json(errorResponse);
  }
}

