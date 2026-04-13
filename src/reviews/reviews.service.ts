import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import {
  ReviewResponseDto,
  RatingSummaryDto,
  ReviewAuthorDto,
} from './dto/review-response.dto';
import { ReputationService } from '../reputation/reputation.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly reputationService: ReputationService,
  ) {}

  /**
   * Creates a new review.
   */
  async create(
    authorId: string,
    dto: CreateReviewDto,
  ): Promise<ReviewResponseDto> {
    // Verify target user exists (try LocalUser first, then legacy User)
    const localTarget = await this.prisma.localUser.findUnique({
      where: { id: dto.toUserId },
    });
    const legacyTarget = localTarget ? null : await this.prisma.user.findUnique({
      where: { id: dto.toUserId },
    });

    if (!localTarget && !legacyTarget) {
      throw new NotFoundException('Utilisateur cible non trouvé');
    }

    // Prevent self-review
    if (authorId === dto.toUserId) {
      throw new BadRequestException(
        'Vous ne pouvez pas vous évaluer vous-même',
      );
    }

    // Mission is required — only participants can leave reviews
    if (!dto.missionId) {
      throw new BadRequestException(
        'Un missionId est requis. Seuls les participants de mission peuvent laisser un avis.',
      );
    }

    // Try LocalMission first, then legacy Mission
    const localMission = await this.prisma.localMission.findUnique({
      where: { id: dto.missionId },
      select: { id: true, status: true, createdByUserId: true, assignedToUserId: true },
    });
    const legacyMission = localMission ? null : await this.prisma.mission.findUnique({
      where: { id: dto.missionId },
      select: { id: true, status: true, authorClientId: true, assigneeWorkerId: true },
    });

    const mission = localMission || legacyMission;
    if (!mission) {
      throw new NotFoundException('Mission non trouvée');
    }

    // Normalize field names
    const creatorId = (mission as any).createdByUserId || (mission as any).authorClientId;
    const workerId = (mission as any).assignedToUserId || (mission as any).assigneeWorkerId;
    const missionStatus = mission.status;

    // Mission must be completed
    if (missionStatus !== 'COMPLETED' && missionStatus !== 'completed' && missionStatus !== 'paid') {
      throw new BadRequestException(
        'Impossible de laisser un avis avant la complétion de la mission',
      );
    }

    // Author must be a participant
    const isParticipant = creatorId === authorId || workerId === authorId;

    if (!isParticipant) {
      throw new ForbiddenException(
        'Seuls les participants de la mission peuvent laisser un avis',
      );
    }

    // Target must be the OTHER participant
    const isTargetParticipant = creatorId === dto.toUserId || workerId === dto.toUserId;

    if (!isTargetParticipant) {
      throw new BadRequestException(
        'Vous ne pouvez évaluer que l\'autre participant de la mission',
      );
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

    // Recompute reputation for the target user. If the legacy review does
    // not reference a LocalUser, the recompute will be a no-op.
    try {
      await this.reputationService.recomputeForLocalUser(dto.toUserId);
    } catch (err) {
      this.logger.warn(
        `Failed to recompute reputation for ${dto.toUserId}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

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

