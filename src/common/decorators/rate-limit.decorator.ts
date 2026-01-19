import { applyDecorators, SetMetadata } from '@nestjs/common';
import { Throttle, SkipThrottle } from '@nestjs/throttler';

/**
 * Rate Limit Decorators
 * PR-09: Final Guard Rails
 *
 * Pre-configured rate limits for different endpoint categories.
 * Uses NestJS Throttler under the hood.
 *
 * Usage:
 *   @SensitiveEndpoint()  // Very strict: 5 req/min
 *   @AuthEndpoint()       // Strict: 10 req/min
 *   @StandardEndpoint()   // Normal: 60 req/min
 *   @HighVolumeEndpoint() // Relaxed: 200 req/min
 *   @NoRateLimit()        // Skip throttling (use sparingly)
 */

/**
 * Metadata key for rate limit category (for logging/monitoring)
 */
export const RATE_LIMIT_CATEGORY = 'rateLimitCategory';

/**
 * Very strict rate limit for sensitive operations
 * - Password reset
 * - Account deletion
 * - Payment webhooks
 *
 * 5 requests per minute per IP
 */
export function SensitiveEndpoint() {
  return applyDecorators(
    SetMetadata(RATE_LIMIT_CATEGORY, 'sensitive'),
    Throttle({ default: { ttl: 60000, limit: 5 } }),
  );
}

/**
 * Strict rate limit for auth-related endpoints
 * - Login
 * - Register
 * - Token refresh
 *
 * 10 requests per minute per IP
 */
export function AuthEndpoint() {
  return applyDecorators(
    SetMetadata(RATE_LIMIT_CATEGORY, 'auth'),
    Throttle({ default: { ttl: 60000, limit: 10 } }),
  );
}

/**
 * Standard rate limit for most API endpoints
 * - Profile updates
 * - Mission CRUD
 * - Offers
 *
 * 60 requests per minute per IP
 */
export function StandardEndpoint() {
  return applyDecorators(
    SetMetadata(RATE_LIMIT_CATEGORY, 'standard'),
    Throttle({ default: { ttl: 60000, limit: 60 } }),
  );
}

/**
 * Relaxed rate limit for high-volume endpoints
 * - List endpoints
 * - Search
 * - Map data
 *
 * 200 requests per minute per IP
 */
export function HighVolumeEndpoint() {
  return applyDecorators(
    SetMetadata(RATE_LIMIT_CATEGORY, 'high-volume'),
    Throttle({ default: { ttl: 60000, limit: 200 } }),
  );
}

/**
 * Skip rate limiting entirely
 * USE SPARINGLY - only for:
 * - Health checks
 * - Public static data
 *
 * ⚠️ SECURITY: Endpoints without rate limits can be abused
 */
export function NoRateLimit() {
  return applyDecorators(
    SetMetadata(RATE_LIMIT_CATEGORY, 'none'),
    SkipThrottle(),
  );
}

/**
 * Burst rate limit for operations that might have legitimate bursts
 * - File uploads
 * - Batch operations
 *
 * 30 requests per 10 seconds (allows bursts, but limited)
 */
export function BurstEndpoint() {
  return applyDecorators(
    SetMetadata(RATE_LIMIT_CATEGORY, 'burst'),
    Throttle({ default: { ttl: 10000, limit: 30 } }),
  );
}

