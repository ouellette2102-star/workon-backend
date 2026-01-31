import { Test, TestingModule } from '@nestjs/testing';
import { MissionEventsService } from './mission-events.service';
import { PrismaService } from '../prisma/prisma.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { MissionEventType, Prisma } from '@prisma/client';

describe('MissionEventsService', () => {
  let service: MissionEventsService;

  const mockPrismaService = {
    missionEvent: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    mission: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  };

  const mockEvent = {
    id: 'event_1',
    missionId: 'mission_1',
    type: MissionEventType.MISSION_CREATED,
    actorUserId: 'user_1',
    targetUserId: 'user_2',
    payload: { action: 'test' },
    createdAt: new Date('2026-01-30'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MissionEventsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<MissionEventsService>(MissionEventsService);
  });

  describe('emitEvent', () => {
    it('should create a new event', async () => {
      mockPrismaService.missionEvent.create.mockResolvedValue(mockEvent);

      const result = await service.emitEvent({
        missionId: 'mission_1',
        type: MissionEventType.MISSION_CREATED,
        actorUserId: 'user_1',
        targetUserId: 'user_2',
        payload: { action: 'test' },
      });

      expect(result).toEqual({
        id: 'event_1',
        missionId: 'mission_1',
        type: MissionEventType.MISSION_CREATED,
        actorUserId: 'user_1',
        targetUserId: 'user_2',
        payload: { action: 'test' },
        createdAt: expect.any(String),
      });
    });

    it('should create event without optional fields', async () => {
      const eventWithoutOptionals = {
        ...mockEvent,
        actorUserId: null,
        targetUserId: null,
        payload: Prisma.JsonNull,
      };
      mockPrismaService.missionEvent.create.mockResolvedValue(eventWithoutOptionals);

      const result = await service.emitEvent({
        missionId: 'mission_1',
        type: MissionEventType.MISSION_CREATED,
      });

      expect(result.actorUserId).toBeNull();
      expect(result.targetUserId).toBeNull();
    });
  });

  describe('listMissionEvents', () => {
    it('should return paginated events for authorized user', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue({
        authorClient: { clerkId: 'clerk_user_1' },
        assigneeWorker: null,
      });
      mockPrismaService.missionEvent.findMany.mockResolvedValue([mockEvent]);

      const result = await service.listMissionEvents('mission_1', 'clerk_user_1');

      expect(result.events).toHaveLength(1);
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeNull();
    });

    it('should throw NotFoundException if mission not found', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue(null);

      await expect(
        service.listMissionEvents('nonexistent', 'clerk_user_1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user has no access', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue({
        authorClient: { clerkId: 'other_user' },
        assigneeWorker: { clerkId: 'another_user' },
      });

      await expect(
        service.listMissionEvents('mission_1', 'clerk_user_1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow access for mission worker', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue({
        authorClient: { clerkId: 'employer_user' },
        assigneeWorker: { clerkId: 'clerk_user_1' },
      });
      mockPrismaService.missionEvent.findMany.mockResolvedValue([mockEvent]);

      const result = await service.listMissionEvents('mission_1', 'clerk_user_1');

      expect(result.events).toHaveLength(1);
    });

    it('should handle pagination with cursor', async () => {
      const events = Array.from({ length: 51 }, (_, i) => ({
        ...mockEvent,
        id: `event_${i}`,
      }));
      mockPrismaService.mission.findUnique.mockResolvedValue({
        authorClient: { clerkId: 'clerk_user_1' },
        assigneeWorker: null,
      });
      mockPrismaService.missionEvent.findMany.mockResolvedValue(events);

      const result = await service.listMissionEvents('mission_1', 'clerk_user_1', {
        limit: 50,
      });

      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).toBe('event_49');
    });
  });

  describe('listMyEvents', () => {
    it('should return events targeting the user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'internal_user_1' });
      mockPrismaService.missionEvent.findMany.mockResolvedValue([mockEvent]);

      const result = await service.listMyEvents('clerk_user_1');

      expect(result.events).toHaveLength(1);
      expect(mockPrismaService.missionEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { targetUserId: 'internal_user_1' },
        }),
      );
    });

    it('should return empty if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.listMyEvents('unknown_clerk');

      expect(result.events).toEqual([]);
      expect(result.hasMore).toBe(false);
    });
  });

  describe('sanitizePayload', () => {
    it('should remove sensitive keys from payload', async () => {
      const eventWithSensitiveData = {
        ...mockEvent,
        payload: {
          action: 'test',
          stripePaymentIntentId: 'pi_secret',
          token: 'secret_token',
          normalField: 'keep_this',
        },
      };
      mockPrismaService.missionEvent.create.mockResolvedValue(eventWithSensitiveData);

      const result = await service.emitEvent({
        missionId: 'mission_1',
        type: MissionEventType.MISSION_CREATED,
        payload: eventWithSensitiveData.payload,
      });

      expect(result.payload).not.toHaveProperty('stripePaymentIntentId');
      expect(result.payload).not.toHaveProperty('token');
      expect(result.payload).toHaveProperty('action');
      expect(result.payload).toHaveProperty('normalField');
    });

    it('should return null for invalid payload', async () => {
      const eventWithNullPayload = {
        ...mockEvent,
        payload: null,
      };
      mockPrismaService.missionEvent.create.mockResolvedValue(eventWithNullPayload);

      const result = await service.emitEvent({
        missionId: 'mission_1',
        type: MissionEventType.MISSION_CREATED,
      });

      expect(result.payload).toBeNull();
    });
  });
});
