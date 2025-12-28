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
 * Codes d'erreur standardisés pour le frontend
 */
export enum ErrorCode {
  // Auth (401, 403)
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  
  // Validation (400, 422)
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  BAD_REQUEST = 'BAD_REQUEST',
  INVALID_INPUT = 'INVALID_INPUT',
  
  // Resources (404, 409)
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  MISSION_NOT_FOUND = 'MISSION_NOT_FOUND',
  CONFLICT = 'CONFLICT',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  
  // Rate limiting (429)
  TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',
  
  // Server (500, 503)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  
  // Payments
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  PAYMENT_REQUIRED = 'PAYMENT_REQUIRED',
}

/**
 * Interface de réponse d'erreur standardisée (frontend-safe)
 */
export interface StandardErrorResponse {
  error: {
    code: string;
    message: string;
    status: number;
    details?: string[];
    requestId?: string;
    timestamp?: string;
  };
}

/**
 * Global HTTP Exception Filter
 * 
 * Standardise toutes les réponses d'erreur API avec le format :
 * { error: { code, message, status, details?, requestId?, timestamp? } }
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

    const requestId = (request as any).correlationId || (request as any).requestId || 'unknown';
    const timestamp = new Date().toISOString();
    const isProduction = process.env.NODE_ENV === 'production';

    let status: number;
    let message: string;
    let code: string;
    let details: string[] | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      // Extraire le message
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const resp = exceptionResponse as Record<string, unknown>;
        
        // Si c'est un array de messages (validation errors)
        if (Array.isArray(resp.message)) {
          message = resp.message[0] || 'Validation error';
          details = resp.message as string[];
        } else {
          message = (resp.message as string) || exception.message;
        }
      } else {
        message = exception.message;
      }

      // Mapper le status HTTP vers un code d'erreur
      code = this.mapStatusToCode(status, message);
    } else if (exception instanceof Error) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = isProduction ? 'Internal server error' : exception.message;
      code = ErrorCode.INTERNAL_ERROR;

      // Log l'erreur complète côté serveur
      this.logger.error(
        `Unhandled exception: ${exception.message}`,
        exception.stack,
        { requestId },
      );
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';
      code = ErrorCode.INTERNAL_ERROR;
    }

    // Log des erreurs 5xx
    if (status >= 500) {
      this.logger.error(`[${requestId}] ${status} ${request.url}`, {
        code,
        message: isProduction ? undefined : message,
      });
    }

    // Réponse d'erreur standardisée
    const errorResponse: StandardErrorResponse = {
      error: {
        code,
        message,
        status,
        ...(details && { details }),
        requestId,
        timestamp,
      },
    };

    response.status(status).json(errorResponse);
  }

  /**
   * Mappe un status HTTP vers un code d'erreur métier
   */
  private mapStatusToCode(status: number, message: string): string {
    // Codes spécifiques basés sur le message
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('not found')) {
      if (lowerMessage.includes('user')) return ErrorCode.USER_NOT_FOUND;
      if (lowerMessage.includes('mission')) return ErrorCode.MISSION_NOT_FOUND;
      return ErrorCode.RESOURCE_NOT_FOUND;
    }

    if (lowerMessage.includes('already exists') || lowerMessage.includes('duplicate')) {
      return ErrorCode.ALREADY_EXISTS;
    }

    if (lowerMessage.includes('expired')) {
      return ErrorCode.TOKEN_EXPIRED;
    }

    if (lowerMessage.includes('invalid') && lowerMessage.includes('credentials')) {
      return ErrorCode.INVALID_CREDENTIALS;
    }

    // Codes par status HTTP
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return ErrorCode.BAD_REQUEST;
      case HttpStatus.UNAUTHORIZED:
        return ErrorCode.UNAUTHORIZED;
      case HttpStatus.FORBIDDEN:
        return ErrorCode.FORBIDDEN;
      case HttpStatus.NOT_FOUND:
        return ErrorCode.RESOURCE_NOT_FOUND;
      case HttpStatus.CONFLICT:
        return ErrorCode.CONFLICT;
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return ErrorCode.VALIDATION_ERROR;
      case HttpStatus.TOO_MANY_REQUESTS:
        return ErrorCode.TOO_MANY_REQUESTS;
      case HttpStatus.PAYMENT_REQUIRED:
        return ErrorCode.PAYMENT_REQUIRED;
      case HttpStatus.SERVICE_UNAVAILABLE:
        return ErrorCode.SERVICE_UNAVAILABLE;
      default:
        return status >= 500 ? ErrorCode.INTERNAL_ERROR : ErrorCode.BAD_REQUEST;
    }
  }
}
