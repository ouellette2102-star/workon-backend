import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SendGridEmailProvider } from './sendgrid-email.provider';

// Mock SendGrid
jest.mock('@sendgrid/mail', () => ({
  setApiKey: jest.fn(),
  send: jest.fn(),
}));

import * as sgMail from '@sendgrid/mail';

describe('SendGridEmailProvider', () => {
  let provider: SendGridEmailProvider;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: string) => {
      const config: Record<string, string> = {
        SENDGRID_API_KEY: 'test-api-key',
        SENDGRID_FROM_EMAIL: 'test@workon.app',
        SENDGRID_FROM_NAME: 'WorkOn Test',
      };
      return config[key] || defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SendGridEmailProvider,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    provider = module.get<SendGridEmailProvider>(SendGridEmailProvider);
    configService = module.get<ConfigService>(ConfigService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });

  describe('initialization', () => {
    it('should have correct channel and provider name', () => {
      expect(provider.channel).toBe('email');
      expect(provider.providerName).toBe('sendgrid');
    });

    it('should initialize SendGrid on module init', () => {
      provider.onModuleInit();
      expect(sgMail.setApiKey).toHaveBeenCalledWith('test-api-key');
    });

    it('should not initialize without API key', () => {
      const noKeyConfig = {
        get: jest.fn(() => undefined),
      };

      const noKeyProvider = new SendGridEmailProvider(noKeyConfig as any);
      noKeyProvider.onModuleInit();

      expect(noKeyProvider.isReady()).toBe(false);
    });

    it('should skip initialization in test environment (CI safety)', () => {
      const testEnvConfig = {
        get: jest.fn((key: string) => {
          if (key === 'NODE_ENV') return 'test';
          if (key === 'SENDGRID_API_KEY') return 'real-api-key';
          return undefined;
        }),
      };

      const testProvider = new SendGridEmailProvider(testEnvConfig as any);
      jest.clearAllMocks(); // Clear any previous calls
      testProvider.onModuleInit();

      // Should NOT call setApiKey when NODE_ENV === 'test'
      expect(sgMail.setApiKey).not.toHaveBeenCalled();
      expect(testProvider.isReady()).toBe(false);
    });
  });

  describe('send', () => {
    beforeEach(() => {
      provider.onModuleInit();
    });

    it('should send email successfully', async () => {
      (sgMail.send as jest.Mock).mockResolvedValue([
        {
          statusCode: 202,
          headers: { 'x-message-id': 'msg_123' },
        },
      ]);

      const result = await provider.send({
        userId: 'user_123',
        recipientEmail: 'recipient@test.com',
        title: 'Test Subject',
        body: 'Test body content',
        correlationId: 'corr_123',
      });

      expect(result.success).toBe(true);
      expect(result.providerMessageId).toBe('msg_123');
      expect(sgMail.send).toHaveBeenCalled();
    });

    it('should return error for invalid email format', async () => {
      const result = await provider.send({
        userId: 'user_123',
        recipientEmail: 'invalid-email',
        title: 'Test',
        body: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('INVALID_EMAIL');
    });

    it('should handle SendGrid errors gracefully', async () => {
      (sgMail.send as jest.Mock).mockRejectedValue({
        code: 401,
        response: {
          body: {
            errors: [{ message: 'Invalid API key' }],
          },
        },
      });

      const result = await provider.send({
        userId: 'user_123',
        recipientEmail: 'recipient@test.com',
        title: 'Test',
        body: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(401);
      expect(result.errorMessage).toContain('Invalid API key');
    });

    it('should return error when not initialized', async () => {
      const uninitializedProvider = new SendGridEmailProvider(mockConfigService as any);

      const result = await uninitializedProvider.send({
        userId: 'user_123',
        recipientEmail: 'recipient@test.com',
        title: 'Test',
        body: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('PROVIDER_NOT_READY');
    });
  });

  describe('email validation', () => {
    beforeEach(() => {
      provider.onModuleInit();
      (sgMail.send as jest.Mock).mockResolvedValue([{ statusCode: 202 }]);
    });

    it('should accept valid email formats', async () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org',
      ];

      for (const email of validEmails) {
        const result = await provider.send({
          userId: 'user_123',
          recipientEmail: email,
          title: 'Test',
          body: 'Test',
        });
        expect(result.errorCode).not.toBe('INVALID_EMAIL');
      }
    });

    it('should reject invalid email formats', async () => {
      const invalidEmails = ['not-an-email', 'missing@domain', '@nodomain.com', ''];

      for (const email of invalidEmails) {
        const result = await provider.send({
          userId: 'user_123',
          recipientEmail: email,
          title: 'Test',
          body: 'Test',
        });
        expect(result.success).toBe(false);
      }
    });
  });

  describe('content sanitization', () => {
    beforeEach(() => {
      provider.onModuleInit();
    });

    it('should sanitize HTML in content', async () => {
      (sgMail.send as jest.Mock).mockImplementation((msg) => {
        // Check that HTML is escaped in text version
        expect(msg.text).not.toContain('<script>');
        return Promise.resolve([{ statusCode: 202 }]);
      });

      await provider.send({
        userId: 'user_123',
        recipientEmail: 'test@test.com',
        title: '<script>alert("xss")</script>',
        body: 'Content with <script>evil</script>',
      });

      expect(sgMail.send).toHaveBeenCalled();
    });
  });
});

