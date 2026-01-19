import { LogSanitizerService } from './log-sanitizer.service';

describe('LogSanitizerService', () => {
  let service: LogSanitizerService;

  beforeEach(() => {
    service = new LogSanitizerService();
  });

  describe('sanitizeString', () => {
    it('should redact passwords in JSON', () => {
      const input = '{"email":"test@example.com","password":"secret123"}';
      const result = service.sanitizeString(input);
      expect(result).toContain('[REDACTED]');
      expect(result).not.toContain('secret123');
    });

    it('should redact Bearer tokens', () => {
      const input = 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ';
      const result = service.sanitizeString(input);
      expect(result).toContain('Bearer [REDACTED]');
      expect(result).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
    });

    it('should redact Stripe live keys', () => {
      const input = 'Using key: sk_live_abc123xyz456';
      const result = service.sanitizeString(input);
      expect(result).toContain('sk_live_[REDACTED]');
      expect(result).not.toContain('abc123xyz456');
    });

    it('should redact Stripe test keys', () => {
      const input = 'Test key: sk_test_abc123xyz456';
      const result = service.sanitizeString(input);
      expect(result).toContain('sk_test_[REDACTED]');
    });

    it('should redact credit card numbers', () => {
      const input = 'Card: 4111-1111-1111-1111';
      const result = service.sanitizeString(input);
      expect(result).toContain('[CARD_REDACTED]');
      expect(result).not.toContain('4111');
    });

    it('should redact emails', () => {
      const input = '{"email":"john.doe@example.com"}';
      const result = service.sanitizeString(input);
      expect(result).toContain('[EMAIL_REDACTED]');
      expect(result).not.toContain('john.doe');
    });

    it('should handle null/undefined', () => {
      expect(service.sanitizeString(null as any)).toBeNull();
      expect(service.sanitizeString(undefined as any)).toBeUndefined();
    });

    it('should handle non-string input', () => {
      expect(service.sanitizeString(123 as any)).toBe(123);
    });
  });

  describe('sanitizeObject', () => {
    it('should redact sensitive fields', () => {
      const input = {
        email: 'test@example.com',
        password: 'secret123',
        name: 'John Doe',
      };
      const result = service.sanitizeObject(input);
      expect(result.password).toBe('[REDACTED]');
      expect(result.name).toBe('John Doe');
    });

    it('should handle nested objects', () => {
      const input = {
        user: {
          email: 'test@example.com',
          token: 'abc123',
        },
        data: 'safe data',
      };
      const result = service.sanitizeObject(input);
      expect(result.user.token).toBe('[REDACTED]');
      expect(result.data).toBe('safe data');
    });

    it('should handle arrays', () => {
      const input = {
        users: [
          { name: 'John', password: 'pass1' },
          { name: 'Jane', password: 'pass2' },
        ],
      };
      const result = service.sanitizeObject(input);
      expect(result.users[0].password).toBe('[REDACTED]');
      expect(result.users[1].password).toBe('[REDACTED]');
      expect(result.users[0].name).toBe('John');
    });

    it('should handle deeply nested objects', () => {
      const input = {
        level1: {
          level2: {
            level3: {
              secret: 'top-secret',
            },
          },
        },
      };
      const result = service.sanitizeObject(input);
      expect(result.level1.level2.level3.secret).toBe('[REDACTED]');
    });

    it('should prevent infinite recursion', () => {
      const input: any = { name: 'test' };
      // Create circular reference
      input.self = input;
      
      // Should not throw
      expect(() => service.sanitizeObject(input)).not.toThrow();
    });
  });

  describe('maskId', () => {
    it('should mask long IDs', () => {
      const result = service.maskId('user_abc123def456ghi789');
      expect(result).toBe('user_abc...');
    });

    it('should not mask short IDs', () => {
      const result = service.maskId('short');
      expect(result).toBe('short');
    });

    it('should handle null/undefined', () => {
      expect(service.maskId(null)).toBe('unknown');
      expect(service.maskId(undefined)).toBe('unknown');
    });
  });

  describe('maskEmail', () => {
    it('should mask email local part', () => {
      const result = service.maskEmail('john.doe@example.com');
      expect(result).toBe('jo***@example.com');
    });

    it('should handle short local parts', () => {
      const result = service.maskEmail('ab@example.com');
      // Short local parts (<=2 chars) are masked entirely
      expect(result).toBe('***@example.com');
    });

    it('should handle null/undefined', () => {
      expect(service.maskEmail(null)).toBe('unknown');
      expect(service.maskEmail(undefined)).toBe('unknown');
    });

    it('should handle invalid emails', () => {
      expect(service.maskEmail('invalid')).toBe('[INVALID_EMAIL]');
    });
  });

  describe('maskPhone', () => {
    it('should mask phone numbers', () => {
      const result = service.maskPhone('+1-555-123-4567');
      expect(result).toBe('***-***-4567');
    });

    it('should handle various formats', () => {
      expect(service.maskPhone('5551234567')).toBe('***-***-4567');
      expect(service.maskPhone('(555) 123-4567')).toBe('***-***-4567');
    });

    it('should handle null/undefined', () => {
      expect(service.maskPhone(null)).toBe('unknown');
    });

    it('should redact short numbers', () => {
      expect(service.maskPhone('123')).toBe('[REDACTED]');
    });
  });

  describe('createSafeLogContext', () => {
    it('should create sanitized log context', () => {
      const request = {
        method: 'POST',
        url: '/api/v1/auth/login',
        ip: '127.0.0.1',
        headers: { 'user-agent': 'Mozilla/5.0' },
        body: { email: 'test@example.com', password: 'secret' },
        user: { id: 'user_abc123def456', email: 'test@example.com' },
      };

      const result = service.createSafeLogContext(request);

      expect(result.method).toBe('POST');
      expect(result.url).toBe('/api/v1/auth/login');
      expect(result.userId).toBe('user_abc...');
      expect((result.body as any).password).toBe('[REDACTED]');
    });
  });
});

