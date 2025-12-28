import { Test, TestingModule } from '@nestjs/testing';
import { RatingsService } from './ratings.service';
import { PrismaService } from '../prisma/prisma.service';
import { LocalMissionStatus } from '@prisma/client';
import {
  ConflictException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';

describe('RatingsService', () => {
  let service: RatingsService;
  let prisma: PrismaService;

  const mockEmployer = {
    id: 'employer1',
    firstName: 'Jane',
    lastName: 'Employer',
  };

  const mockWorker = {
    id: 'worker1',
    firstName: 'John',
    lastName: 'Worker',
  };

  const mockMissionCompleted = {
    id: 'mission1',
    status: LocalMissionStatus.completed,
    createdByUserId: 'employer1',
    assignedToUserId: 'worker1',
  };

  const mockMissionOpen = {
    id: 'mission2',
    status: LocalMissionStatus.open,
    createdByUserId: 'employer1',
    assignedToUserId: null,
  };

  const mockRating = {
    id: 'rating1',
    missionId: 'mission1',
    authorId: 'employer1',
    targetUserId: 'worker1',
    score: 5,
    comment: 'Excellent work!',
    createdAt: new Date(),
    author: {
      id: 'employer1',
      firstName: 'Jane',
      lastName: 'Employer',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RatingsService,
        {
          provide: PrismaService,
          useValue: {
            localMission: {
              findUnique: jest.fn(),
            },
            localUser: {
              findUnique: jest.fn(),
            },
            localRating: {
              findUnique: jest.fn(),
              create: jest.fn(),
              findMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<RatingsService>(RatingsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a rating successfully (employer rates worker)', async () => {
      jest
        .spyOn(prisma.localMission, 'findUnique')
        .mockResolvedValue(mockMissionCompleted as any);
      jest.spyOn(prisma.localRating, 'findUnique').mockResolvedValue(null);
      jest
        .spyOn(prisma.localRating, 'create')
        .mockResolvedValue(mockRating as any);

      const result = await service.create('employer1', {
        missionId: 'mission1',
        targetUserId: 'worker1',
        score: 5,
        comment: 'Excellent work!',
      });

      expect(result).toEqual(mockRating);
      expect(prisma.localRating.create).toHaveBeenCalledWith({
        data: {
          missionId: 'mission1',
          authorId: 'employer1',
          targetUserId: 'worker1',
          score: 5,
          comment: 'Excellent work!',
        },
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });
    });

    it('should create a rating successfully (worker rates employer)', async () => {
      jest
        .spyOn(prisma.localMission, 'findUnique')
        .mockResolvedValue(mockMissionCompleted as any);
      jest.spyOn(prisma.localRating, 'findUnique').mockResolvedValue(null);

      const workerRating = {
        ...mockRating,
        authorId: 'worker1',
        targetUserId: 'employer1',
      };
      jest
        .spyOn(prisma.localRating, 'create')
        .mockResolvedValue(workerRating as any);

      const result = await service.create('worker1', {
        missionId: 'mission1',
        targetUserId: 'employer1',
        score: 4,
      });

      expect(result.authorId).toBe('worker1');
      expect(result.targetUserId).toBe('employer1');
    });

    it('should throw BadRequestException when rating yourself', async () => {
      await expect(
        service.create('user1', {
          missionId: 'mission1',
          targetUserId: 'user1',
          score: 5,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when mission not found', async () => {
      jest.spyOn(prisma.localMission, 'findUnique').mockResolvedValue(null);

      await expect(
        service.create('employer1', {
          missionId: 'nonexistent',
          targetUserId: 'worker1',
          score: 5,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when mission not completed', async () => {
      jest
        .spyOn(prisma.localMission, 'findUnique')
        .mockResolvedValue(mockMissionOpen as any);

      await expect(
        service.create('employer1', {
          missionId: 'mission2',
          targetUserId: 'worker1',
          score: 5,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when author not involved in mission', async () => {
      jest
        .spyOn(prisma.localMission, 'findUnique')
        .mockResolvedValue(mockMissionCompleted as any);

      await expect(
        service.create('randomUser', {
          missionId: 'mission1',
          targetUserId: 'worker1',
          score: 5,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when target not other party', async () => {
      jest
        .spyOn(prisma.localMission, 'findUnique')
        .mockResolvedValue(mockMissionCompleted as any);

      // Employer trying to rate someone who is not the worker
      await expect(
        service.create('employer1', {
          missionId: 'mission1',
          targetUserId: 'randomUser',
          score: 5,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException when rating already exists', async () => {
      jest
        .spyOn(prisma.localMission, 'findUnique')
        .mockResolvedValue(mockMissionCompleted as any);
      jest
        .spyOn(prisma.localRating, 'findUnique')
        .mockResolvedValue(mockRating as any);

      await expect(
        service.create('employer1', {
          missionId: 'mission1',
          targetUserId: 'worker1',
          score: 5,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findByUser', () => {
    it('should return ratings for a user', async () => {
      jest
        .spyOn(prisma.localUser, 'findUnique')
        .mockResolvedValue(mockWorker as any);
      jest
        .spyOn(prisma.localRating, 'findMany')
        .mockResolvedValue([mockRating, { ...mockRating, id: 'rating2', score: 4 }] as any);

      const result = await service.findByUser('worker1');

      expect(result.ratings).toHaveLength(2);
      expect(result.averageScore).toBe(4.5);
      expect(result.totalCount).toBe(2);
    });

    it('should return empty array for user with no ratings', async () => {
      jest
        .spyOn(prisma.localUser, 'findUnique')
        .mockResolvedValue(mockWorker as any);
      jest.spyOn(prisma.localRating, 'findMany').mockResolvedValue([]);

      const result = await service.findByUser('worker1');

      expect(result.ratings).toHaveLength(0);
      expect(result.averageScore).toBe(0);
      expect(result.totalCount).toBe(0);
    });

    it('should throw NotFoundException when user not found', async () => {
      jest.spyOn(prisma.localUser, 'findUnique').mockResolvedValue(null);

      await expect(service.findByUser('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findMyRatings', () => {
    it('should return ratings for current user', async () => {
      jest
        .spyOn(prisma.localUser, 'findUnique')
        .mockResolvedValue(mockWorker as any);
      jest
        .spyOn(prisma.localRating, 'findMany')
        .mockResolvedValue([mockRating] as any);

      const result = await service.findMyRatings('worker1');

      expect(result.ratings).toHaveLength(1);
      expect(result.totalCount).toBe(1);
    });
  });
});

