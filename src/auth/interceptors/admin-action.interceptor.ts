import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLoggerService } from '../../common/audit/audit-logger.service';

export const ADMIN_ACTION_KEY = 'admin_action';

export interface AdminActionMetadata {
  action: string;
  description?: string;
}

/**
 * AdminActionInterceptor - Automatically logs admin actions to TrustAuditLog
 * PR-04: Permissions & RBAC
 *
 * Usage:
 * @AdminAction({ action: 'reconcile_payments', description: 'Reconcile all pending payments' })
 * @UseInterceptors(AdminActionInterceptor)
 *
 * Features:
 * - Logs action before and after execution
 * - Records success/failure status
 * - Captures request context (IP, user agent, correlation ID)
 * - Persists to TrustAuditLog for audit trail
 */
@Injectable()
export class AdminActionInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AdminActionInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
    private readonly auditLogger: AuditLoggerService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const metadata = this.reflector.get<AdminActionMetadata>(
      ADMIN_ACTION_KEY,
      context.getHandler(),
    );

    // If no @AdminAction decorator, just pass through
    if (!metadata) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const startTime = Date.now();

    // Extract context
    const actionContext = {
      userId: user?.sub || user?.userId || 'unknown',
      userRole: user?.role || 'unknown',
      action: metadata.action,
      description: metadata.description,
      endpoint: `${request.method} ${request.url}`,
      ipAddress: request.ip || request.socket?.remoteAddress,
      userAgent: request.headers?.['user-agent']?.substring(0, 255),
      correlationId: request.correlationId || request.headers?.['x-correlation-id'],
      requestBody: this.sanitizeRequestBody(request.body),
    };

    // Log action start
    this.logger.log(`[ADMIN] Starting: ${metadata.action} by ${actionContext.userId}`);

    return next.handle().pipe(
      tap({
        next: (response) => {
          const durationMs = Date.now() - startTime;
          this.logAdminAction(actionContext, 'success', durationMs, response);
        },
        error: (error) => {
          const durationMs = Date.now() - startTime;
          this.logAdminAction(actionContext, 'error', durationMs, null, error.message);
        },
      }),
    );
  }

  private async logAdminAction(
    context: Record<string, unknown>,
    status: 'success' | 'error',
    durationMs: number,
    response?: unknown,
    errorMessage?: string,
  ): Promise<void> {
    // Log to structured logger
    this.auditLogger.logBusinessEvent(AuditLoggerService.EVENTS.ADMIN_ACTION, {
      ...context,
      status,
      durationMs,
      ...(errorMessage && { error: errorMessage }),
    });

    // Persist to TrustAuditLog
    try {
      await this.prisma.trustAuditLog.create({
        data: {
          category: 'ADMIN_ACTION',
          action: context.action as string,
          actorId: context.userId as string,
          actorType: 'admin',
          targetType: 'system',
          targetId: context.endpoint as string,
          reason: context.description as string,
          ipAddress: context.ipAddress as string,
          userAgent: context.userAgent as string,
          correlationId: context.correlationId as string,
          newValue: {
            status,
            durationMs,
            requestBody: context.requestBody as object,
            responsePreview: response ? this.truncateResponse(response) : null,
            error: errorMessage || null,
          } as object,
          flagged: status === 'error', // Flag failed admin actions for review
        },
      });
    } catch (error) {
      this.logger.error(`Failed to persist admin action log: ${error}`);
    }

    // Final log
    const logMessage = `[ADMIN] ${status === 'success' ? '✓' : '✗'} ${context.action} by ${context.userId} (${durationMs}ms)`;
    if (status === 'error') {
      this.logger.error(logMessage);
    } else {
      this.logger.log(logMessage);
    }
  }

  /**
   * Sanitize request body to remove sensitive data
   */
  private sanitizeRequestBody(body: unknown): unknown {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sensitiveKeys = ['password', 'secret', 'token', 'apiKey', 'authorization'];
    const sanitized = { ...(body as Record<string, unknown>) };

    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.some((sk) => key.toLowerCase().includes(sk))) {
        sanitized[key] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Truncate response for logging (avoid huge payloads)
   */
  private truncateResponse(response: unknown): unknown {
    const str = JSON.stringify(response);
    if (str.length > 500) {
      return { _truncated: true, preview: str.substring(0, 500) + '...' };
    }
    return response;
  }
}

