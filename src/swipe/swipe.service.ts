import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from '../push/push.service';
import { DevicesService } from '../devices/devices.service';

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

  constructor(
    private readonly prisma: PrismaService,
    private readonly pushService: PushService,
    private readonly devicesService: DevicesService,
  ) {}

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
      where: { userId },
      select: { targetId: true },
    });
    const excludeIds = [userId, ...alreadySwiped.map((s) => s.targetId)];

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
        trustScore: true,
        completionScore: true,
        ratingAverage: true,
        reviewCount: true,
      },
      take: 40,
      orderBy: [{ createdAt: 'desc' }],
    });

    // Enrich candidates with rating data from DB fields
    let enriched = candidates.map((c) => {
      const { ratingAverage, reviewCount, ...rest } = c;
      return {
        ...rest,
        avgRating: ratingAverage ?? 0,
        reviewCount: reviewCount ?? 0,
      };
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

    // Sort by composite score: rating (0-100) + completionScore + trustScore.
    // trustScore (0-100) reflects verification depth + volume and prevents
    // unverified high-rated accounts from dominating brand-new users.
    enriched.sort((a, b) => {
      const scoreA =
        a.avgRating * 20 + (a.completionScore || 0) + (a.trustScore || 0);
      const scoreB =
        b.avgRating * 20 + (b.completionScore || 0) + (b.trustScore || 0);
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
        userId_targetId: { userId: swiperId, targetId: candidateId },
      },
      create: {
        userId: swiperId,
        targetId: candidateId,
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
          userId_targetId: {
            userId: candidateId,
            targetId: swiperId,
          },
        },
      });

      if (reciprocal && (reciprocal.action === 'LIKE' || reciprocal.action === 'SUPERLIKE')) {
        // Mutual match! Create or find existing match
        const [userAId, userBId] = [swiperId, candidateId].sort();

        const match = await this.prisma.swipeMatch.upsert({
          where: {
            userAId_userBId: { userAId, userBId },
          },
          create: { userAId, userBId },
          update: {},
        });

        this.logger.log(`Match created: ${match.id} between ${userAId} and ${userBId}`);

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
        OR: [{ userAId: userId }, { userBId: userId }],
        status: 'active',
      },
      orderBy: { matchedAt: 'desc' },
    });

    // Collect other-user IDs and fetch their profiles
    const otherUserIds = matches.map((m) =>
      m.userAId === userId ? m.userBId : m.userAId,
    );

    const users = await this.prisma.localUser.findMany({
      where: { id: { in: otherUserIds } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        city: true,
        pictureUrl: true,
        role: true,
        category: true,
      },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    // Return the "other" user for each match
    return matches.map((m) => {
      const otherId = m.userAId === userId ? m.userBId : m.userAId;
      return {
        matchId: m.id,
        matchedAt: m.matchedAt,
        status: m.status,
        otherUser: userMap.get(otherId) || null,
      };
    });
  }

  /**
   * Create a mission from a match
   * The authenticated user becomes the employer, the matched user becomes the worker.
   */
  async createMissionFromMatch(
    userId: string,
    matchId: string,
    data: { title: string; description?: string; category: string; price: number },
  ) {
    // Find the match and verify the user is part of it
    const match = await this.prisma.swipeMatch.findUnique({
      where: { id: matchId },
    });

    if (!match || (match.userAId !== userId && match.userBId !== userId)) {
      throw new NotFoundException('Match not found');
    }

    if (match.status !== 'active') {
      throw new BadRequestException('Match is no longer active');
    }

    const workerId = match.userAId === userId ? match.userBId : match.userAId;

    // Fetch employer geolocation
    const employer = await this.prisma.localUser.findUnique({
      where: { id: userId },
      select: { latitude: true, longitude: true, city: true },
    });

    const missionId = `lm_sw_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    const mission = await this.prisma.localMission.create({
      data: {
        id: missionId,
        title: data.title,
        description: data.description || `Mission créée depuis match ${matchId}`,
        category: data.category,
        price: data.price,
        latitude: employer?.latitude ?? 0,
        longitude: employer?.longitude ?? 0,
        city: employer?.city ?? '',
        createdByUserId: userId,
        assignedToUserId: workerId,
        status: 'assigned',
        updatedAt: new Date(),
      },
    });

    // Mark match as converted
    await this.prisma.swipeMatch.update({
      where: { id: matchId },
      data: { status: 'converted' },
    });

    this.logger.log(`Mission ${missionId} created from match ${matchId} (${userId} → ${workerId})`);

    return {
      missionId: mission.id,
      matchId,
      workerId,
      status: 'assigned',
    };
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
   * Create in-app notifications for both users on match.
   * Uses userId FK on Notification model (references User table).
   */
  private async notifyMatch(userId1: string, userId2: string, matchId: string) {
    try {
      const [user1, user2] = await Promise.all([
        this.prisma.localUser.findUnique({ where: { id: userId1 }, select: { firstName: true } }),
        this.prisma.localUser.findUnique({ where: { id: userId2 }, select: { firstName: true } }),
      ]);

      const notifications = [
        {
          id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          userId: userId1,
          type: 'swipe_match',
          payloadJSON: {
            matchId,
            matchedUserId: userId2,
            matchedUserName: user2?.firstName || 'Utilisateur',
            message: `Vous avez un match avec ${user2?.firstName || 'un utilisateur'}!`,
          },
        },
        {
          id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}a`,
          userId: userId2,
          type: 'swipe_match',
          payloadJSON: {
            matchId,
            matchedUserId: userId1,
            matchedUserName: user1?.firstName || 'Utilisateur',
            message: `Vous avez un match avec ${user1?.firstName || 'un utilisateur'}!`,
          },
        },
      ];

      for (const notif of notifications) {
        await this.prisma.notification.create({ data: notif }).catch(() => {
          // FK constraint may fail if userId doesn't exist in User table
          // In that case, log and continue
          this.logger.warn(`Notification FK failed for ${notif.userId}, logging instead`);
        });
      }

      this.logger.log(`Match notifications created for match ${matchId}`);

      // Send FCM push notifications to both users
      for (const uid of [userId1, userId2]) {
        const otherName = uid === userId1
          ? (user2?.firstName || 'Utilisateur')
          : (user1?.firstName || 'Utilisateur');
        try {
          const tokens = await this.devicesService.getPushTokensForUser(uid);
          if (tokens.length > 0) {
            await this.pushService.sendNotification(
              tokens,
              'Nouveau match!',
              `Vous avez un match avec ${otherName}`,
              { type: 'swipe_match', matchId },
            );
          }
        } catch {
          // Push is best-effort
        }
      }
    } catch (error) {
      this.logger.warn(`Failed to create match notifications: ${error}`);
    }
  }
}
