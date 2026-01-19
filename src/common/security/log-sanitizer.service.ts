import { Injectable } from '@nestjs/common';

/**
 * Log Sanitizer Service
 * PR-09: Final Guard Rails
 *
 * Sanitizes sensitive data before logging to prevent
 * accidental exposure of PII, credentials, or tokens.
 *
 * SECURITY: Must be used in all logging statements that
 * might contain user-provided data.
 */
@Injectable()
export class LogSanitizerService {
  /**
   * Sensitive field patterns to redact
   */
  private readonly SENSITIVE_PATTERNS: { pattern: RegExp; replacement: string }[] = [
    // Passwords
    { pattern: /"password"\s*:\s*"[^"]*"/gi, replacement: '"password":"[REDACTED]"' },
    { pattern: /"hashedPassword"\s*:\s*"[^"]*"/gi, replacement: '"hashedPassword":"[REDACTED]"' },
    { pattern: /password=\S+/gi, replacement: 'password=[REDACTED]' },

    // Tokens & Secrets
    { pattern: /"token"\s*:\s*"[^"]*"/gi, replacement: '"token":"[REDACTED]"' },
    { pattern: /"accessToken"\s*:\s*"[^"]*"/gi, replacement: '"accessToken":"[REDACTED]"' },
    { pattern: /"refreshToken"\s*:\s*"[^"]*"/gi, replacement: '"refreshToken":"[REDACTED]"' },
    { pattern: /"secret"\s*:\s*"[^"]*"/gi, replacement: '"secret":"[REDACTED]"' },
    { pattern: /"apiKey"\s*:\s*"[^"]*"/gi, replacement: '"apiKey":"[REDACTED]"' },
    { pattern: /Bearer\s+[A-Za-z0-9\-_\.]+/gi, replacement: 'Bearer [REDACTED]' },
    { pattern: /sk_live_[A-Za-z0-9]+/gi, replacement: 'sk_live_[REDACTED]' },
    { pattern: /sk_test_[A-Za-z0-9]+/gi, replacement: 'sk_test_[REDACTED]' },

    // Credit Cards (basic patterns)
    { pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, replacement: '[CARD_REDACTED]' },
    { pattern: /"cardNumber"\s*:\s*"[^"]*"/gi, replacement: '"cardNumber":"[REDACTED]"' },
    { pattern: /"cvv"\s*:\s*"[^"]*"/gi, replacement: '"cvv":"[REDACTED]"' },
    { pattern: /"cvc"\s*:\s*"[^"]*"/gi, replacement: '"cvc":"[REDACTED]"' },

    // PII
    { pattern: /"email"\s*:\s*"([^"@]+)@([^"]+)"/gi, replacement: '"email":"[EMAIL_REDACTED]"' },
    { pattern: /"phone"\s*:\s*"[^"]*"/gi, replacement: '"phone":"[REDACTED]"' },
    { pattern: /"ssn"\s*:\s*"[^"]*"/gi, replacement: '"ssn":"[REDACTED]"' },
    { pattern: /"sin"\s*:\s*"[^"]*"/gi, replacement: '"sin":"[REDACTED]"' }, // Canadian SIN
    { pattern: /"dob"\s*:\s*"[^"]*"/gi, replacement: '"dob":"[REDACTED]"' },
    { pattern: /"dateOfBirth"\s*:\s*"[^"]*"/gi, replacement: '"dateOfBirth":"[REDACTED]"' },

    // Banking
    { pattern: /"accountNumber"\s*:\s*"[^"]*"/gi, replacement: '"accountNumber":"[REDACTED]"' },
    { pattern: /"routingNumber"\s*:\s*"[^"]*"/gi, replacement: '"routingNumber":"[REDACTED]"' },
    { pattern: /"iban"\s*:\s*"[^"]*"/gi, replacement: '"iban":"[REDACTED]"' },
  ];

  /**
   * Fields to completely remove from objects
   */
  private readonly FIELDS_TO_REMOVE = new Set([
    'password',
    'hashedPassword',
    'token',
    'accessToken',
    'refreshToken',
    'secret',
    'apiKey',
    'cardNumber',
    'cvv',
    'cvc',
    'ssn',
    'sin',
  ]);

  /**
   * Sanitize a string by redacting sensitive patterns
   */
  sanitizeString(input: string): string {
    if (!input || typeof input !== 'string') {
      return input;
    }

    let sanitized = input;
    for (const { pattern, replacement } of this.SENSITIVE_PATTERNS) {
      sanitized = sanitized.replace(pattern, replacement);
    }

    return sanitized;
  }

  /**
   * Sanitize an object by removing/redacting sensitive fields
   */
  sanitizeObject<T extends Record<string, unknown>>(obj: T, depth = 0): T {
    if (!obj || typeof obj !== 'object' || depth > 10) {
      return obj;
    }

    // Handle arrays
    if (Array.isArray(obj)) {
      return obj.map((item) =>
        typeof item === 'object' ? this.sanitizeObject(item as T, depth + 1) : item,
      ) as unknown as T;
    }

    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      // Skip sensitive fields
      if (this.FIELDS_TO_REMOVE.has(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
        continue;
      }

      // Recursively sanitize nested objects
      if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeObject(value as Record<string, unknown>, depth + 1);
      } else if (typeof value === 'string') {
        sanitized[key] = this.sanitizeString(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized as T;
  }

  /**
   * Sanitize request body for logging
   */
  sanitizeRequestBody(body: unknown): unknown {
    if (!body) return body;

    if (typeof body === 'string') {
      return this.sanitizeString(body);
    }

    if (typeof body === 'object') {
      return this.sanitizeObject(body as Record<string, unknown>);
    }

    return body;
  }

  /**
   * Mask an ID for partial visibility in logs
   * Shows first 8 characters + "..."
   */
  maskId(id: string | undefined | null): string {
    if (!id) return 'unknown';
    if (id.length <= 8) return id;
    return `${id.substring(0, 8)}...`;
  }

  /**
   * Mask an email for partial visibility
   * Shows first 2 chars + "***" + domain
   */
  maskEmail(email: string | undefined | null): string {
    if (!email) return 'unknown';
    const [local, domain] = email.split('@');
    if (!domain) return '[INVALID_EMAIL]';
    const maskedLocal = local.length > 2 ? `${local.substring(0, 2)}***` : '***';
    return `${maskedLocal}@${domain}`;
  }

  /**
   * Mask a phone number
   * Shows last 4 digits only
   */
  maskPhone(phone: string | undefined | null): string {
    if (!phone) return 'unknown';
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 4) return '[REDACTED]';
    return `***-***-${digits.slice(-4)}`;
  }

  /**
   * Create a safe log context from request data
   */
  createSafeLogContext(request: {
    method?: string;
    url?: string;
    ip?: string;
    headers?: Record<string, unknown>;
    body?: unknown;
    user?: { id?: string; email?: string };
  }): Record<string, unknown> {
    return {
      method: request.method,
      url: request.url,
      ip: request.ip,
      userAgent: request.headers?.['user-agent'],
      userId: this.maskId(request.user?.id),
      body: this.sanitizeRequestBody(request.body),
    };
  }
}

