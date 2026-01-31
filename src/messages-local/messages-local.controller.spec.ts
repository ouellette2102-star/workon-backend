import { Test, TestingModule } from '@nestjs/testing';
import { MessagesLocalController } from './messages-local.controller';
import { MessagesLocalService } from './messages-local.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

describe('MessagesLocalController', () => {
  let controller: MessagesLocalController;
  let service: any;

  const mockMessage: any = {
    id: 'msg-1',
    missionId: 'mission-1',
    senderId: 'user-1',
    content: 'Hello',
    read: false,
    createdAt: new Date(),
  };

  const mockReq = { user: { sub: 'user-1' } };

  beforeEach(async () => {
    const mockService = {
      getConversations: jest.fn(),
      getMessagesForMission: jest.fn(),
      createMessage: jest.fn(),
      markAsRead: jest.fn(),
      getUnreadCount: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MessagesLocalController],
      providers: [{ provide: MessagesLocalService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<MessagesLocalController>(MessagesLocalController);
    service = module.get(MessagesLocalService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getConversations', () => {
    it('should return user conversations', async () => {
      const conversations = [{ missionId: 'mission-1', lastMessage: mockMessage }];
      service.getConversations.mockResolvedValue(conversations);

      const result = await controller.getConversations(mockReq);

      expect(service.getConversations).toHaveBeenCalledWith('user-1');
      expect(result).toHaveLength(1);
    });
  });

  describe('getMessages', () => {
    it('should return messages for mission', async () => {
      service.getMessagesForMission.mockResolvedValue([mockMessage]);

      const result = await controller.getMessages('mission-1', mockReq);

      expect(service.getMessagesForMission).toHaveBeenCalledWith('mission-1', 'user-1');
      expect(result).toHaveLength(1);
    });
  });

  describe('createMessage', () => {
    it('should create a message', async () => {
      const dto = { missionId: 'mission-1', content: 'Hello' };
      service.createMessage.mockResolvedValue(mockMessage);

      const result = await controller.createMessage(dto as any, mockReq);

      expect(service.createMessage).toHaveBeenCalledWith('mission-1', 'user-1', 'Hello');
      expect(result).toBeDefined();
    });
  });

  describe('markAsRead', () => {
    it('should mark messages as read', async () => {
      service.markAsRead.mockResolvedValue({ count: 5 });

      const result = await controller.markAsRead('mission-1', mockReq);

      expect(service.markAsRead).toHaveBeenCalledWith('mission-1', 'user-1');
      expect(result).toBeDefined();
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count', async () => {
      service.getUnreadCount.mockResolvedValue({ count: 10 });

      const result = await controller.getUnreadCount(mockReq);

      expect(service.getUnreadCount).toHaveBeenCalledWith('user-1');
      expect(result).toBeDefined();
    });
  });
});
