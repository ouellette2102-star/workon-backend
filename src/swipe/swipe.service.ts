import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Swipe Discovery Service
 *
 * Handles candidate discovery, swipe actions, and match creation.
 *
 * Discovery logic:
 * - MAP = find work (missions/opportunities)
 * - SWIPE = find talent (workers/companies)
 *
 * Matching: a match occurs when two users mutually LIKE each other.
 */
@Injectable()
export class SwipeService {
  private readonly logger = new Logger(SwipeService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get swipe candidates (workers/companies) for a user
   * Excludes: already swiped users, self, inactive users
   */
  async getCandidates(
    userId: string,
    filters?: {
      role?: string;
      category?: string;
      lat?: number;
      lng?: number;
      radiusKm?: number;
      minRating?: number;
    },
  ) {
    // Get IDs already swiped by this user
    const alreadySwiped = await this.prisma.swipeAction.findMany({
      where: { swiperId: userId },
      select: { candidateId: true },
    });
    const excludeIds = [userId, ...alreadySwiped.map((s) => s.candidateId)];

    // Build where clause
    const where: any = {
      id: { notIn: excludeIds },
      active: true,
    };

    if (filters?.role) {
      where.role = filters.role;
    }

    if (filters?.category) {
      where.category = filters.category;
    }

    const candidates = await this.prisma.localUser.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        city: true,
        latitude: true,
        longitude: true,
        role: true,
        category: true,
        bio: true,
        pictureUrl: true,
        trustTier: true,
        completionScore: true,
        receivedReviews: {
          select: { rating: true },
          where: { moderation: 'OK' },
        },
      },
      take: 40, // Fetch more, then rank and trim
      orderBy: [{ completionScore: 'desc' }, { createdAt: 'desc' }],
    });

    // Compute average rating and enrich candidates
    let enriched = candidates.map((c) => {
      const reviews = c.receivedReviews || [];
      const avgRating = reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0;
      const { receivedReviews, ...rest } = c;
      return { ...rest, avgRating: Math.round(avgRating * 10) / 10, reviewCount: reviews.length };
    });

    // Filter by minimum rating
    if (filters?.minRating) {
      enriched = enriched.filter((c) => c.avgRating >= filters.minRating!);
    }

    // Filter by geo distance
    if (filters?.lat && filters?.lng && filters?.radiusKm) {
      enriched = enriched.filter((c) => {
        if (!c.latitude || !c.longitude) return false;
        const dist = this.haversineDistance(
          filters.lat!,
          filters.lng!,
          c.latitude,
          c.longitude,
        );
        return dist <= filters.radiusKm!;
      });
    }

    // Sort by composite score: rating weight + completionScore
    enriched.sort((a, b) => {
      const scoreA = (a.avgRating * 20) + (a.completionScore || 0);
      const scoreB = (b.avgRating * 20) + (b.completionScore || 0);
      return scoreB - scoreA;
    });

    return enriched.slice(0, 20);
  }

  /**
   * Record a swipe action (LIKE, PASS, SUPERLIKE)
   * If mutual LIKE, creates a SwipeMatch
   */
  async recordSwipe(swiperId: string, candidateId: string, action: string) {
    if (swiperId === candidateId) {
      throw new BadRequestException('Cannot swipe yourself');
    }

    // Upsert swipe action (prevent duplicates)
    await this.prisma.swipeAction.upsert({
      where: {
        swiperId_candidateId: { swiperId, candidateId },
      },
      create: {
        swiperId,
        candidateId,
        action: action as any,
      },
      update: {
        action: action as any,
      },
    });

    // Check for mutual match (both LIKE or SUPERLIKE)
    if (action === 'LIKE' || action === 'SUPERLIKE') {
      const reciprocal = await this.prisma.swipeAction.findUnique({
        where: {
          swiperId_candidateId: {
            swiperId: candidateId,
            candidateId: swiperId,
          },
        },
      });

      if (reciprocal && (reciprocal.action === 'LIKE' || reciprocal.action === 'SUPERLIKE')) {
        // Mutual match! Create or find existing match
        const [userId1, userId2] = [swiperId, candidateId].sort();

        const match = await this.prisma.swipeMatch.upsert({
          where: {
            userId1_userId2: { userId1, userId2 },
          },
          create: { userId1, userId2 },
          update: {},
        });

        this.logger.log(`Match created: ${match.id} between ${userId1} and ${userId2}`);

        // Notify both users of the match
        await this.notifyMatch(swiperId, candidateId, match.id);

        return { action, matched: true, matchId: match.id };
      }
    }

    return { action, matched: false };
  }

  /**
   * Get all active matches for a user
   */
  async getMatches(userId: string) {
    const matches = await this.prisma.swipeMatch.findMany({
      where: {
        OR: [{ userId1: userId }, { userId2: userId }],
        status: 'ACTIVE',
      },
      include: {
        user1: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            city: true,
            pictureUrl: true,
            role: true,
            category: true,
          },
        },
        user2: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            city: true,
            pictureUrl: true,
            role: true,
            category: true,
          },
        },
      },
      orderBy: { matchedAt: 'desc' },
    });

    // Return the "other" user for each match
    return matches.map((m) => ({
      matchId: m.id,
      matchedAt: m.matchedAt,
      status: m.status,
      otherUser: m.userId1 === userId ? m.user2 : m.user1,
    }));
  }

  /**
   * Haversine distance in km between two coordinates
   */
  private haversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371;
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  /**
   * Log match notification intent for both users.
   *
   * NOTE: The Notification model currently only supports Clerk User FK.
   * Once Notification supports LocalUser, this should create real
   * notification records + push notifications. For now, logs the intent
   * so the match event is traceable.
   */
  private async notifyMatch(userId1: string, userId2: string, matchId: string) {
    try {
      const [user1, user2] = await Promise.all([
        this.prisma.localUser.findUnique({ where: { id: userId1 }, select: { firstName: true } }),
        this.prisma.localUser.findUnique({ where: { id: userId2 }, select: { firstName: true } }),
      ]);

      this.logger.log(
        `MATCH_NOTIFICATION: match=${matchId} ` +
        `user1=${userId1}(${user1?.firstName}) ` +
        `user2=${userId2}(${user2?.firstName}) ` +
        `— notification pending Notification model LocalUser support`,
      );
    } catch (error) {
      this.logger.warn(`Failed to log match notification: ${error}`);
    }
  }
}
