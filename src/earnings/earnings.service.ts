import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EarningsSummaryDto } from './dto/earnings-summary.dto';
import {
  EarningTransactionDto,
  EarningsHistoryResponseDto,
  EarningsByMissionResponseDto,
  EarningStatus,
} from './dto/earnings-history.dto';

/**
 * Commission rate applied to worker earnings.
 * 15% platform fee = worker gets 85% of mission price.
 *
 * This should eventually come from config/env.
 */
const COMMISSION_RATE = 0.15;
const CURRENCY = 'CAD';

/**
 * Service for calculating and retrieving worker earnings.
 *
 * All earnings are derived from completed/paid LocalMissions.
 * No duplicate Stripe queries - uses database state only.
 *
 * PR-EARNINGS: Earnings module implementation.
 */
@Injectable()
export class EarningsService {
  private readonly logger = new Logger(EarningsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get earnings summary for a worker.
   *
   * @param workerId - LocalUser ID of the worker
   */
  async getSummary(workerId: string): Promise<EarningsSummaryDto> {
    this.logger.debug(`Getting earnings summary for worker: ${workerId}`);

    // Get all completed/paid missions assigned to this worker
    const missions = await this.prisma.localMission.findMany({
      where: {
        assignedToUserId: workerId,
        status: {
          in: ['completed', 'paid'],
        },
      },
      select: {
        id: true,
        price: true,
        status: true,
        paidAt: true,
      },
    });

    // Calculate totals
    let totalLifetimeGross = 0;
    let totalPaid = 0;
    let totalPending = 0;
    let completedCount = 0;
    let paidCount = 0;

    for (const mission of missions) {
      totalLifetimeGross += mission.price;

      if (mission.status === 'paid') {
        totalPaid += mission.price * (1 - COMMISSION_RATE);
        paidCount++;
      } else if (mission.status === 'completed') {
        totalPending += mission.price;
        completedCount++;
      }
    }

    const totalLifetimeNet = totalLifetimeGross * (1 - COMMISSION_RATE);
    const totalAvailable = totalPending * (1 - COMMISSION_RATE);

    this.logger.debug(
      `Earnings summary for ${workerId}: gross=${totalLifetimeGross}, net=${totalLifetimeNet}, ` +
        `paid=${totalPaid}, pending=${totalPending}, available=${totalAvailable}`,
    );

    return {
      totalLifetimeGross: this.round(totalLifetimeGross),
      totalLifetimeNet: this.round(totalLifetimeNet),
      totalPaid: this.round(totalPaid),
      totalPending: this.round(totalPending),
      totalAvailable: this.round(totalAvailable),
      completedMissionsCount: completedCount,
      paidMissionsCount: paidCount,
      commissionRate: COMMISSION_RATE,
      currency: CURRENCY,
    };
  }

  /**
   * Get earnings history (paginated).
   *
   * @param workerId - LocalUser ID of the worker
   * @param cursor - Optional cursor for pagination
   * @param limit - Number of items to return
   */
  async getHistory(
    workerId: string,
    cursor?: string,
    limit: number = 20,
  ): Promise<EarningsHistoryResponseDto> {
    this.logger.debug(
      `Getting earnings history for worker: ${workerId}, cursor: ${cursor}, limit: ${limit}`,
    );

    // Get total count first
    const totalCount = await this.prisma.localMission.count({
      where: {
        assignedToUserId: workerId,
        status: {
          in: ['completed', 'paid'],
        },
      },
    });

    // Build where clause with cursor
    const whereClause: any = {
      assignedToUserId: workerId,
      status: {
        in: ['completed', 'paid'],
      },
    };

    if (cursor) {
      // Use cursor for pagination (fetch items after this ID)
      whereClause.id = {
        lt: cursor,
      };
    }

    // Get missions with client info
    const missions = await this.prisma.localMission.findMany({
      where: whereClause,
      orderBy: {
        updatedAt: 'desc',
      },
      take: limit + 1, // Fetch one extra to determine if there's a next page
      select: {
        id: true,
        title: true,
        price: true,
        status: true,
        paidAt: true,
        updatedAt: true,
        createdByUser: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Determine if there's a next page
    const hasMore = missions.length > limit;
    const items = hasMore ? missions.slice(0, limit) : missions;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    // Map to DTOs
    const transactions: EarningTransactionDto[] = items.map((mission) => ({
      id: mission.id,
      missionId: mission.id,
      missionTitle: mission.title,
      clientName:
        `${mission.createdByUser.firstName} ${mission.createdByUser.lastName}`.trim() ||
        'Client',
      date: mission.updatedAt.toISOString(),
      grossAmount: this.round(mission.price),
      commissionAmount: this.round(mission.price * COMMISSION_RATE),
      netAmount: this.round(mission.price * (1 - COMMISSION_RATE)),
      status: this.mapStatus(mission.status),
      paidAt: mission.paidAt?.toISOString(),
      currency: CURRENCY,
    }));

    return {
      transactions,
      nextCursor,
      totalCount,
    };
  }

  /**
   * Get earnings detail for a specific mission.
   *
   * @param workerId - LocalUser ID of the worker
   * @param missionId - Mission ID
   */
  async getByMission(
    workerId: string,
    missionId: string,
  ): Promise<EarningsByMissionResponseDto> {
    this.logger.debug(
      `Getting earnings for mission ${missionId}, worker ${workerId}`,
    );

    const mission = await this.prisma.localMission.findFirst({
      where: {
        id: missionId,
        assignedToUserId: workerId,
        status: {
          in: ['completed', 'paid'],
        },
      },
      select: {
        id: true,
        title: true,
        category: true,
        city: true,
        address: true,
        price: true,
        status: true,
        paidAt: true,
        updatedAt: true,
        createdByUser: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!mission) {
      throw new NotFoundException(
        `Earning not found for mission ${missionId}. ` +
          `Make sure you are assigned to this mission and it is completed/paid.`,
      );
    }

    return {
      id: mission.id,
      missionId: mission.id,
      missionTitle: mission.title,
      clientName:
        `${mission.createdByUser.firstName} ${mission.createdByUser.lastName}`.trim() ||
        'Client',
      date: mission.updatedAt.toISOString(),
      grossAmount: this.round(mission.price),
      commissionAmount: this.round(mission.price * COMMISSION_RATE),
      netAmount: this.round(mission.price * (1 - COMMISSION_RATE)),
      status: this.mapStatus(mission.status),
      paidAt: mission.paidAt?.toISOString(),
      currency: CURRENCY,
      category: mission.category,
      city: mission.city,
      address: mission.address ?? undefined,
    };
  }

  /**
   * Map database status to earning status.
   */
  private mapStatus(dbStatus: string): EarningStatus {
    switch (dbStatus) {
      case 'paid':
        return 'paid';
      case 'completed':
        return 'available'; // Completed = available for payout
      default:
        return 'pending';
    }
  }

  /**
   * Round to 2 decimal places.
   */
  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }
}

