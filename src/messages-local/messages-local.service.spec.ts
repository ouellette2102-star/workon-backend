import { Test, TestingModule } from '@nestjs/testing';
import { MessagesLocalService } from './messages-local.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { LocalMessageRole, LocalMessageStatus } from '@prisma/client';
import { Logger } from '@nestjs/common';

describe('MessagesLocalService', () => {
  let service: MessagesLocalService;
  let prisma: PrismaService;

  const mockPrisma = {
    localMission: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    localMessage: {
      findMany: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockMission = {
    id: 'mission_123',
    title: 'Test Mission',
    createdByUserId: 'employer_1',
    assignedToUserId: 'worker_1',
  };

  const mockMessage = {
    id: 'msg_1',
    missionId: 'mission_123',
    senderId: 'employer_1',
    senderRole: LocalMessageRole.EMPLOYER,
    content: 'Hello!',
    status: LocalMessageStatus.SENT,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagesLocalService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<MessagesLocalService>(MessagesLocalService);
    prisma = module.get<PrismaService>(PrismaService);

    // Silence logger
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getMessagesForMission', () => {
    it('should return messages for authorized user (employer)', async () => {
      mockPrisma.localMission.findUnique.mockResolvedValue(mockMission);
      mockPrisma.localMessage.findMany.mockResolvedValue([mockMessage]);

      const result = await service.getMessagesForMission('mission_123', 'employer_1');

      expect(result).toHaveLength(1);
      expect(result[0].content).toBe('Hello!');
    });

    it('should return messages for authorized user (worker)', async () => {
      mockPrisma.localMission.findUnique.mockResolvedValue(mockMission);
      mockPrisma.localMessage.findMany.mockResolvedValue([mockMessage]);

      const result = await service.getMessagesForMission('mission_123', 'worker_1');

      expect(result).toHaveLength(1);
    });

    it('should throw ForbiddenException for unauthorized user', async () => {
      mockPrisma.localMission.findUnique.mockResolvedValue(mockMission);

      await expect(
        service.getMessagesForMission('mission_123', 'other_user'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when mission not found', async () => {
      mockPrisma.localMission.findUnique.mockResolvedValue(null);

      await expect(
        service.getMessagesForMission('nonexistent', 'employer_1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('createMessage', () => {
    it('should create a message successfully', async () => {
      mockPrisma.localMission.findUnique
        .mockResolvedValueOnce(mockMission)
        .mockResolvedValueOnce(mockMission);
      mockPrisma.localMessage.create.mockResolvedValue(mockMessage);

      const result = await service.createMessage(
        'mission_123',
        'employer_1',
        'Hello!',
      );

      expect(result.content).toBe('Hello!');
      expect(mockPrisma.localMessage.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException for empty message', async () => {
      await expect(
        service.createMessage('mission_123', 'employer_1', '   '),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException for unauthorized user', async () => {
      mockPrisma.localMission.findUnique.mockResolvedValue(mockMission);

      await expect(
        service.createMessage('mission_123', 'other_user', 'Hello!'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when no worker assigned', async () => {
      mockPrisma.localMission.findUnique
        .mockResolvedValueOnce(mockMission)
        .mockResolvedValueOnce({ assignedToUserId: null });

      await expect(
        service.createMessage('mission_123', 'employer_1', 'Hello!'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('markAsRead', () => {
    it('should mark messages as read', async () => {
      mockPrisma.localMission.findUnique.mockResolvedValue(mockMission);
      mockPrisma.localMessage.updateMany.mockResolvedValue({ count: 5 });

      const result = await service.markAsRead('mission_123', 'employer_1');

      expect(result.count).toBe(5);
    });

    it('should throw ForbiddenException for unauthorized user', async () => {
      mockPrisma.localMission.findUnique.mockResolvedValue(mockMission);

      await expect(
        service.markAsRead('mission_123', 'other_user'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count', async () => {
      mockPrisma.localMessage.count.mockResolvedValue(3);

      const result = await service.getUnreadCount('employer_1');

      expect(result.count).toBe(3);
    });

    it('should return zero when no unread messages', async () => {
      mockPrisma.localMessage.count.mockResolvedValue(0);

      const result = await service.getUnreadCount('employer_1');

      expect(result.count).toBe(0);
    });
  });

  describe('getConversations', () => {
    it('should return conversations for user', async () => {
      const mockMissionWithRelations = {
        ...mockMission,
        createdByUser: {
          id: 'employer_1',
          firstName: 'John',
          lastName: 'Doe',
          pictureUrl: null,
        },
        assignedToUser: {
          id: 'worker_1',
          firstName: 'Jane',
          lastName: 'Worker',
          pictureUrl: null,
        },
        messages: [mockMessage],
      };

      mockPrisma.localMission.findMany.mockResolvedValue([mockMissionWithRelations]);
      mockPrisma.localMessage.count.mockResolvedValue(2);

      const result = await service.getConversations('employer_1');

      expect(result).toHaveLength(1);
      expect(result[0].missionTitle).toBe('Test Mission');
      expect(result[0].myRole).toBe('EMPLOYER');
    });

    it('should return empty array when no conversations', async () => {
      mockPrisma.localMission.findMany.mockResolvedValue([]);

      const result = await service.getConversations('employer_1');

      expect(result).toHaveLength(0);
    });

    it('should identify worker role correctly', async () => {
      const mockMissionWithRelations = {
        ...mockMission,
        createdByUser: {
          id: 'employer_1',
          firstName: 'John',
          lastName: 'Doe',
          pictureUrl: null,
        },
        assignedToUser: {
          id: 'worker_1',
          firstName: 'Jane',
          lastName: 'Worker',
          pictureUrl: null,
        },
        messages: [mockMessage],
      };

      mockPrisma.localMission.findMany.mockResolvedValue([mockMissionWithRelations]);
      mockPrisma.localMessage.count.mockResolvedValue(0);

      const result = await service.getConversations('worker_1');

      expect(result[0].myRole).toBe('WORKER');
    });
  });
});
