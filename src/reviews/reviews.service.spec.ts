import { Test, TestingModule } from '@nestjs/testing';
import { ReviewsService } from './reviews.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mocked-uuid'),
}));

describe('ReviewsService', () => {
  let service: ReviewsService;
  let prisma: PrismaService;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
    },
    mission: {
      findUnique: jest.fn(),
    },
    review: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  const mockUser = {
    id: 'user_123',
    clerkId: 'clerk_abc',
  };

  const mockMission = {
    id: 'mission_1',
    title: 'Test Mission',
    status: 'completed',
  };

  const mockReview = {
    id: 'review_1',
    rating: 5,
    comment: 'Great work!',
    createdAt: new Date(),
    authorId: 'author_1',
    targetUserId: 'user_123',
    missionId: 'mission_1',
    author: {
      id: 'author_1',
      userProfile: { name: 'John Reviewer' },
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ReviewsService>(ReviewsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a review successfully', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.mission.findUnique.mockResolvedValue(mockMission);
      mockPrisma.review.findFirst.mockResolvedValue(null);
      mockPrisma.review.create.mockResolvedValue(mockReview);

      const result = await service.create('author_1', {
        toUserId: 'user_123',
        rating: 5,
        comment: 'Great work!',
        missionId: 'mission_1',
      });

      expect(result.id).toBe('review_1');
      expect(result.rating).toBe(5);
      expect(result.comment).toBe('Great work!');
    });

    it('should throw NotFoundException when target user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.create('author_1', {
          toUserId: 'nonexistent',
          rating: 5,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for self-review', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.create('user_123', {
          toUserId: 'user_123',
          rating: 5,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when mission not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.mission.findUnique.mockResolvedValue(null);

      await expect(
        service.create('author_1', {
          toUserId: 'user_123',
          rating: 5,
          missionId: 'nonexistent_mission',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException for duplicate review', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.mission.findUnique.mockResolvedValue(mockMission);
      mockPrisma.review.findFirst.mockResolvedValue(mockReview);

      await expect(
        service.create('author_1', {
          toUserId: 'user_123',
          rating: 5,
          missionId: 'mission_1',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should create review without mission', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.review.create.mockResolvedValue({
        ...mockReview,
        missionId: null,
      });

      const result = await service.create('author_1', {
        toUserId: 'user_123',
        rating: 4,
      });

      expect(result).toBeDefined();
      expect(mockPrisma.mission.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('getReviewsForUser', () => {
    it('should return reviews for user', async () => {
      mockPrisma.review.findMany.mockResolvedValue([mockReview]);

      const result = await service.getReviewsForUser('user_123');

      expect(result).toHaveLength(1);
      expect(result[0].rating).toBe(5);
    });

    it('should return empty array when no reviews', async () => {
      mockPrisma.review.findMany.mockResolvedValue([]);

      const result = await service.getReviewsForUser('user_123');

      expect(result).toHaveLength(0);
    });

    it('should respect limit and offset', async () => {
      mockPrisma.review.findMany.mockResolvedValue([mockReview]);

      await service.getReviewsForUser('user_123', 10, 5);

      expect(mockPrisma.review.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 5,
        }),
      );
    });
  });

  describe('getSummaryForUser', () => {
    it('should return rating summary', async () => {
      mockPrisma.review.findMany.mockResolvedValue([
        { rating: 5 },
        { rating: 4 },
        { rating: 5 },
        { rating: 3 },
      ]);

      const result = await service.getSummaryForUser('user_123');

      expect(result.count).toBe(4);
      expect(result.average).toBe(4.3); // (5+4+5+3)/4 = 4.25 rounded to 4.3
      expect(result.distribution).toBeDefined();
      expect(result.distribution!['5']).toBe(2);
      expect(result.distribution!['4']).toBe(1);
      expect(result.distribution!['3']).toBe(1);
    });

    it('should return zero summary when no reviews', async () => {
      mockPrisma.review.findMany.mockResolvedValue([]);

      const result = await service.getSummaryForUser('user_123');

      expect(result.count).toBe(0);
      expect(result.average).toBe(0);
      expect(result.distribution).toBeDefined();
      expect(result.distribution).toEqual({
        '1': 0,
        '2': 0,
        '3': 0,
        '4': 0,
        '5': 0,
      });
    });

    it('should calculate correct distribution', async () => {
      mockPrisma.review.findMany.mockResolvedValue([
        { rating: 1 },
        { rating: 2 },
        { rating: 3 },
        { rating: 4 },
        { rating: 5 },
      ]);

      const result = await service.getSummaryForUser('user_123');

      expect(result.distribution).toBeDefined();
      expect(result.distribution).toEqual({
        '1': 1,
        '2': 1,
        '3': 1,
        '4': 1,
        '5': 1,
      });
    });
  });

  describe('findOne', () => {
    it('should return a single review', async () => {
      mockPrisma.review.findUnique.mockResolvedValue(mockReview);

      const result = await service.findOne('review_1');

      expect(result.id).toBe('review_1');
      expect(result.author?.fullName).toBe('John Reviewer');
    });

    it('should throw NotFoundException when review not found', async () => {
      mockPrisma.review.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should handle review without author profile', async () => {
      mockPrisma.review.findUnique.mockResolvedValue({
        ...mockReview,
        author: {
          id: 'author_1',
          userProfile: null,
        },
      });

      const result = await service.findOne('review_1');

      expect(result.author?.fullName).toBeUndefined();
    });
  });
});
