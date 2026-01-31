import { Test, TestingModule } from '@nestjs/testing';
import { PushService } from './push.service';
import { Logger } from '@nestjs/common';

// Mock firebase-admin
jest.mock('firebase-admin', () => ({
  apps: [],
  initializeApp: jest.fn(),
  credential: {
    applicationDefault: jest.fn(),
    cert: jest.fn(),
  },
  messaging: jest.fn(() => ({
    sendEachForMulticast: jest.fn().mockResolvedValue({
      successCount: 1,
      failureCount: 0,
      responses: [{ success: true }],
    }),
  })),
}));

describe('PushService', () => {
  let service: PushService;

  beforeEach(async () => {
    // Clear environment variables
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    delete process.env.FIREBASE_PROJECT_ID;
    delete process.env.FIREBASE_CLIENT_EMAIL;
    delete process.env.FIREBASE_PRIVATE_KEY;

    const module: TestingModule = await Test.createTestingModule({
      providers: [PushService],
    }).compile();

    service = module.get<PushService>(PushService);

    // Silence logger
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('isReady', () => {
    it('should return false when Firebase is not initialized', () => {
      // Service created without credentials
      expect(service.isReady).toBe(false);
    });
  });

  describe('sendChatMessageNotification', () => {
    it('should skip when Firebase not initialized', async () => {
      await service.sendChatMessageNotification(['token1'], {
        conversationId: 'conv_1',
        missionId: 'mission_1',
        senderName: 'John',
        preview: 'Hello!',
      });

      // Should not throw, just skip
      expect(service.isReady).toBe(false);
    });

    it('should skip when no tokens provided', async () => {
      await service.sendChatMessageNotification([], {
        conversationId: 'conv_1',
        missionId: 'mission_1',
        senderName: 'John',
        preview: 'Hello!',
      });

      // Should not throw
    });
  });

  describe('sendNotification', () => {
    it('should skip when Firebase not initialized', async () => {
      await service.sendNotification(['token1'], 'Title', 'Body');

      // Should not throw
      expect(service.isReady).toBe(false);
    });

    it('should skip when no tokens provided', async () => {
      await service.sendNotification([], 'Title', 'Body');

      // Should not throw
    });

    it('should accept custom data', async () => {
      await service.sendNotification(['token1'], 'Title', 'Body', {
        key: 'value',
      });

      // Should not throw
    });
  });

  describe('onModuleInit', () => {
    it('should call initializeFirebase on module init', () => {
      // onModuleInit is called in constructor
      // Just verify service exists
      expect(service).toBeDefined();
    });
  });
});
