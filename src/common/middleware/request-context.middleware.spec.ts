import { RequestContextMiddleware, getRequestContext, RequestContext } from './request-context.middleware';
import { Request, Response } from 'express';

describe('RequestContextMiddleware', () => {
  let middleware: RequestContextMiddleware;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    middleware = new RequestContextMiddleware();
    mockNext = jest.fn();

    mockRequest = {
      headers: {},
      ip: '192.168.1.100',
      socket: { remoteAddress: '192.168.1.100' } as any,
    };

    mockResponse = {
      setHeader: jest.fn(),
    };
  });

  describe('use', () => {
    it('should attach context to request', () => {
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.context).toBeDefined();
      expect(mockRequest.context?.correlationId).toBeDefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should set response headers', () => {
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-Correlation-Id',
        expect.any(String),
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-Request-Time',
        expect.any(String),
      );
    });
  });

  describe('language extraction', () => {
    it('should use default language when no Accept-Language header', () => {
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.context?.language).toBe('fr');
    });

    it('should parse Accept-Language header', () => {
      mockRequest.headers = { 'accept-language': 'en-US,en;q=0.9,fr;q=0.8' };

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.context?.language).toBe('en');
    });

    it('should return first supported language', () => {
      mockRequest.headers = { 'accept-language': 'de-DE,de;q=0.9,fr;q=0.8' };

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.context?.language).toBe('fr');
    });

    it('should handle language codes with region', () => {
      mockRequest.headers = { 'accept-language': 'fr-CA,fr;q=0.9' };

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.context?.language).toBe('fr');
    });
  });

  describe('timezone extraction', () => {
    it('should use default timezone when no X-Timezone header', () => {
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.context?.timezone).toBe('America/Montreal');
    });

    it('should use valid timezone from header', () => {
      mockRequest.headers = { 'x-timezone': 'America/New_York' };

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.context?.timezone).toBe('America/New_York');
    });

    it('should reject invalid timezone format', () => {
      mockRequest.headers = { 'x-timezone': 'invalid-timezone' };

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.context?.timezone).toBe('America/Montreal');
    });

    it('should accept Etc/GMT format', () => {
      mockRequest.headers = { 'x-timezone': 'Etc/GMT-5' };

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.context?.timezone).toBe('Etc/GMT-5');
    });
  });

  describe('currency extraction', () => {
    it('should use default currency when no X-Currency header', () => {
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.context?.currency).toBe('CAD');
    });

    it('should use valid currency from header', () => {
      mockRequest.headers = { 'x-currency': 'USD' };

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.context?.currency).toBe('USD');
    });

    it('should handle lowercase currency', () => {
      mockRequest.headers = { 'x-currency': 'eur' };

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.context?.currency).toBe('EUR');
    });

    it('should reject unsupported currency', () => {
      mockRequest.headers = { 'x-currency': 'GBP' };

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.context?.currency).toBe('CAD');
    });
  });

  describe('device ID hashing', () => {
    it('should return null when no device ID', () => {
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.context?.deviceIdHash).toBeNull();
    });

    it('should return null for short device ID', () => {
      mockRequest.headers = { 'x-device-id': 'short' };

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.context?.deviceIdHash).toBeNull();
    });

    it('should hash valid device ID', () => {
      mockRequest.headers = { 'x-device-id': 'a-valid-device-id-with-minimum-length' };

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.context?.deviceIdHash).toBeDefined();
      expect(mockRequest.context?.deviceIdHash?.length).toBe(32);
    });

    it('should produce consistent hash for same device ID', () => {
      mockRequest.headers = { 'x-device-id': 'consistent-device-id-123' };

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);
      const hash1 = mockRequest.context?.deviceIdHash;

      const mockRequest2 = { ...mockRequest, context: undefined } as Partial<Request>;
      middleware.use(mockRequest2 as Request, mockResponse as Response, mockNext);
      const hash2 = mockRequest2.context?.deviceIdHash;

      expect(hash1).toBe(hash2);
    });
  });

  describe('correlation ID', () => {
    it('should generate correlation ID when not provided', () => {
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.context?.correlationId).toMatch(/^req_\d+_[a-f0-9]+$/);
    });

    it('should use X-Correlation-Id from header', () => {
      mockRequest.headers = { 'x-correlation-id': 'existing-corr-id' };

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.context?.correlationId).toBe('existing-corr-id');
    });

    it('should use X-Request-Id as fallback', () => {
      mockRequest.headers = { 'x-request-id': 'existing-req-id' };

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.context?.correlationId).toBe('existing-req-id');
    });

    it('should truncate long correlation IDs', () => {
      mockRequest.headers = { 'x-correlation-id': 'a'.repeat(100) };

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.context?.correlationId?.length).toBe(64);
    });
  });

  describe('IP address extraction', () => {
    it('should use X-Forwarded-For if present', () => {
      mockRequest.headers = { 'x-forwarded-for': '203.0.113.195, 70.41.3.18' };

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.context?.ipAddress).toBe('203.0.113.195');
    });

    it('should use request IP as fallback', () => {
      const reqWithIp = {
        ...mockRequest,
        ip: '10.0.0.1',
      } as unknown as Request;

      middleware.use(reqWithIp, mockResponse as Response, mockNext);

      expect(reqWithIp.context?.ipAddress).toBe('10.0.0.1');
    });
  });

  describe('user agent', () => {
    it('should return unknown when no user agent', () => {
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.context?.userAgent).toBe('unknown');
    });

    it('should truncate long user agent', () => {
      mockRequest.headers = { 'user-agent': 'a'.repeat(300) };

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.context?.userAgent?.length).toBe(256);
    });
  });
});

describe('getRequestContext', () => {
  it('should return context from request', () => {
    const mockContext: RequestContext = {
      language: 'fr',
      timezone: 'America/Montreal',
      currency: 'CAD',
      deviceIdHash: null,
      correlationId: 'test-123',
      ipAddress: '127.0.0.1',
      userAgent: 'test',
      requestTime: new Date(),
    };

    const mockRequest = { context: mockContext } as Request;

    expect(getRequestContext(mockRequest)).toBe(mockContext);
  });
});
