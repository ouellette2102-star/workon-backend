import { CorrelationIdMiddleware, createStructuredLog } from './correlation-id.middleware';
import { Request, Response } from 'express';

// Mock uuid
jest.mock('uuid', () => ({
  v4: () => 'test-uuid-1234-5678-9abc-defghijklmn',
}));

describe('CorrelationIdMiddleware', () => {
  let middleware: CorrelationIdMiddleware;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    middleware = new CorrelationIdMiddleware();
    mockNext = jest.fn();
    
    mockRequest = {
      headers: {},
      originalUrl: '/api/v1/test',
      method: 'GET',
      ip: '192.168.1.100',
    } as Partial<Request>;

    const responseListeners: Record<string, Function> = {};
    mockResponse = {
      setHeader: jest.fn(),
      statusCode: 200,
      on: jest.fn((event, callback) => {
        responseListeners[event] = callback;
        return mockResponse as Response;
      }),
      emit: (event: string) => {
        if (responseListeners[event]) {
          responseListeners[event]();
        }
        return true;
      },
    } as unknown as Partial<Response>;
  });

  describe('use', () => {
    it('should generate a correlation ID when none provided', () => {
      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockRequest.correlationId).toBeDefined();
      expect(mockRequest.correlationId).toBe('test-uuid-1234-5678-9abc-defghijklmn');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should use X-Correlation-ID from header if provided', () => {
      mockRequest.headers = { 'x-correlation-id': 'existing-corr-id' };

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockRequest.correlationId).toBe('existing-corr-id');
    });

    it('should use X-Request-ID from header if X-Correlation-ID not provided', () => {
      mockRequest.headers = { 'x-request-id': 'existing-req-id' };

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockRequest.correlationId).toBe('existing-req-id');
    });

    it('should prefer X-Correlation-ID over X-Request-ID', () => {
      mockRequest.headers = {
        'x-correlation-id': 'corr-id',
        'x-request-id': 'req-id',
      };

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockRequest.correlationId).toBe('corr-id');
    });

    it('should set response headers', () => {
      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-Correlation-ID',
        expect.any(String),
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-Request-ID',
        expect.any(String),
      );
    });

    it('should call next function', () => {
      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalled();
    });
  });
});

describe('createStructuredLog', () => {
  it('should create a structured log object', () => {
    const result = createStructuredLog('log', 'Test message', 'TestContext', 'corr-123');

    expect(result).toEqual({
      level: 'log',
      message: 'Test message',
      context: 'TestContext',
      correlationId: 'corr-123',
      timestamp: expect.any(String),
    });
  });

  it('should use "system" as default correlation ID', () => {
    const result = createStructuredLog('warn', 'Warning', 'TestContext');

    expect(result.correlationId).toBe('system');
  });

  it('should include extra fields', () => {
    const result = createStructuredLog('error', 'Error', 'TestContext', 'corr-123', {
      userId: 'user_1',
      action: 'login',
    });

    expect(result.userId).toBe('user_1');
    expect(result.action).toBe('login');
  });

  it('should redact sensitive fields in extra', () => {
    const result = createStructuredLog('log', 'Test', 'TestContext', 'corr-123', {
      password: 'secret123',
      token: 'abc123',
      apiKey: 'key123',
      normalField: 'visible',
    });

    expect(result.password).toBe('[REDACTED]');
    expect(result.token).toBe('[REDACTED]');
    expect(result.apiKey).toBe('[REDACTED]');
    expect(result.normalField).toBe('visible');
  });

  it('should handle nested objects with sensitive fields', () => {
    const result = createStructuredLog('log', 'Test', 'TestContext', 'corr-123', {
      user: {
        name: 'John',
        password: 'secret',
      },
    });

    const user = result.user as Record<string, unknown>;
    expect(user.name).toBe('John');
    expect(user.password).toBe('[REDACTED]');
  });
});
