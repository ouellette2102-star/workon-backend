import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * ReputationService
 *
 * Materializes reputation aggregates on LocalUser and derives a composite
 * trustScore (0-100). Called from ReviewsService after a review is created
 * and from MissionsLocalService after a mission is completed.
 *
 * Trust score formula (weighted, bounded 0-100):
 *   verification (40)  - 10 phone + 15 id + 10 bank + 5 insurance
 *   rating       (35)  - (average/5) * 35, 0 when no reviews
 *   volume       (15)  - min(completedMissions/10, 1) * 15
 *   reviews      (10)  - min(reviewCount/10, 1) * 10
 *
 * Kept intentionally deterministic and pure so it can be recomputed at any
 * time from DB state alone. No event bus, no eventual consistency races.
 */
@Injectable()
export class ReputationService {
  private readonly logger = new Logger(ReputationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Recompute and persist reputation aggregates for a LocalUser.
   * No-op if the user does not exist (legacy User ids are ignored).
   */
  async recomputeForLocalUser(localUserId: string): Promise<void> {
    const user = await this.prisma.localUser.findUnique({
      where: { id: localUserId },
      select: {
        id: true,
        phoneVerified: true,
        idVerificationStatus: true,
        bankVerified: true,
        insuranceVerified: true,
      },
    });
    if (!user) {
      return;
    }

    // Aggregate visible reviews authored against this local user.
    const reviewAgg = await this.prisma.review.aggregate({
      where: {
        localTargetUserId: localUserId,
        moderation: 'OK' as any,
      },
      _avg: { rating: true },
      _count: { _all: true },
    });

    // Count completed missions where this user was assigned (worker side) or
    // was the creator (client side). We treat both sides as "volume".
    const completedCount = await this.prisma.localMission.count({
      where: {
        status: 'completed',
        OR: [
          { assignedToUserId: localUserId },
          { createdByUserId: localUserId },
        ],
      },
    });

    const ratingAverage = reviewAgg._avg.rating ?? null;
    const reviewCount = reviewAgg._count._all;

    const trustScore = this.computeTrustScore({
      phoneVerified: user.phoneVerified,
      idVerified: user.idVerificationStatus === 'VERIFIED',
      bankVerified: user.bankVerified,
      insuranceVerified: user.insuranceVerified,
      ratingAverage,
      reviewCount,
      completedCount,
    });

    await this.prisma.localUser.update({
      where: { id: localUserId },
      data: {
        ratingAverage,
        reviewCount,
        completedMissionsCount: completedCount,
        trustScore,
        trustScoreUpdatedAt: new Date(),
      },
    });

    this.logger.log(
      `Reputation updated for ${localUserId}: rating=${ratingAverage ?? 'n/a'} reviews=${reviewCount} completed=${completedCount} trustScore=${trustScore.toFixed(1)}`,
    );
  }

  /**
   * Pure composite scoring function. Exposed for unit tests so the formula
   * can be verified without touching the database.
   */
  computeTrustScore(input: {
    phoneVerified: boolean;
    idVerified: boolean;
    bankVerified: boolean;
    insuranceVerified: boolean;
    ratingAverage: number | null;
    reviewCount: number;
    completedCount: number;
  }): number {
    // Verification block — 40 points max
    let verification = 0;
    if (input.phoneVerified) verification += 10;
    if (input.idVerified) verification += 15;
    if (input.bankVerified) verification += 10;
    if (input.insuranceVerified) verification += 5;

    // Rating block — 35 points max. Null rating = 0 contribution.
    const rating =
      input.ratingAverage != null
        ? Math.max(0, Math.min(5, input.ratingAverage)) / 5 * 35
        : 0;

    // Volume block — 15 points, plateaus at 10 completed missions
    const volume = Math.min(input.completedCount, 10) / 10 * 15;

    // Review count block — 10 points, plateaus at 10 reviews
    const reviews = Math.min(input.reviewCount, 10) / 10 * 10;

    const total = verification + rating + volume + reviews;
    return Math.round(total * 10) / 10; // 1 decimal
  }

  /**
   * Read-only: fetch the materialized reputation block for an endpoint.
   */
  async getReputation(localUserId: string) {
    const user = await this.prisma.localUser.findUnique({
      where: { id: localUserId },
      select: {
        id: true,
        trustTier: true,
        trustScore: true,
        trustScoreUpdatedAt: true,
        ratingAverage: true,
        reviewCount: true,
        completedMissionsCount: true,
        phoneVerified: true,
        idVerificationStatus: true,
        bankVerified: true,
        insuranceVerified: true,
      },
    });
    return user;
  }
}
