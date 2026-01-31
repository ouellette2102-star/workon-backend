import { Test, TestingModule } from '@nestjs/testing';
import { FcmPushProvider } from './fcm-push.provider';
import { PushService } from '../../push/push.service';

describe('FcmPushProvider', () => {
  let provider: FcmPushProvider;
  let pushService: jest.Mocked<PushService>;

  const mockPushService = {
    isReady: true,
    sendNotification: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FcmPushProvider,
        { provide: PushService, useValue: mockPushService },
      ],
    }).compile();

    provider = module.get<FcmPushProvider>(FcmPushProvider);
    pushService = module.get(PushService);
  });

  describe('isReady', () => {
    it('should return true when push service is ready', () => {
      mockPushService.isReady = true;
      expect(provider.isReady()).toBe(true);
    });

    it('should return false when push service is not ready', () => {
      mockPushService.isReady = false;
      expect(provider.isReady()).toBe(false);
    });
  });

  describe('send', () => {
    const validToken = 'a'.repeat(100); // FCM tokens are > 50 chars
    
    it('should return error when provider is not ready', async () => {
      mockPushService.isReady = false;

      const result = await provider.send({
        userId: 'user_1',
        tokens: [validToken],
        title: 'Test',
        body: 'Message',
      });

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('PROVIDER_NOT_READY');
    });

    it('should return error when no tokens provided', async () => {
      mockPushService.isReady = true;

      const result = await provider.send({
        userId: 'user_1',
        tokens: [],
        title: 'Test',
        body: 'Message',
      });

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('NO_TOKENS');
    });

    it('should return error when tokens array is undefined', async () => {
      mockPushService.isReady = true;

      const result = await provider.send({
        userId: 'user_1',
        tokens: undefined as any,
        title: 'Test',
        body: 'Message',
      });

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('NO_TOKENS');
    });

    it('should filter out invalid tokens', async () => {
      mockPushService.isReady = true;
      mockPushService.sendNotification.mockResolvedValue(undefined);

      const result = await provider.send({
        userId: 'user_1',
        tokens: ['short', validToken, 'token with space'],
        title: 'Test',
        body: 'Message',
      });

      expect(result.success).toBe(true);
      expect(mockPushService.sendNotification).toHaveBeenCalledWith(
        [validToken],
        'Test',
        'Message',
        expect.any(Object),
      );
    });

    it('should return error when all tokens are invalid', async () => {
      mockPushService.isReady = true;

      const result = await provider.send({
        userId: 'user_1',
        tokens: ['short', 'also short'],
        title: 'Test',
        body: 'Message',
      });

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('NO_VALID_TOKENS');
    });

    it('should send notification successfully', async () => {
      mockPushService.isReady = true;
      mockPushService.sendNotification.mockResolvedValue(undefined);

      const result = await provider.send({
        userId: 'user_1',
        tokens: [validToken],
        title: 'Test Title',
        body: 'Test Body',
        correlationId: 'corr-123',
        data: { action: 'open_mission', missionId: 'mission_1' },
      });

      expect(result.success).toBe(true);
      expect(result.metadata?.tokenCount).toBe(1);
    });

    it('should handle push service errors', async () => {
      mockPushService.isReady = true;
      mockPushService.sendNotification.mockRejectedValue(
        new Error('Firebase error'),
      );

      const result = await provider.send({
        userId: 'user_1',
        tokens: [validToken],
        title: 'Test',
        body: 'Message',
      });

      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('Firebase error');
    });
  });

  describe('provider metadata', () => {
    it('should have correct channel', () => {
      expect(provider.channel).toBe('push');
    });

    it('should have correct provider name', () => {
      expect(provider.providerName).toBe('fcm');
    });
  });
});
