import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async createReview(authorId: string, dto: CreateReviewDto) {
    if (dto.rating < 1 || dto.rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    if (dto.missionId) {
      const mission = await this.prisma.localMission.findUnique({
        where: { id: dto.missionId },
        select: { id: true },
      });
      if (!mission) {
        throw new NotFoundException('Mission not found');
      }
    }

    const targetUser = await this.prisma.localUser.findUnique({
      where: { id: dto.toUserId },
      select: { id: true },
    });
    if (!targetUser) {
      throw new NotFoundException('Target user not found');
    }

    const review = await this.prisma.localReview.create({
      data: {
        id: `rev_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        authorId,
        targetUserId: dto.toUserId,
        missionId: dto.missionId ?? null,
        rating: dto.rating,
        comment: dto.comment ?? null,
        tags: dto.tags ?? [],
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            pictureUrl: true,
          },
        },
        mission: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    return this.mapReview(review);
  }

  async getReviewsForUser(targetUserId: string, limit?: number, offset?: number) {
    const reviews = await this.prisma.localReview.findMany({
      where: { targetUserId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            pictureUrl: true,
          },
        },
        mission: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    return reviews.map((review) => this.mapReview(review));
  }

  async getSummaryForUser(targetUserId: string) {
    const [count, avg, distribution] = await Promise.all([
      this.prisma.localReview.count({ where: { targetUserId } }),
      this.prisma.localReview.aggregate({
        where: { targetUserId },
        _avg: { rating: true },
      }),
      this.prisma.localReview.groupBy({
        by: ['rating'],
        where: { targetUserId },
        _count: { rating: true },
      }),
    ]);

    const breakdown: Record<number, number> = {};
    for (const row of distribution) {
      breakdown[row.rating] = row._count.rating;
    }

    return {
      average: Number((avg._avg.rating ?? 0).toFixed(2)),
      count,
      distribution: breakdown,
    };
  }

  private mapReview(review: any) {
    const authorName = [review.author?.firstName, review.author?.lastName]
      .filter(Boolean)
      .join(' ')
      .trim();

    return {
      id: review.id,
      rating: review.rating,
      createdAt: review.createdAt,
      author: review.author
        ? {
            id: review.author.id,
            fullName: authorName || 'Utilisateur',
            avatarUrl: review.author.pictureUrl,
          }
        : null,
      comment: review.comment,
      tags: review.tags ?? [],
      missionId: review.mission?.id ?? review.missionId,
      missionTitle: review.mission?.title ?? null,
    };
  }
}

