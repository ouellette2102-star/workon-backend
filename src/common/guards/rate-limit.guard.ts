import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

// Simple in-memory rate limiter (pour MVP, pas distribué)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

// Cleanup automatique toutes les 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Décorateur pour définir des limites de rate personnalisées
 */
export const RATE_LIMIT_KEY = 'rateLimit';

export interface RateLimitOptions {
  /** Nombre max de requêtes */
  limit: number;
  /** Fenêtre en secondes */
  windowSec: number;
  /** Préfixe pour identifier le type de limite */
  prefix: string;
}

/**
 * Guard de rate limiting ciblé
 * Utilisé sur les endpoints sensibles (auth, payments, media)
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);
  private readonly defaultLimit: number;
  private readonly defaultWindow: number;

  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
  ) {
    // Valeurs par défaut depuis env ou fallback
    this.defaultLimit = parseInt(
      this.configService.get<string>('RATE_LIMIT_DEFAULT', '60'),
      10,
    );
    this.defaultWindow = parseInt(
      this.configService.get<string>('RATE_LIMIT_WINDOW_SEC', '60'),
      10,
    );
  }

  canActivate(context: ExecutionContext): boolean {
    // Bypass en mode test
    const nodeEnv = this.configService.get<string>('NODE_ENV');
    if (nodeEnv === 'test') {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const ip = this.getClientIp(request);

    // Récupérer les options personnalisées ou utiliser les valeurs par défaut
    const options = this.reflector.get<RateLimitOptions>(
      RATE_LIMIT_KEY,
      context.getHandler(),
    );

    const limit = options?.limit || this.defaultLimit;
    const windowSec = options?.windowSec || this.defaultWindow;
    const prefix = options?.prefix || 'default';

    // Clé unique: prefix:ip
    const key = `${prefix}:${ip}`;
    const now = Date.now();

    // Récupérer ou créer l'entrée
    let entry = rateLimitStore.get(key);

    if (!entry || entry.resetAt < now) {
      entry = {
        count: 0,
        resetAt: now + windowSec * 1000,
      };
    }

    entry.count++;
    rateLimitStore.set(key, entry);

    // Ajouter les headers de rate limit à la réponse (RFC 6585 + draft-ietf-httpapi-ratelimit-headers)
    const response = context.switchToHttp().getResponse();
    const remaining = Math.max(0, limit - entry.count);
    const resetSeconds = Math.ceil((entry.resetAt - now) / 1000);
    
    // Standard headers
    response.setHeader('X-RateLimit-Limit', limit.toString());
    response.setHeader('X-RateLimit-Remaining', remaining.toString());
    response.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetAt / 1000).toString());
    
    // RFC draft headers (newer standard)
    response.setHeader('RateLimit-Limit', limit.toString());
    response.setHeader('RateLimit-Remaining', remaining.toString());
    response.setHeader('RateLimit-Reset', resetSeconds.toString());
    
    // Policy header for documentation
    response.setHeader('RateLimit-Policy', `${limit};w=${windowSec}`);

    // Vérifier si limite dépassée
    if (entry.count > limit) {
      this.logger.warn(
        `Rate limit exceeded: ${key} (${entry.count}/${limit} in ${windowSec}s)`,
      );

      // Retry-After header (RFC 6585)
      response.setHeader('Retry-After', resetSeconds.toString());

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many requests. Please try again later.',
          retryAfter: resetSeconds,
          limit,
          windowSeconds: windowSec,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  /**
   * Récupère l'IP client (gère les proxies)
   */
  private getClientIp(request: Request): string {
    const forwarded = request.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return request.ip || request.socket.remoteAddress || 'unknown';
  }
}

/**
 * Decorator factory pour appliquer une limite de rate personnalisée
 */
import { SetMetadata } from '@nestjs/common';

export const RateLimit = (options: RateLimitOptions) =>
  SetMetadata(RATE_LIMIT_KEY, options);

/**
 * Présets de rate limiting pour différents types d'endpoints
 */
export const RateLimitPresets = {
  /** Auth endpoints: 10 req/min */
  AUTH: { limit: 10, windowSec: 60, prefix: 'auth' },
  /** Payments: 20 req/min */
  PAYMENTS: { limit: 20, windowSec: 60, prefix: 'payments' },
  /** Media streaming: 100 req/min */
  MEDIA: { limit: 100, windowSec: 60, prefix: 'media' },
  /** API standard: 60 req/min */
  STANDARD: { limit: 60, windowSec: 60, prefix: 'api' },
};

