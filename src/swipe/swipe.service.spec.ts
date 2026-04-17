import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { SwipeService } from './swipe.service';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from '../push/push.service';
import { DevicesService } from '../devices/devices.service';
import { NotificationsService } from '../notifications/notifications.service';

describe('SwipeService', () => {
  let service: SwipeService;
  let prisma: any;

  const mockCandidate = {
    id: 'worker_1',
    firstName: 'Jean',
    lastName: 'Tremblay',
    city: 'Montréal',
    latitude: 45.5017,
    longitude: -73.5673,
    role: 'worker',
    category: 'plumbing',
    bio: 'Plombier expérimenté',
    pictureUrl: null,
    trustTier: 'VERIFIED',
    completionScore: 80,
  };

  beforeEach(async () => {
    prisma = {
      swipeAction: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn().mockResolvedValue({ id: 'sa_1', action: 'LIKE' }),
      },
      swipeMatch: {
        findMany: jest.fn().mockResolvedValue([]),
        upsert: jest.fn().mockResolvedValue({ id: 'sm_1', userAId: 'user_1', userBId: 'worker_1' }),
      },
      localUser: {
        findMany: jest.fn().mockResolvedValue([{ ...mockCandidate, receivedReviews: [{ rating: 5 }] }]),
        findUnique: jest.fn().mockResolvedValue({ firstName: 'Test' }),
      },
      notification: {
        create: jest.fn().mockResolvedValue({ id: 'notif_1' }),
      },
    };

    const mockPushService = { sendNotification: jest.fn().mockResolvedValue(undefined) };
    const mockDevicesService = { getPushTokensForUser: jest.fn().mockResolvedValue([]) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SwipeService,
        { provide: PrismaService, useValue: prisma },
        { provide: PushService, useValue: mockPushService },
        { provide: DevicesService, useValue: mockDevicesService },
        {
          provide: NotificationsService,
          useValue: { createLocalNotification: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    service = module.get<SwipeService>(SwipeService);
  });

  describe('getCandidates', () => {
    it('should return candidates excluding self and already-swiped', async () => {
      const result = await service.getCandidates('user_1');

      expect(prisma.swipeAction.findMany).toHaveBeenCalledWith({
        where: { userId: 'user_1' },
        select: { targetId: true },
      });
      expect(prisma.localUser.findMany).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('worker_1');
    });

    it('should filter by role', async () => {
      await service.getCandidates('user_1', { role: 'worker' });

      const whereArg = prisma.localUser.findMany.mock.calls[0][0].where;
      expect(whereArg.role).toBe('worker');
    });

    it('should filter by category', async () => {
      await service.getCandidates('user_1', { category: 'plumbing' });

      const whereArg = prisma.localUser.findMany.mock.calls[0][0].where;
      expect(whereArg.category).toBe('plumbing');
    });

    it('should filter by geo distance', async () => {
      // Candidate at 45.5017, -73.5673 (Montréal)
      // Searching from 45.5017, -73.5673 with 5km radius — should match
      const result = await service.getCandidates('user_1', {
        lat: 45.5017,
        lng: -73.5673,
        radiusKm: 5,
      });

      expect(result).toHaveLength(1);
    });

    it('should exclude candidates outside geo radius', async () => {
      // Searching from Toronto (43.65, -79.38) with 5km radius — Montréal is ~500km away
      const result = await service.getCandidates('user_1', {
        lat: 43.65,
        lng: -79.38,
        radiusKm: 5,
      });

      expect(result).toHaveLength(0);
    });
  });

  describe('recordSwipe', () => {
    it('should record a LIKE action', async () => {
      const result = await service.recordSwipe('user_1', 'worker_1', 'LIKE');

      expect(prisma.swipeAction.upsert).toHaveBeenCalled();
      expect(result.action).toBe('LIKE');
    });

    it('should throw when swiping yourself', async () => {
      await expect(service.recordSwipe('user_1', 'user_1', 'LIKE')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should create match on mutual LIKE', async () => {
      // Simulate reciprocal LIKE exists
      prisma.swipeAction.findUnique.mockResolvedValue({
        id: 'sa_2',
        userId: 'worker_1',
        targetId: 'user_1',
        action: 'LIKE',
      });

      const result = await service.recordSwipe('user_1', 'worker_1', 'LIKE');

      expect(result.matched).toBe(true);
      expect(result.matchId).toBeDefined();
      expect(prisma.swipeMatch.upsert).toHaveBeenCalled();
    });

    it('should not create match on PASS', async () => {
      const result = await service.recordSwipe('user_1', 'worker_1', 'PASS');

      expect(result.matched).toBe(false);
      expect(prisma.swipeMatch.upsert).not.toHaveBeenCalled();
    });

    it('should not create match if other user PASSed', async () => {
      prisma.swipeAction.findUnique.mockResolvedValue({
        id: 'sa_2',
        userId: 'worker_1',
        targetId: 'user_1',
        action: 'PASS',
      });

      const result = await service.recordSwipe('user_1', 'worker_1', 'LIKE');

      expect(result.matched).toBe(false);
    });

    it('should create match on mutual SUPERLIKE', async () => {
      prisma.swipeAction.findUnique.mockResolvedValue({
        id: 'sa_2',
        userId: 'worker_1',
        targetId: 'user_1',
        action: 'SUPERLIKE',
      });

      const result = await service.recordSwipe('user_1', 'worker_1', 'LIKE');

      expect(result.matched).toBe(true);
    });
  });

  describe('getMatches', () => {
    it('should return matches with other user details', async () => {
      prisma.swipeMatch.findMany.mockResolvedValue([
        {
          id: 'sm_1',
          userAId: 'user_1',
          userBId: 'worker_1',
          matchedAt: new Date(),
          status: 'active',
        },
      ]);

      const result = await service.getMatches('user_1');

      expect(result).toHaveLength(1);
      const first = result[0] as any;
      expect(first.otherUser.id).toBe('worker_1');
      expect(first.matchId).toBe('sm_1');
    });
  });
});
