import { Test, TestingModule } from '@nestjs/testing';
import { GhlWebhookGuard } from './ghl-webhook.guard';
import { ConfigService } from '@nestjs/config';
import { ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';

describe('GhlWebhookGuard', () => {
  let guard: GhlWebhookGuard;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn(),
  };

  const createMockContext = (headers: Record<string, string> = {}, ip = '127.0.0.1'): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ headers, ip }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GhlWebhookGuard,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    guard = module.get<GhlWebhookGuard>(GhlWebhookGuard);
    configService = module.get<ConfigService>(ConfigService);

    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should allow request when GHL_WEBHOOK_SECRET is not configured', () => {
    mockConfigService.get.mockReturnValue(undefined);
    const context = createMockContext({});

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow request with valid secret', () => {
    mockConfigService.get.mockReturnValue('my-secret-123');
    const context = createMockContext({ 'x-ghl-secret': 'my-secret-123' });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should reject request with missing secret header', () => {
    mockConfigService.get.mockReturnValue('my-secret-123');
    const context = createMockContext({});

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('should reject request with wrong secret', () => {
    mockConfigService.get.mockReturnValue('my-secret-123');
    const context = createMockContext({ 'x-ghl-secret': 'wrong-secret' });

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });
});
