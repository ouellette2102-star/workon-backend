import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRatingDto } from './dto/create-rating.dto';
import { LocalMissionStatus } from '@prisma/client';

@Injectable()
export class RatingsService {
  private readonly logger = new Logger(RatingsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new rating for a completed mission
   */
  async create(authorId: string, createRatingDto: CreateRatingDto) {
    const { missionId, targetUserId, score, comment } = createRatingDto;

    // 1. Check that author is not rating themselves
    if (authorId === targetUserId) {
      throw new BadRequestException('You cannot rate yourself');
    }

    // 2. Check mission exists and is completed
    const mission = await this.prisma.localMission.findUnique({
      where: { id: missionId },
      select: {
        id: true,
        status: true,
        createdByUserId: true,
        assignedToUserId: true,
      },
    });

    if (!mission) {
      throw new NotFoundException(`Mission with ID ${missionId} not found`);
    }

    if (mission.status !== LocalMissionStatus.completed) {
      throw new ForbiddenException('Ratings can only be submitted for completed missions');
    }

    // 3. Check author is involved in the mission (employer or worker)
    const isEmployer = mission.createdByUserId === authorId;
    const isWorker = mission.assignedToUserId === authorId;

    if (!isEmployer && !isWorker) {
      throw new ForbiddenException('You are not involved in this mission');
    }

    // 4. Check target is the other party in the mission
    const validTarget =
      (isEmployer && targetUserId === mission.assignedToUserId) ||
      (isWorker && targetUserId === mission.createdByUserId);

    if (!validTarget) {
      throw new BadRequestException('Target user is not the other party of this mission');
    }

    // 5. Check no existing rating from this author for this mission
    const existingRating = await this.prisma.localRating.findUnique({
      where: {
        missionId_authorId: {
          missionId,
          authorId,
        },
      },
    });

    if (existingRating) {
      throw new ConflictException('You have already rated this mission');
    }

    // 6. Create the rating
    const rating = await this.prisma.localRating.create({
      data: {
        missionId,
        authorId,
        targetUserId,
        score,
        comment,
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

    this.logger.log(`Rating created: ${rating.id} by ${authorId} for ${targetUserId}`);

    return rating;
  }

  /**
   * Get all ratings received by a user (public)
   */
  async findByUser(userId: string) {
    // Check user exists
    const user = await this.prisma.localUser.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const ratings = await this.prisma.localRating.findMany({
      where: { targetUserId: userId },
      orderBy: { createdAt: 'desc' },
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

    // Calculate average score
    const totalCount = ratings.length;
    const averageScore =
      totalCount > 0
        ? ratings.reduce((sum, r) => sum + r.score, 0) / totalCount
        : 0;

    return {
      ratings,
      averageScore: Math.round(averageScore * 10) / 10, // Round to 1 decimal
      totalCount,
    };
  }

  /**
   * Get all ratings received by the current user (authenticated)
   */
  async findMyRatings(userId: string) {
    return this.findByUser(userId);
  }
}

