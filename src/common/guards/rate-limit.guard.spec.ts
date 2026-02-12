import { Test, TestingModule } from '@nestjs/testing';
import { RateLimitGuard, RateLimitPresets, RATE_LIMIT_KEY } from './rate-limit.guard';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';

describe('RateLimitGuard', () => {
  let guard: RateLimitGuard;
  let reflector: jest.Mocked<Reflector>;
  let configService: jest.Mocked<ConfigService>;

  const mockReflector = {
    get: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Default config values
    mockConfigService.get.mockImplementation((key: string, defaultValue?: string) => {
      switch (key) {
        case 'NODE_ENV':
          return 'development'; // Not 'test' so rate limiting applies
        case 'RATE_LIMIT_DEFAULT':
          return defaultValue || '60';
        case 'RATE_LIMIT_WINDOW_SEC':
          return defaultValue || '60';
        default:
          return defaultValue;
      }
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateLimitGuard,
        { provide: Reflector, useValue: mockReflector },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    guard = module.get<RateLimitGuard>(RateLimitGuard);
    reflector = module.get(Reflector);
    configService = module.get(ConfigService);
  });

  const createMockContext = (
    ip: string = '192.168.1.1',
    headers: Record<string, string> = {},
  ): ExecutionContext => {
    const mockResponse = {
      setHeader: jest.fn(),
    };

    const mockRequest = {
      ip,
      headers,
      socket: { remoteAddress: ip },
    };

    return {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
        getNext: () => jest.fn(),
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
      getArgs: () => [],
      getArgByIndex: () => undefined,
      switchToRpc: () => ({} as any),
      switchToWs: () => ({} as any),
      getType: () => 'http',
    } as unknown as ExecutionContext;
  };

  describe('canActivate', () => {
    it('should bypass rate limiting in test environment', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'test';
        return '60';
      });

      const context = createMockContext();
      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow requests under rate limit', () => {
      mockReflector.get.mockReturnValue(undefined);
      const context = createMockContext('10.0.0.1');

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should set rate limit headers', () => {
      mockReflector.get.mockReturnValue(undefined);
      const context = createMockContext('10.0.0.2');
      const response = context.switchToHttp().getResponse();

      guard.canActivate(context);

      expect(response.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', '60');
      expect(response.setHeader).toHaveBeenCalledWith(
        'X-RateLimit-Remaining',
        expect.any(String),
      );
      expect(response.setHeader).toHaveBeenCalledWith(
        'X-RateLimit-Reset',
        expect.any(String),
      );
    });

    it('should use custom rate limit from decorator', () => {
      mockReflector.get.mockReturnValue({
        limit: 5,
        windowSec: 60,
        prefix: 'custom',
      });
      const context = createMockContext('10.0.0.3');
      const response = context.switchToHttp().getResponse();

      guard.canActivate(context);

      expect(response.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', '5');
    });

    it('should handle x-forwarded-for header', () => {
      mockReflector.get.mockReturnValue(undefined);
      const context = createMockContext('127.0.0.1', {
        'x-forwarded-for': '203.0.113.195, 70.41.3.18, 150.172.238.178',
      });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });
  });

  describe('RateLimitPresets', () => {
    it('should have AUTH preset with 10 req/min', () => {
      expect(RateLimitPresets.AUTH).toEqual({
        limit: 10,
        windowSec: 60,
        prefix: 'auth',
      });
    });

    it('should have PAYMENTS preset with 20 req/min', () => {
      expect(RateLimitPresets.PAYMENTS).toEqual({
        limit: 20,
        windowSec: 60,
        prefix: 'payments',
      });
    });

    it('should have MEDIA preset with 100 req/min', () => {
      expect(RateLimitPresets.MEDIA).toEqual({
        limit: 100,
        windowSec: 60,
        prefix: 'media',
      });
    });

    it('should have STANDARD preset with 60 req/min', () => {
      expect(RateLimitPresets.STANDARD).toEqual({
        limit: 60,
        windowSec: 60,
        prefix: 'api',
      });
    });
  });
});
