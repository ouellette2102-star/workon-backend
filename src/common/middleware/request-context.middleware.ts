import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';

/**
 * PR-00: Request Context Middleware
 * 
 * Extracts and normalizes standard API headers for:
 * - Internationalization (Accept-Language)
 * - Timezone handling (X-Timezone)
 * - Currency preferences (X-Currency)
 * - Device tracking (X-Device-Id - hashed)
 * - Request correlation
 * 
 * These values are attached to request for use throughout the request lifecycle.
 */

export interface RequestContext {
  // Internationalization
  language: string;
  timezone: string;
  currency: string;
  
  // Device tracking (hashed for privacy)
  deviceIdHash: string | null;
  
  // Request metadata
  correlationId: string;
  ipAddress: string;
  userAgent: string;
  
  // Timestamps
  requestTime: Date;
}

// Type augmentation for Express Request is done in a separate .d.ts file
// See: src/types/express.d.ts

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RequestContextMiddleware.name);

  // Supported languages (ISO 639-1)
  private readonly supportedLanguages = ['fr', 'en'];
  private readonly defaultLanguage = 'fr';

  // Supported currencies (ISO 4217)
  private readonly supportedCurrencies = ['CAD', 'USD', 'EUR'];
  private readonly defaultCurrency = 'CAD';

  // Default timezone
  private readonly defaultTimezone = 'America/Montreal';

  use(req: Request, res: Response, next: NextFunction) {
    const context = this.buildContext(req);
    
    // Attach context to request
    req.context = context;

    // Set response headers for client awareness
    res.setHeader('X-Correlation-Id', context.correlationId);
    res.setHeader('X-Request-Time', context.requestTime.toISOString());

    next();
  }

  private buildContext(req: Request): RequestContext {
    const correlationId = this.extractCorrelationId(req);
    
    return {
      // Internationalization
      language: this.extractLanguage(req),
      timezone: this.extractTimezone(req),
      currency: this.extractCurrency(req),
      
      // Device tracking (hashed)
      deviceIdHash: this.hashDeviceId(req),
      
      // Request metadata
      correlationId,
      ipAddress: this.extractIpAddress(req),
      userAgent: this.truncateUserAgent(req.headers['user-agent']),
      
      // Timestamps
      requestTime: new Date(),
    };
  }

  /**
   * Extract language from Accept-Language header
   * Format: "fr-CA,fr;q=0.9,en;q=0.8"
   */
  private extractLanguage(req: Request): string {
    const acceptLanguage = req.headers['accept-language'];
    
    if (!acceptLanguage) {
      return this.defaultLanguage;
    }

    // Parse Accept-Language and find first supported language
    const languages = acceptLanguage
      .split(',')
      .map(lang => {
        const [code, qValue] = lang.trim().split(';q=');
        return {
          code: code.split('-')[0].toLowerCase(), // Get primary language tag
          q: qValue ? parseFloat(qValue) : 1.0,
        };
      })
      .sort((a, b) => b.q - a.q);

    for (const lang of languages) {
      if (this.supportedLanguages.includes(lang.code)) {
        return lang.code;
      }
    }

    return this.defaultLanguage;
  }

  /**
   * Extract timezone from X-Timezone header
   * Expected format: IANA timezone (e.g., "America/Montreal")
   */
  private extractTimezone(req: Request): string {
    const timezone = req.headers['x-timezone'] as string;
    
    if (!timezone) {
      return this.defaultTimezone;
    }

    // Basic validation (IANA format: Continent/City or Etc/GMT+X)
    const timezoneRegex = /^[A-Za-z]+\/[A-Za-z_]+$|^Etc\/GMT[+-]\d{1,2}$/;
    if (timezoneRegex.test(timezone)) {
      return timezone;
    }

    this.logger.debug(`Invalid timezone format: ${timezone}, using default`);
    return this.defaultTimezone;
  }

  /**
   * Extract currency from X-Currency header
   * Expected format: ISO 4217 (e.g., "CAD")
   */
  private extractCurrency(req: Request): string {
    const currency = (req.headers['x-currency'] as string)?.toUpperCase();
    
    if (!currency) {
      return this.defaultCurrency;
    }

    if (this.supportedCurrencies.includes(currency)) {
      return currency;
    }

    this.logger.debug(`Unsupported currency: ${currency}, using default`);
    return this.defaultCurrency;
  }

  /**
   * Hash device ID for privacy-preserving tracking
   * Device ID is never stored in plain text
   */
  private hashDeviceId(req: Request): string | null {
    const deviceId = req.headers['x-device-id'] as string;
    
    if (!deviceId || deviceId.length < 10) {
      return null;
    }

    // Use SHA-256 with a salt for privacy
    const salt = process.env.DEVICE_ID_SALT || 'workon-device-salt';
    const hash = crypto
      .createHash('sha256')
      .update(`${salt}:${deviceId}`)
      .digest('hex')
      .substring(0, 32); // Truncate for storage efficiency

    return hash;
  }

  /**
   * Extract or generate correlation ID for request tracing
   */
  private extractCorrelationId(req: Request): string {
    const existing = req.headers['x-correlation-id'] || req.headers['x-request-id'];
    
    if (existing && typeof existing === 'string') {
      return existing.substring(0, 64); // Limit length
    }

    // Generate new correlation ID
    return `req_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  /**
   * Extract client IP address (handles proxies)
   */
  private extractIpAddress(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }

    return req.ip || req.socket?.remoteAddress || 'unknown';
  }

  /**
   * Truncate user agent for storage efficiency
   */
  private truncateUserAgent(userAgent: string | undefined): string {
    if (!userAgent) {
      return 'unknown';
    }
    return userAgent.substring(0, 256);
  }
}

/**
 * Helper function to get context from request (for use in services)
 */
export function getRequestContext(req: Request): RequestContext {
  return req.context;
}

