import { Test, TestingModule } from '@nestjs/testing';
import { ReputationService } from './reputation.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ReputationService', () => {
  let service: ReputationService;

  const mockPrisma = {
    localUser: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    review: {
      aggregate: jest.fn(),
    },
    localMission: {
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReputationService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ReputationService>(ReputationService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('computeTrustScore', () => {
    it('returns 0 for a user with nothing', () => {
      const score = service.computeTrustScore({
        phoneVerified: false,
        idVerified: false,
        bankVerified: false,
        insuranceVerified: false,
        ratingAverage: null,
        reviewCount: 0,
        completedCount: 0,
      });
      expect(score).toBe(0);
    });

    it('awards full verification block (40) when all verifications are present', () => {
      const score = service.computeTrustScore({
        phoneVerified: true,
        idVerified: true,
        bankVerified: true,
        insuranceVerified: true,
        ratingAverage: null,
        reviewCount: 0,
        completedCount: 0,
      });
      expect(score).toBe(40);
    });

    it('returns 100 for a fully verified top-rated experienced user', () => {
      const score = service.computeTrustScore({
        phoneVerified: true,
        idVerified: true,
        bankVerified: true,
        insuranceVerified: true,
        ratingAverage: 5,
        reviewCount: 20,
        completedCount: 25,
      });
      expect(score).toBe(100);
    });

    it('plateaus volume at 10 completed missions', () => {
      const scoreAtTen = service.computeTrustScore({
        phoneVerified: false,
        idVerified: false,
        bankVerified: false,
        insuranceVerified: false,
        ratingAverage: null,
        reviewCount: 0,
        completedCount: 10,
      });
      const scoreAtFifty = service.computeTrustScore({
        phoneVerified: false,
        idVerified: false,
        bankVerified: false,
        insuranceVerified: false,
        ratingAverage: null,
        reviewCount: 0,
        completedCount: 50,
      });
      expect(scoreAtTen).toBe(15);
      expect(scoreAtFifty).toBe(15);
    });

    it('clamps rating above 5 and below 0', () => {
      const over = service.computeTrustScore({
        phoneVerified: false,
        idVerified: false,
        bankVerified: false,
        insuranceVerified: false,
        ratingAverage: 10,
        reviewCount: 1,
        completedCount: 0,
      });
      expect(over).toBe(Math.round((35 + 1) * 10) / 10);
    });

    it('is monotonic: adding a verification never decreases the score', () => {
      const base = service.computeTrustScore({
        phoneVerified: false,
        idVerified: true,
        bankVerified: false,
        insuranceVerified: false,
        ratingAverage: 4,
        reviewCount: 3,
        completedCount: 2,
      });
      const plusPhone = service.computeTrustScore({
        phoneVerified: true,
        idVerified: true,
        bankVerified: false,
        insuranceVerified: false,
        ratingAverage: 4,
        reviewCount: 3,
        completedCount: 2,
      });
      expect(plusPhone).toBeGreaterThanOrEqual(base);
    });
  });

  describe('recomputeForLocalUser', () => {
    it('is a no-op when the user does not exist', async () => {
      mockPrisma.localUser.findUnique.mockResolvedValue(null);
      await service.recomputeForLocalUser('ghost');
      expect(mockPrisma.localUser.update).not.toHaveBeenCalled();
    });

    it('writes aggregates + trustScore for an existing user', async () => {
      mockPrisma.localUser.findUnique.mockResolvedValue({
        id: 'u1',
        phoneVerified: true,
        idVerificationStatus: 'VERIFIED',
        bankVerified: false,
        insuranceVerified: false,
      });
      mockPrisma.review.aggregate.mockResolvedValue({
        _avg: { rating: 4.5 },
        _count: { _all: 6 },
      });
      mockPrisma.localMission.count.mockResolvedValue(4);

      await service.recomputeForLocalUser('u1');

      expect(mockPrisma.localUser.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'u1' },
          data: expect.objectContaining({
            ratingAverage: 4.5,
            reviewCount: 6,
            completedMissionsCount: 4,
            trustScore: expect.any(Number),
            trustScoreUpdatedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('handles users with no reviews (null rating, zero counts)', async () => {
      mockPrisma.localUser.findUnique.mockResolvedValue({
        id: 'u2',
        phoneVerified: false,
        idVerificationStatus: 'PENDING',
        bankVerified: false,
        insuranceVerified: false,
      });
      mockPrisma.review.aggregate.mockResolvedValue({
        _avg: { rating: null },
        _count: { _all: 0 },
      });
      mockPrisma.localMission.count.mockResolvedValue(0);

      await service.recomputeForLocalUser('u2');

      expect(mockPrisma.localUser.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ratingAverage: null,
            reviewCount: 0,
            completedMissionsCount: 0,
            trustScore: 0,
          }),
        }),
      );
    });
  });

  describe('getReputation', () => {
    it('returns the selected reputation block', async () => {
      const block = {
        id: 'u1',
        trustTier: 'VERIFIED',
        trustScore: 72.5,
        ratingAverage: 4.5,
        reviewCount: 6,
      };
      mockPrisma.localUser.findUnique.mockResolvedValue(block);
      const out = await service.getReputation('u1');
      expect(out).toBe(block);
    });
  });
});
