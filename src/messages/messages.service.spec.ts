import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { MessageSenderRole } from '@prisma/client';
import { MessagesService } from './messages.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

describe('MessagesService', () => {
  let service: MessagesService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;
  let notificationsService: jest.Mocked<NotificationsService>;

  const mockMission = {
    id: 'mission-1',
    title: 'Test Mission',
    authorClientId: 'client-1',
    assigneeWorkerId: 'worker-1',
    authorClient: {
      id: 'client-1',
      clerkId: 'clerk-client-1',
    },
    assigneeWorker: {
      id: 'worker-1',
      clerkId: 'clerk-worker-1',
    },
  };

  const mockMessage = {
    id: 'msg-1',
    missionId: 'mission-1',
    senderId: 'clerk-client-1',
    senderRole: MessageSenderRole.EMPLOYER,
    content: 'Test message content',
    status: 'SENT',
    createdAt: new Date('2024-01-01T10:00:00Z'),
  };

  const createMockPrisma = () => ({
    mission: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    message: {
      findMany: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  });

  beforeEach(async () => {
    mockPrisma = createMockPrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagesService,
        { provide: PrismaService, useValue: mockPrisma },
        {
          provide: NotificationsService,
          useValue: {
            createForNewMessage: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<MessagesService>(MessagesService);
    notificationsService = module.get(NotificationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getMessagesForMission', () => {
    it('should return messages for employer with access', async () => {
      mockPrisma.mission.findUnique.mockResolvedValue(mockMission as any);
      mockPrisma.message.findMany.mockResolvedValue([mockMessage] as any);

      const result = await service.getMessagesForMission(
        'mission-1',
        'clerk-client-1',
      );

      expect(result).toHaveLength(1);
      expect(result[0].content).toBe('Test message content');
      expect(mockPrisma.message.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { missionId: 'mission-1' },
        }),
      );
    });

    it('should return messages for worker with access', async () => {
      mockPrisma.mission.findUnique.mockResolvedValue(mockMission as any);
      mockPrisma.message.findMany.mockResolvedValue([mockMessage] as any);

      const result = await service.getMessagesForMission(
        'mission-1',
        'clerk-worker-1',
      );

      expect(result).toHaveLength(1);
    });

    it('should throw ForbiddenException for unauthorized user', async () => {
      mockPrisma.mission.findUnique.mockResolvedValue(mockMission as any);

      await expect(
        service.getMessagesForMission('mission-1', 'clerk-unauthorized'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException for non-existent mission', async () => {
      mockPrisma.mission.findUnique.mockResolvedValue(null);

      await expect(
        service.getMessagesForMission('non-existent', 'clerk-client-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('createMessage', () => {
    it('should create message for employer', async () => {
      mockPrisma.mission.findUnique
        .mockResolvedValueOnce(mockMission as any) // checkMissionAccess
        .mockResolvedValueOnce({
          ...mockMission,
          assigneeWorkerId: 'worker-1',
        } as any); // worker check
      mockPrisma.message.create.mockResolvedValue(mockMessage as any);
      mockPrisma.user.findUnique.mockResolvedValue({
        userProfile: { name: 'Test User' },
      } as any);

      const result = await service.createMessage(
        'mission-1',
        'clerk-client-1',
        { missionId: 'mission-1', content: 'Hello worker!' },
      );

      expect(result.content).toBe('Test message content');
      expect(mockPrisma.message.create).toHaveBeenCalled();
      expect(notificationsService.createForNewMessage).toHaveBeenCalled();
    });

    it('should create message for worker', async () => {
      mockPrisma.mission.findUnique
        .mockResolvedValueOnce(mockMission as any)
        .mockResolvedValueOnce({
          ...mockMission,
          assigneeWorkerId: 'worker-1',
        } as any);
      mockPrisma.message.create.mockResolvedValue({
        ...mockMessage,
        senderId: 'clerk-worker-1',
        senderRole: MessageSenderRole.WORKER,
      } as any);
      mockPrisma.user.findUnique.mockResolvedValue({
        userProfile: { name: 'Worker Name' },
      } as any);

      const result = await service.createMessage(
        'mission-1',
        'clerk-worker-1',
        { missionId: 'mission-1', content: 'Hello employer!' },
      );

      expect(result).toBeDefined();
      expect(mockPrisma.message.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException for empty content', async () => {
      await expect(
        service.createMessage('mission-1', 'clerk-client-1', { missionId: 'mission-1', content: '   ' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException for unauthorized user', async () => {
      mockPrisma.mission.findUnique.mockResolvedValue(mockMission as any);

      await expect(
        service.createMessage('mission-1', 'clerk-unauthorized', {
          missionId: 'mission-1',
          content: 'Test',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if no worker assigned', async () => {
      const missionWithoutWorker = {
        ...mockMission,
        assigneeWorkerId: null,
        assigneeWorker: null,
      };
      mockPrisma.mission.findUnique
        .mockResolvedValueOnce(missionWithoutWorker as any)
        .mockResolvedValueOnce(missionWithoutWorker as any);

      await expect(
        service.createMessage('mission-1', 'clerk-client-1', {
          missionId: 'mission-1',
          content: 'Test',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('markAsRead', () => {
    it('should mark messages as read for employer', async () => {
      mockPrisma.mission.findUnique.mockResolvedValue(mockMission as any);
      mockPrisma.message.updateMany.mockResolvedValue({ count: 3 });

      const result = await service.markAsRead('mission-1', 'clerk-client-1');

      expect(result.count).toBe(3);
      expect(mockPrisma.message.updateMany).toHaveBeenCalledWith({
        where: {
          missionId: 'mission-1',
          senderRole: MessageSenderRole.WORKER,
          status: { not: 'READ' },
        },
        data: { status: 'READ' },
      });
    });

    it('should mark messages as read for worker', async () => {
      mockPrisma.mission.findUnique.mockResolvedValue(mockMission as any);
      mockPrisma.message.updateMany.mockResolvedValue({ count: 5 });

      const result = await service.markAsRead('mission-1', 'clerk-worker-1');

      expect(result.count).toBe(5);
      expect(mockPrisma.message.updateMany).toHaveBeenCalledWith({
        where: {
          missionId: 'mission-1',
          senderRole: MessageSenderRole.EMPLOYER,
          status: { not: 'READ' },
        },
        data: { status: 'READ' },
      });
    });

    it('should throw ForbiddenException for unauthorized user', async () => {
      mockPrisma.mission.findUnique.mockResolvedValue(mockMission as any);

      await expect(
        service.markAsRead('mission-1', 'clerk-unauthorized'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count for user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1' } as any);
      mockPrisma.message.count.mockResolvedValue(7);

      const result = await service.getUnreadCount('clerk-user-1');

      expect(result.count).toBe(7);
    });

    it('should return 0 for non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await service.getUnreadCount('clerk-unknown');

      expect(result.count).toBe(0);
    });
  });

  describe('getConversations', () => {
    it('should return conversations for user', async () => {
      mockPrisma.mission.findMany.mockResolvedValue([
        {
          id: 'mission-1',
          title: 'Test Mission',
          authorClient: {
            clerkId: 'clerk-client-1',
            userProfile: { name: 'Client Name' },
          },
          assigneeWorker: {
            clerkId: 'clerk-worker-1',
            userProfile: { name: 'Worker Name' },
          },
          messages: [mockMessage],
        },
      ] as any);
      mockPrisma.message.count.mockResolvedValue(2);

      const result = await service.getConversations('clerk-client-1');

      expect(result).toHaveLength(1);
      expect(result[0].missionTitle).toBe('Test Mission');
      expect(result[0].myRole).toBe('EMPLOYER');
      expect(result[0].unreadCount).toBe(2);
    });

    it('should return worker role when user is worker', async () => {
      mockPrisma.mission.findMany.mockResolvedValue([
        {
          id: 'mission-1',
          title: 'Test Mission',
          authorClient: {
            clerkId: 'clerk-client-1',
            userProfile: { name: 'Client Name' },
          },
          assigneeWorker: {
            clerkId: 'clerk-worker-1',
            userProfile: { name: 'Worker Name' },
          },
          messages: [mockMessage],
        },
      ] as any);
      mockPrisma.message.count.mockResolvedValue(0);

      const result = await service.getConversations('clerk-worker-1');

      expect(result).toHaveLength(1);
      expect(result[0].myRole).toBe('WORKER');
    });

    it('should return empty array when no conversations', async () => {
      mockPrisma.mission.findMany.mockResolvedValue([]);

      const result = await service.getConversations('clerk-user-1');

      expect(result).toEqual([]);
    });
  });
});

