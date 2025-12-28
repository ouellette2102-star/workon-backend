import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { MissionEventsService } from './mission-events.service';
import { PrismaService } from '../prisma/prisma.service';
import { MissionEventType } from '@prisma/client';

describe('MissionEventsService', () => {
  let service: MissionEventsService;
  let prismaService: PrismaService;

  const mockMissionEvent = {
    id: 'event-1',
    missionId: 'mission-1',
    type: MissionEventType.MISSION_STARTED,
    actorUserId: 'user-1',
    targetUserId: 'user-2',
    payload: { fromStatus: 'OPEN', toStatus: 'IN_PROGRESS' },
    createdAt: new Date('2025-01-01T12:00:00Z'),
  };

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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MissionEventsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<MissionEventsService>(MissionEventsService);
    prismaService = module.get<PrismaService>(PrismaService);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('emitEvent', () => {
    it('devrait créer un événement avec succès', async () => {
      mockPrismaService.missionEvent.create.mockResolvedValue(mockMissionEvent);

      const result = await service.emitEvent({
        missionId: 'mission-1',
        type: MissionEventType.MISSION_STARTED,
        actorUserId: 'user-1',
        targetUserId: 'user-2',
        payload: { fromStatus: 'OPEN', toStatus: 'IN_PROGRESS' },
      });

      expect(result).toBeDefined();
      expect(result.id).toBe('event-1');
      expect(result.type).toBe(MissionEventType.MISSION_STARTED);
      expect(result.missionId).toBe('mission-1');
      expect(mockPrismaService.missionEvent.create).toHaveBeenCalledTimes(1);
    });

    it('devrait créer un événement sans acteur ni target', async () => {
      const systemEvent = {
        ...mockMissionEvent,
        actorUserId: null,
        targetUserId: null,
        type: MissionEventType.MISSION_EXPIRED,
      };
      mockPrismaService.missionEvent.create.mockResolvedValue(systemEvent);

      const result = await service.emitEvent({
        missionId: 'mission-1',
        type: MissionEventType.MISSION_EXPIRED,
      });

      expect(result.actorUserId).toBeNull();
      expect(result.targetUserId).toBeNull();
    });
  });

  describe('listMissionEvents', () => {
    it('devrait retourner les événements si l\'utilisateur est l\'auteur', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue({
        authorClient: { clerkId: 'clerk-user-1' },
        assigneeWorker: null,
      });
      mockPrismaService.missionEvent.findMany.mockResolvedValue([mockMissionEvent]);

      const result = await service.listMissionEvents('mission-1', 'clerk-user-1');

      expect(result.events).toHaveLength(1);
      expect(result.events[0].id).toBe('event-1');
      expect(result.hasMore).toBe(false);
    });

    it('devrait retourner les événements si l\'utilisateur est le worker', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue({
        authorClient: { clerkId: 'clerk-author' },
        assigneeWorker: { clerkId: 'clerk-worker' },
      });
      mockPrismaService.missionEvent.findMany.mockResolvedValue([mockMissionEvent]);

      const result = await service.listMissionEvents('mission-1', 'clerk-worker');

      expect(result.events).toHaveLength(1);
    });

    it('devrait refuser l\'accès si l\'utilisateur n\'est pas partie à la mission', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue({
        authorClient: { clerkId: 'clerk-author' },
        assigneeWorker: { clerkId: 'clerk-worker' },
      });

      await expect(
        service.listMissionEvents('mission-1', 'clerk-random'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('devrait lever NotFoundException si la mission n\'existe pas', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue(null);

      await expect(
        service.listMissionEvents('nonexistent', 'clerk-user'),
      ).rejects.toThrow(NotFoundException);
    });

    it('devrait gérer la pagination avec hasMore', async () => {
      const manyEvents = Array(51)
        .fill(null)
        .map((_, i) => ({
          ...mockMissionEvent,
          id: `event-${i}`,
        }));

      mockPrismaService.mission.findUnique.mockResolvedValue({
        authorClient: { clerkId: 'clerk-user-1' },
        assigneeWorker: null,
      });
      mockPrismaService.missionEvent.findMany.mockResolvedValue(manyEvents);

      const result = await service.listMissionEvents('mission-1', 'clerk-user-1', {
        limit: 50,
      });

      expect(result.events).toHaveLength(50);
      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).toBe('event-49');
    });
  });

  describe('listMyEvents', () => {
    it('devrait retourner les événements ciblant l\'utilisateur', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'internal-user-id' });
      mockPrismaService.missionEvent.findMany.mockResolvedValue([mockMissionEvent]);

      const result = await service.listMyEvents('clerk-user-2');

      expect(result.events).toHaveLength(1);
      expect(mockPrismaService.missionEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { targetUserId: 'internal-user-id' },
        }),
      );
    });

    it('devrait retourner un feed vide si l\'utilisateur n\'existe pas', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.listMyEvents('nonexistent-clerk');

      expect(result.events).toHaveLength(0);
      expect(result.hasMore).toBe(false);
    });
  });

  describe('sanitizePayload', () => {
    it('devrait supprimer les clés sensibles du payload', async () => {
      const eventWithSensitiveData = {
        ...mockMissionEvent,
        payload: {
          fromStatus: 'OPEN',
          toStatus: 'IN_PROGRESS',
          stripePaymentIntentId: 'pi_secret123',
          token: 'secret-token',
        },
      };
      mockPrismaService.missionEvent.create.mockResolvedValue(eventWithSensitiveData);

      const result = await service.emitEvent({
        missionId: 'mission-1',
        type: MissionEventType.PAYMENT_AUTHORIZED,
        payload: eventWithSensitiveData.payload,
      });

      // Le payload sanitized ne devrait pas contenir les clés sensibles
      expect(result.payload).toBeDefined();
      expect(result.payload).not.toHaveProperty('stripePaymentIntentId');
      expect(result.payload).not.toHaveProperty('token');
      expect(result.payload).toHaveProperty('fromStatus');
      expect(result.payload).toHaveProperty('toStatus');
    });
  });
});

