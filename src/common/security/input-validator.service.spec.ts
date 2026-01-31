import { Test, TestingModule } from '@nestjs/testing';
import { InputValidatorService } from './input-validator.service';
import { BadRequestException } from '@nestjs/common';

describe('InputValidatorService', () => {
  let service: InputValidatorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [InputValidatorService],
    }).compile();

    service = module.get<InputValidatorService>(InputValidatorService);
  });

  describe('validateString', () => {
    it('should pass for valid string', () => {
      expect(() => service.validateString('Hello World', 'name')).not.toThrow();
    });

    it('should skip validation for empty string', () => {
      expect(() => service.validateString('', 'name')).not.toThrow();
    });

    it('should skip validation for null/undefined', () => {
      expect(() => service.validateString(null as any, 'name')).not.toThrow();
      expect(() => service.validateString(undefined as any, 'name')).not.toThrow();
    });

    it('should throw for string exceeding max length', () => {
      const longString = 'a'.repeat(11000);
      expect(() => service.validateString(longString, 'name')).toThrow(BadRequestException);
    });

    it('should use custom max length', () => {
      const value = 'a'.repeat(50);
      expect(() =>
        service.validateString(value, 'name', { maxLength: 100 }),
      ).not.toThrow();
      expect(() =>
        service.validateString(value, 'name', { maxLength: 10 }),
      ).toThrow(BadRequestException);
    });

    it('should detect SQL injection', () => {
      const sqlPayloads = [
        "SELECT * FROM users", // Matches SQL pattern
        "'; DROP TABLE users", // Contains ; (shell meta)
      ];
      sqlPayloads.forEach((payload) => {
        expect(() => service.validateString(payload, 'input')).toThrow(BadRequestException);
      });
    });

    it('should detect SQL OR injection pattern', () => {
      // Pattern: /' OR '=' pattern
      expect(() => service.validateString("' OR '='", 'input')).toThrow(BadRequestException);
    });

    it('should detect XSS attempts', () => {
      const xssPayloads = [
        '<script>alert("xss")</script>',
        'javascript:alert(1)',
        '<img onerror=alert(1)>',
        '<iframe src="evil.com"></iframe>',
      ];
      xssPayloads.forEach((payload) => {
        expect(() => service.validateString(payload, 'input')).toThrow(BadRequestException);
      });
    });

    it('should detect path traversal', () => {
      expect(() => service.validateString('../etc/passwd', 'path')).toThrow(BadRequestException);
      expect(() => service.validateString('..\\windows\\system32', 'path')).toThrow(BadRequestException);
    });

    it('should allow HTML when enabled', () => {
      expect(() =>
        service.validateString('<b>Bold</b>', 'content', { allowHtml: true }),
      ).not.toThrow();
    });

    it('should allow special chars when enabled', () => {
      expect(() =>
        service.validateString('test; cmd', 'command', { allowSpecialChars: true }),
      ).not.toThrow();
    });
  });

  describe('validateEmail', () => {
    it('should pass for valid email', () => {
      expect(() => service.validateEmail('test@example.com')).not.toThrow();
    });

    it('should skip validation for empty email', () => {
      expect(() => service.validateEmail('')).not.toThrow();
    });

    it('should throw for email exceeding max length', () => {
      const longEmail = 'a'.repeat(250) + '@example.com';
      expect(() => service.validateEmail(longEmail)).toThrow(BadRequestException);
    });

    it('should throw for invalid email format', () => {
      expect(() => service.validateEmail('not-an-email')).toThrow(BadRequestException);
      expect(() => service.validateEmail('@example.com')).toThrow(BadRequestException);
    });

    it('should throw for suspicious email patterns', () => {
      expect(() => service.validateEmail('test..@example.com')).toThrow(BadRequestException);
      expect(() => service.validateEmail('.test@example.com')).toThrow(BadRequestException);
    });
  });

  describe('validateUrl', () => {
    it('should pass for valid HTTPS URL', () => {
      expect(() => service.validateUrl('https://example.com', 'website')).not.toThrow();
    });

    it('should pass for valid HTTP URL', () => {
      expect(() => service.validateUrl('http://example.com', 'website')).not.toThrow();
    });

    it('should skip validation for empty URL', () => {
      expect(() => service.validateUrl('', 'website')).not.toThrow();
    });

    it('should throw for invalid URL', () => {
      expect(() => service.validateUrl('not-a-url', 'website')).toThrow(BadRequestException);
    });

    it('should respect allowed protocols', () => {
      expect(() =>
        service.validateUrl('ftp://example.com', 'website', { allowedProtocols: ['https:'] }),
      ).toThrow(BadRequestException);
    });
  });

  describe('validatePhone', () => {
    it('should pass for valid phone numbers', () => {
      expect(() => service.validatePhone('+1-514-123-4567')).not.toThrow();
      expect(() => service.validatePhone('(514) 123-4567')).not.toThrow();
      expect(() => service.validatePhone('5141234567')).not.toThrow();
    });

    it('should skip validation for empty phone', () => {
      expect(() => service.validatePhone('')).not.toThrow();
    });

    it('should throw for invalid phone', () => {
      expect(() => service.validatePhone('123')).toThrow(BadRequestException);
      expect(() => service.validatePhone('abc123')).toThrow(BadRequestException);
    });
  });

  describe('validateNumericRange', () => {
    it('should pass for valid number in range', () => {
      expect(() =>
        service.validateNumericRange(50, 'age', { min: 0, max: 100 }),
      ).not.toThrow();
    });

    it('should throw for NaN', () => {
      expect(() => service.validateNumericRange(NaN, 'value', {})).toThrow(BadRequestException);
    });

    it('should throw for value below min', () => {
      expect(() =>
        service.validateNumericRange(-1, 'age', { min: 0 }),
      ).toThrow(BadRequestException);
    });

    it('should throw for value above max', () => {
      expect(() =>
        service.validateNumericRange(150, 'age', { max: 100 }),
      ).toThrow(BadRequestException);
    });
  });

  describe('validateUuid', () => {
    it('should pass for valid UUID', () => {
      expect(() =>
        service.validateUuid('550e8400-e29b-41d4-a716-446655440000', 'id'),
      ).not.toThrow();
    });

    it('should pass for prefixed ID', () => {
      expect(() => service.validateUuid('user_abc123', 'id')).not.toThrow();
      expect(() => service.validateUuid('mission_xyz-789', 'id')).not.toThrow();
    });

    it('should skip validation for empty value', () => {
      expect(() => service.validateUuid('', 'id')).not.toThrow();
    });

    it('should throw for invalid format', () => {
      expect(() => service.validateUuid('invalid', 'id')).toThrow(BadRequestException);
    });
  });

  describe('validateArray', () => {
    it('should pass for valid array', () => {
      expect(() => service.validateArray([1, 2, 3], 'items', {})).not.toThrow();
    });

    it('should throw for non-array', () => {
      expect(() => service.validateArray('not-array' as any, 'items', {})).toThrow(
        BadRequestException,
      );
    });

    it('should throw for array exceeding max length', () => {
      const longArray = Array(150).fill(1);
      expect(() =>
        service.validateArray(longArray, 'items', { maxLength: 100 }),
      ).toThrow(BadRequestException);
    });

    it('should call item validator', () => {
      const validator = jest.fn();
      service.validateArray([1, 2, 3], 'items', { itemValidator: validator });
      expect(validator).toHaveBeenCalledTimes(3);
    });
  });

  describe('sanitizeHtml', () => {
    it('should return empty for falsy input', () => {
      expect(service.sanitizeHtml('')).toBe('');
      expect(service.sanitizeHtml(null as any)).toBe(null);
    });

    it('should remove script tags', () => {
      const html = '<p>Safe</p><script>alert("xss")</script>';
      expect(service.sanitizeHtml(html)).toBe('<p>Safe</p>');
    });

    it('should remove event handlers', () => {
      const html = '<img src="test.jpg" onerror="alert(1)">';
      const sanitized = service.sanitizeHtml(html);
      expect(sanitized).not.toContain('onerror');
    });

    it('should remove javascript: URLs', () => {
      const html = '<a href="javascript:alert(1)">Click</a>';
      const sanitized = service.sanitizeHtml(html);
      expect(sanitized).not.toContain('javascript:');
    });

    it('should remove iframes', () => {
      const html = '<p>Text</p><iframe src="evil.com"></iframe>';
      const sanitized = service.sanitizeHtml(html);
      expect(sanitized).not.toContain('iframe');
    });
  });
});
