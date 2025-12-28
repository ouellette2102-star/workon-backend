import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

// Extend Express Request to include correlationId
declare global {
  namespace Express {
    interface Request {
      correlationId: string;
    }
  }
}

/**
 * Middleware qui ajoute un correlationId à chaque requête
 * Utilisé pour tracer les logs à travers toute la chaîne de traitement
 */
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    // Utiliser X-Correlation-ID ou X-Request-ID du header si présent, sinon générer
    const correlationId =
      (req.headers['x-correlation-id'] as string) ||
      (req.headers['x-request-id'] as string) ||
      uuidv4();

    req.correlationId = correlationId;
    res.setHeader('X-Correlation-ID', correlationId);
    res.setHeader('X-Request-ID', correlationId);

    // Log structuré de la requête entrante
    const startTime = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const { method, originalUrl, ip } = req;
      const { statusCode } = res;

      // Log structuré (sans données sensibles)
      const logData = {
        correlationId,
        method,
        path: originalUrl.split('?')[0], // Sans query params (potentiellement sensibles)
        statusCode,
        durationMs: duration,
        ip: this.sanitizeIp(ip),
        userAgent: this.truncate(req.headers['user-agent'] || '', 100),
      };

      // Ne pas loguer les health checks en prod pour éviter le bruit
      if (originalUrl.includes('/health') || originalUrl.includes('/ready')) {
        return;
      }

      if (statusCode >= 500) {
        this.logger.error(JSON.stringify(logData));
      } else if (statusCode >= 400) {
        this.logger.warn(JSON.stringify(logData));
      } else {
        this.logger.log(JSON.stringify(logData));
      }
    });

    next();
  }

  /**
   * Masque partiellement l'IP pour la confidentialité
   */
  private sanitizeIp(ip: string | undefined): string {
    if (!ip) return 'unknown';
    // Masquer les derniers octets
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.xxx.xxx`;
    }
    return ip.slice(0, 10) + '...';
  }

  /**
   * Tronque une chaîne à la longueur max
   */
  private truncate(str: string, maxLength: number): string {
    return str.length > maxLength ? str.slice(0, maxLength) + '...' : str;
  }
}

/**
 * Helper pour créer un log structuré avec correlationId
 */
export function createStructuredLog(
  level: 'log' | 'warn' | 'error',
  message: string,
  context: string,
  correlationId?: string,
  extra?: Record<string, unknown>,
): Record<string, unknown> {
  // Filtrer les clés sensibles
  const sanitizedExtra = extra ? sanitizeObject(extra) : undefined;

  return {
    level,
    message,
    context,
    correlationId: correlationId || 'system',
    timestamp: new Date().toISOString(),
    ...sanitizedExtra,
  };
}

/**
 * Supprime les clés sensibles d'un objet
 */
function sanitizeObject(obj: Record<string, unknown>): Record<string, unknown> {
  const sensitiveKeys = [
    'password',
    'secret',
    'token',
    'apikey',
    'authorization',
    'stripe',
    'jwt',
    'cookie',
    'session',
  ];

  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = sensitiveKeys.some((sk) => lowerKey.includes(sk));

    if (isSensitive) {
      result[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      result[key] = sanitizeObject(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }

  return result;
}

