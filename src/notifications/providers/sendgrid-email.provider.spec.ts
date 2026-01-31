import { Test, TestingModule } from '@nestjs/testing';
import { SendGridEmailProvider } from './sendgrid-email.provider';
import { ConfigService } from '@nestjs/config';

// Mock @sendgrid/mail
jest.mock('@sendgrid/mail', () => ({
  setApiKey: jest.fn(),
  send: jest.fn(),
}));

import * as sgMail from '@sendgrid/mail';

describe('SendGridEmailProvider', () => {
  let provider: SendGridEmailProvider;
  let configService: jest.Mocked<ConfigService>;

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Default config
    mockConfigService.get.mockImplementation((key: string, defaultValue?: string) => {
      switch (key) {
        case 'NODE_ENV':
          return 'development';
        case 'SENDGRID_API_KEY':
          return 'SG.test_api_key';
        case 'SENDGRID_FROM_EMAIL':
          return defaultValue || 'noreply@workon.app';
        case 'SENDGRID_FROM_NAME':
          return defaultValue || 'WorkOn';
        default:
          return defaultValue;
      }
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SendGridEmailProvider,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    provider = module.get<SendGridEmailProvider>(SendGridEmailProvider);
  });

  describe('onModuleInit', () => {
    it('should skip initialization in test environment', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'test';
        return undefined;
      });

      provider.onModuleInit();

      expect(sgMail.setApiKey).not.toHaveBeenCalled();
    });

    it('should warn when API key is not configured', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'development';
        if (key === 'SENDGRID_API_KEY') return undefined;
        return undefined;
      });

      provider.onModuleInit();

      expect(sgMail.setApiKey).not.toHaveBeenCalled();
    });

    it('should initialize with API key', () => {
      provider.onModuleInit();

      expect(sgMail.setApiKey).toHaveBeenCalledWith('SG.test_api_key');
    });
  });

  describe('isReady', () => {
    it('should return false when not initialized', () => {
      // Don't call onModuleInit
      expect(provider.isReady()).toBe(false);
    });

    it('should return true after initialization', () => {
      provider.onModuleInit();
      expect(provider.isReady()).toBe(true);
    });
  });

  describe('send', () => {
    beforeEach(() => {
      provider.onModuleInit();
    });

    it('should return error when not initialized', async () => {
      const uninitializedProvider = new SendGridEmailProvider(
        mockConfigService as any,
      );

      const result = await uninitializedProvider.send({
        userId: 'user_1',
        recipientEmail: 'test@example.com',
        title: 'Test',
        body: 'Message',
      });

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('PROVIDER_NOT_READY');
    });

    it('should return error for invalid email', async () => {
      const result = await provider.send({
        userId: 'user_1',
        recipientEmail: 'invalid-email',
        title: 'Test',
        body: 'Message',
      });

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('INVALID_EMAIL');
    });

    it('should send email successfully', async () => {
      (sgMail.send as jest.Mock).mockResolvedValue([
        {
          statusCode: 202,
          headers: { 'x-message-id': 'msg_123' },
        },
      ]);

      const result = await provider.send({
        userId: 'user_1',
        recipientEmail: 'test@example.com',
        title: 'Test Title',
        body: 'Test Body',
        correlationId: 'corr-123',
      });

      expect(result.success).toBe(true);
      expect(result.providerMessageId).toBe('msg_123');
    });

    it('should include template data when provided', async () => {
      (sgMail.send as jest.Mock).mockResolvedValue([
        { statusCode: 202, headers: {} },
      ]);

      await provider.send({
        userId: 'user_1',
        recipientEmail: 'test@example.com',
        title: 'Test',
        body: 'Message',
        templateId: 'd-abc123',
        templateData: { name: 'John' },
      });

      expect(sgMail.send).toHaveBeenCalledWith(
        expect.objectContaining({
          templateId: 'd-abc123',
          dynamicTemplateData: { name: 'John' },
        }),
      );
    });

    it('should include reply-to when provided', async () => {
      (sgMail.send as jest.Mock).mockResolvedValue([
        { statusCode: 202, headers: {} },
      ]);

      await provider.send({
        userId: 'user_1',
        recipientEmail: 'test@example.com',
        title: 'Test',
        body: 'Message',
        replyTo: 'reply@example.com',
      });

      expect(sgMail.send).toHaveBeenCalledWith(
        expect.objectContaining({
          replyTo: 'reply@example.com',
        }),
      );
    });

    it('should handle SendGrid errors', async () => {
      (sgMail.send as jest.Mock).mockRejectedValue({
        code: 'ECONNREFUSED',
        message: 'Connection refused',
      });

      const result = await provider.send({
        userId: 'user_1',
        recipientEmail: 'test@example.com',
        title: 'Test',
        body: 'Message',
      });

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('ECONNREFUSED');
    });

    it('should sanitize email from error message', async () => {
      (sgMail.send as jest.Mock).mockRejectedValue({
        message: 'Invalid recipient test@example.com',
      });

      const result = await provider.send({
        userId: 'user_1',
        recipientEmail: 'test@example.com',
        title: 'Test',
        body: 'Message',
      });

      expect(result.errorMessage).toContain('[EMAIL]');
      expect(result.errorMessage).not.toContain('test@example.com');
    });
  });

  describe('provider metadata', () => {
    it('should have correct channel', () => {
      expect(provider.channel).toBe('email');
    });

    it('should have correct provider name', () => {
      expect(provider.providerName).toBe('sendgrid');
    });
  });
});

