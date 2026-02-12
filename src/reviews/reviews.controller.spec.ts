import { Test, TestingModule } from '@nestjs/testing';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

// Mock uuid to avoid ESM issues
jest.mock('uuid', () => ({
  v4: () => 'test-uuid-1234',
}));

describe('ReviewsController', () => {
  let controller: ReviewsController;
  let service: any;

  const mockReview: any = {
    id: 'review-1',
    revieweeUserId: 'user-2',
    reviewerUserId: 'user-1',
    missionId: 'mission-1',
    rating: 5,
    comment: 'Great work!',
    createdAt: new Date(),
  };

  const mockReq = { user: { userId: 'user-1' } };

  beforeEach(async () => {
    const mockService = {
      getSummaryForUser: jest.fn(),
      getReviewsForUser: jest.fn(),
      create: jest.fn(),
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReviewsController],
      providers: [{ provide: ReviewsService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ReviewsController>(ReviewsController);
    service = module.get(ReviewsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSummary', () => {
    it('should return rating summary for user', async () => {
      const summary: any = {
        averageRating: 4.5,
        totalReviews: 10,
        distribution: { 5: 6, 4: 3, 3: 1, 2: 0, 1: 0 },
      };
      service.getSummaryForUser.mockResolvedValue(summary);

      const result = await controller.getSummary('user-2');

      expect(service.getSummaryForUser).toHaveBeenCalledWith('user-2');
      expect(result).toBeDefined();
    });
  });

  describe('getReviews', () => {
    it('should return reviews for user', async () => {
      service.getReviewsForUser.mockResolvedValue([mockReview]);

      const result = await controller.getReviews('user-2');

      expect(service.getReviewsForUser).toHaveBeenCalledWith(
        'user-2',
        undefined,
        undefined,
      );
      expect(result).toHaveLength(1);
    });

    it('should pass limit and offset', async () => {
      service.getReviewsForUser.mockResolvedValue([]);

      await controller.getReviews('user-2', '10', '5');

      expect(service.getReviewsForUser).toHaveBeenCalledWith('user-2', 10, 5);
    });
  });

  describe('create', () => {
    it('should create a review', async () => {
      const createDto = {
        revieweeUserId: 'user-2',
        missionId: 'mission-1',
        rating: 5,
        comment: 'Great work!',
      };
      service.create.mockResolvedValue(mockReview);

      const result = await controller.create(mockReq, createDto as any);

      expect(service.create).toHaveBeenCalledWith('user-1', createDto);
      expect(result.id).toBe('review-1');
    });
  });

  describe('findOne', () => {
    it('should return a review by id', async () => {
      service.findOne.mockResolvedValue(mockReview);

      const result = await controller.findOne('review-1');

      expect(service.findOne).toHaveBeenCalledWith('review-1');
      expect(result.id).toBe('review-1');
    });
  });
});
