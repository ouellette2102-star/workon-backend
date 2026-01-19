import { Injectable, BadRequestException } from '@nestjs/common';

/**
 * Input Validator Service
 * PR-09: Final Guard Rails
 *
 * Additional security validation layer beyond class-validator DTOs.
 * Checks for malicious patterns, injection attempts, and suspicious input.
 *
 * SECURITY: Defense in depth - run alongside DTO validation
 */
@Injectable()
export class InputValidatorService {
  /**
   * Maximum string length for most text fields
   */
  private readonly MAX_STRING_LENGTH = 10000;

  /**
   * Maximum email length
   */
  private readonly MAX_EMAIL_LENGTH = 254;

  /**
   * Patterns that indicate potential injection attacks
   */
  private readonly INJECTION_PATTERNS: { pattern: RegExp; name: string }[] = [
    // SQL Injection
    { pattern: /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER)\b.*\b(FROM|INTO|TABLE|DATABASE)\b)/i, name: 'SQL' },
    { pattern: /('|")\s*(OR|AND)\s*('|")\s*=\s*('|")/i, name: 'SQL OR/AND' },
    { pattern: /;\s*--/i, name: 'SQL Comment' },

    // NoSQL Injection
    { pattern: /\$where|\$regex|\$gt|\$lt|\$ne|\$or|\$and/i, name: 'NoSQL' },
    { pattern: /\{\s*"\$[a-z]+"/i, name: 'MongoDB Operator' },

    // XSS
    { pattern: /<script[^>]*>/i, name: 'XSS Script' },
    { pattern: /javascript\s*:/i, name: 'XSS JavaScript' },
    { pattern: /on\w+\s*=/i, name: 'XSS Event Handler' },
    { pattern: /<iframe[^>]*>/i, name: 'XSS iFrame' },

    // Path Traversal
    { pattern: /\.\.\//g, name: 'Path Traversal' },
    { pattern: /\.\.\\/, name: 'Path Traversal Windows' },

    // Command Injection
    { pattern: /[;&|`$]/, name: 'Shell Meta' },
    { pattern: /\b(eval|exec|system|spawn)\s*\(/i, name: 'Command Exec' },

    // LDAP Injection
    { pattern: /[()\\*]/g, name: 'LDAP Special' },
  ];

  /**
   * Validate a string input for malicious patterns
   * @throws BadRequestException if suspicious pattern detected
   */
  validateString(
    value: string,
    fieldName: string,
    options?: {
      maxLength?: number;
      allowHtml?: boolean;
      allowSpecialChars?: boolean;
    },
  ): void {
    if (!value || typeof value !== 'string') {
      return;
    }

    const maxLength = options?.maxLength ?? this.MAX_STRING_LENGTH;

    // Length check
    if (value.length > maxLength) {
      throw new BadRequestException(
        `${fieldName} exceeds maximum length of ${maxLength} characters`,
      );
    }

    // Skip injection checks if explicitly allowed
    if (options?.allowSpecialChars) {
      return;
    }

    // Check for injection patterns (unless HTML is allowed)
    if (!options?.allowHtml) {
      for (const { pattern, name } of this.INJECTION_PATTERNS) {
        if (pattern.test(value)) {
          // Log the attempt but don't expose which pattern was matched
          console.warn(`[SECURITY] Potential ${name} injection attempt in field: ${fieldName}`);
          throw new BadRequestException(`Invalid characters in ${fieldName}`);
        }
      }
    }
  }

  /**
   * Validate an email address
   */
  validateEmail(email: string): void {
    if (!email) return;

    // Length check
    if (email.length > this.MAX_EMAIL_LENGTH) {
      throw new BadRequestException('Email address is too long');
    }

    // Basic format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new BadRequestException('Invalid email format');
    }

    // Check for suspicious patterns
    if (email.includes('..') || email.includes('--') || email.startsWith('.')) {
      throw new BadRequestException('Invalid email format');
    }
  }

  /**
   * Validate a URL
   */
  validateUrl(url: string, fieldName: string, options?: { allowedProtocols?: string[] }): void {
    if (!url) return;

    const allowedProtocols = options?.allowedProtocols ?? ['https:', 'http:'];

    try {
      const parsed = new URL(url);

      if (!allowedProtocols.includes(parsed.protocol)) {
        throw new BadRequestException(`${fieldName} must use ${allowedProtocols.join(' or ')}`);
      }

      // Check for javascript: URLs
      if (parsed.protocol === 'javascript:') {
        throw new BadRequestException(`Invalid URL protocol in ${fieldName}`);
      }
    } catch (e) {
      if (e instanceof BadRequestException) throw e;
      throw new BadRequestException(`Invalid URL format in ${fieldName}`);
    }
  }

  /**
   * Validate a phone number
   */
  validatePhone(phone: string): void {
    if (!phone) return;

    // Remove common formatting
    const digits = phone.replace(/[\s\-\(\)\.+]/g, '');

    // Check if it's mostly digits
    if (!/^\d{7,15}$/.test(digits)) {
      throw new BadRequestException('Invalid phone number format');
    }
  }

  /**
   * Validate numeric range
   */
  validateNumericRange(
    value: number,
    fieldName: string,
    options: { min?: number; max?: number },
  ): void {
    if (typeof value !== 'number' || isNaN(value)) {
      throw new BadRequestException(`${fieldName} must be a valid number`);
    }

    if (options.min !== undefined && value < options.min) {
      throw new BadRequestException(`${fieldName} must be at least ${options.min}`);
    }

    if (options.max !== undefined && value > options.max) {
      throw new BadRequestException(`${fieldName} must be at most ${options.max}`);
    }
  }

  /**
   * Validate UUID format
   */
  validateUuid(value: string, fieldName: string): void {
    if (!value) return;

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    // Also allow prefixed IDs (user_xxx, mission_xxx, etc.)
    const prefixedIdRegex = /^[a-z]+_[a-zA-Z0-9_-]+$/;

    if (!uuidRegex.test(value) && !prefixedIdRegex.test(value)) {
      throw new BadRequestException(`Invalid ID format for ${fieldName}`);
    }
  }

  /**
   * Validate array of values
   */
  validateArray<T>(
    arr: T[],
    fieldName: string,
    options: {
      maxLength?: number;
      itemValidator?: (item: T, index: number) => void;
    },
  ): void {
    if (!Array.isArray(arr)) {
      throw new BadRequestException(`${fieldName} must be an array`);
    }

    const maxLength = options.maxLength ?? 100;

    if (arr.length > maxLength) {
      throw new BadRequestException(`${fieldName} exceeds maximum of ${maxLength} items`);
    }

    if (options.itemValidator) {
      arr.forEach((item, index) => options.itemValidator!(item, index));
    }
  }

  /**
   * Sanitize HTML content (strip dangerous tags)
   */
  sanitizeHtml(html: string): string {
    if (!html) return html;

    // Remove script tags and their content
    let sanitized = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

    // Remove event handlers
    sanitized = sanitized.replace(/\s*on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]*)/gi, '');

    // Remove javascript: URLs
    sanitized = sanitized.replace(/javascript\s*:/gi, '');

    // Remove iframes
    sanitized = sanitized.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');

    return sanitized;
  }
}

