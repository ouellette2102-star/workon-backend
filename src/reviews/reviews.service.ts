import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import {
  ReviewResponseDto,
  RatingSummaryDto,
  ReviewAuthorDto,
} from './dto/review-response.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a new review.
   */
  async create(
    authorId: string,
    dto: CreateReviewDto,
  ): Promise<ReviewResponseDto> {
    // Verify target user exists
    const targetUser = await this.prisma.user.findUnique({
      where: { id: dto.toUserId },
    });

    if (!targetUser) {
      throw new NotFoundException('Utilisateur cible non trouvé');
    }

    // Prevent self-review
    if (authorId === dto.toUserId) {
      throw new BadRequestException(
        'Vous ne pouvez pas vous évaluer vous-même',
      );
    }

    // If missionId provided, verify mission exists and is completed
    if (dto.missionId) {
      const mission = await this.prisma.mission.findUnique({
        where: { id: dto.missionId },
      });

      if (!mission) {
        throw new NotFoundException('Mission non trouvée');
      }

      // Check for duplicate review on same mission
      const existingReview = await this.prisma.review.findFirst({
        where: {
          authorId,
          targetUserId: dto.toUserId,
          missionId: dto.missionId,
        },
      });

      if (existingReview) {
        throw new ConflictException(
          'Vous avez déjà laissé un avis pour cette mission',
        );
      }
    }

    const review = await this.prisma.review.create({
      data: {
        id: uuidv4(),
        authorId,
        targetUserId: dto.toUserId,
        missionId: dto.missionId,
        rating: dto.rating,
        comment: dto.comment,
        updatedAt: new Date(),
      },
      include: {
        author: {
          select: {
            id: true,
            userProfile: {
              select: { name: true },
            },
          },
        },
      },
    });

    return this.mapToResponse(review);
  }

  /**
   * Gets reviews for a user.
   */
  async getReviewsForUser(
    userId: string,
    limit?: number,
    offset?: number,
  ): Promise<ReviewResponseDto[]> {
    const reviews = await this.prisma.review.findMany({
      where: {
        targetUserId: userId,
        moderation: 'OK',
      },
      orderBy: { createdAt: 'desc' },
      take: limit ?? 50,
      skip: offset ?? 0,
      include: {
        author: {
          select: {
            id: true,
            userProfile: {
              select: { name: true },
            },
          },
        },
      },
    });

    return reviews.map((r) => this.mapToResponse(r));
  }

  /**
   * Gets rating summary for a user.
   */
  async getSummaryForUser(userId: string): Promise<RatingSummaryDto> {
    const reviews = await this.prisma.review.findMany({
      where: {
        targetUserId: userId,
        moderation: 'OK',
      },
      select: { rating: true },
    });

    if (reviews.length === 0) {
      return {
        average: 0,
        count: 0,
        distribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
      };
    }

    const distribution: Record<string, number> = {
      '1': 0,
      '2': 0,
      '3': 0,
      '4': 0,
      '5': 0,
    };

    let total = 0;
    for (const r of reviews) {
      total += r.rating;
      distribution[String(r.rating)]++;
    }

    return {
      average: Math.round((total / reviews.length) * 10) / 10,
      count: reviews.length,
      distribution,
    };
  }

  /**
   * Gets a single review by ID.
   */
  async findOne(id: string): Promise<ReviewResponseDto> {
    const review = await this.prisma.review.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            userProfile: {
              select: { name: true },
            },
          },
        },
      },
    });

    if (!review) {
      throw new NotFoundException('Avis non trouvé');
    }

    return this.mapToResponse(review);
  }

  private mapToResponse(review: {
    id: string;
    rating: number;
    comment: string | null;
    createdAt: Date;
    authorId: string;
    missionId: string | null;
    author?: {
      id: string;
      userProfile?: { name: string } | null;
    } | null;
  }): ReviewResponseDto {
    const author: ReviewAuthorDto | undefined = review.author
      ? {
          id: review.author.id,
          fullName: review.author.userProfile?.name ?? undefined,
        }
      : undefined;

    return {
      id: review.id,
      rating: review.rating,
      comment: review.comment ?? undefined,
      createdAt: review.createdAt,
      authorId: review.authorId,
      author,
      missionId: review.missionId ?? undefined,
    };
  }
}

