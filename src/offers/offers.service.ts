import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOfferDto } from './dto/create-offer.dto';
import { LocalOfferStatus } from '@prisma/client';

@Injectable()
export class OffersService {
  private readonly logger = new Logger(OffersService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new offer for a mission
   * 
   * @param workerId - ID of the worker making the offer
   * @param createOfferDto - Offer details
   * @throws NotFoundException if mission not found
   * @throws ConflictException if worker already made an offer
   * @throws BadRequestException if mission is not open
   * @throws ForbiddenException if worker tries to offer on their own mission
   */
  async create(workerId: string, createOfferDto: CreateOfferDto) {
    const { missionId, price, message } = createOfferDto;

    // Check mission exists and is open
    const mission = await this.prisma.localMission.findUnique({
      where: { id: missionId },
      select: {
        id: true,
        status: true,
        createdByUserId: true,
        title: true,
      },
    });

    if (!mission) {
      throw new NotFoundException('Mission not found');
    }

    // Cannot offer on your own mission
    if (mission.createdByUserId === workerId) {
      throw new ForbiddenException('Cannot make an offer on your own mission');
    }

    // Mission must be open
    if (mission.status !== 'open') {
      throw new BadRequestException('Mission is not open for offers');
    }

    // Check if worker already made an offer (unique constraint)
    const existingOffer = await this.prisma.localOffer.findUnique({
      where: {
        missionId_workerId: { missionId, workerId },
      },
    });

    if (existingOffer) {
      throw new ConflictException('You have already made an offer on this mission');
    }

    // Create offer
    const id = `offer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const offer = await this.prisma.localOffer.create({
      data: {
        id,
        missionId,
        workerId,
        price,
        message,
        updatedAt: new Date(),
      },
      include: {
        worker: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            city: true,
          },
        },
      },
    });

    this.logger.log(`Offer created: ${id} for mission ${missionId} by worker ${workerId}`);

    return offer;
  }

  /**
   * Get all offers for a mission
   * 
   * @param missionId - Mission ID
   * @param userId - Current user ID (for authorization)
   * @throws NotFoundException if mission not found
   */
  async findByMission(missionId: string, _userId: string) {
    // Check mission exists
    const mission = await this.prisma.localMission.findUnique({
      where: { id: missionId },
      select: {
        id: true,
        createdByUserId: true,
      },
    });

    if (!mission) {
      throw new NotFoundException('Mission not found');
    }

    // Get offers ordered by createdAt DESC
    const offers = await this.prisma.localOffer.findMany({
      where: { missionId },
      orderBy: { createdAt: 'desc' },
      include: {
        worker: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            city: true,
          },
        },
      },
    });

    return offers;
  }

  /**
   * Accept an offer
   * 
   * @param offerId - Offer ID
   * @param userId - Current user ID (must be mission owner)
   * @throws NotFoundException if offer not found
   * @throws ForbiddenException if user is not mission owner
   * @throws BadRequestException if offer already accepted or mission closed
   */
  async accept(offerId: string, userId: string) {
    // Get offer with mission
    const offer = await this.prisma.localOffer.findUnique({
      where: { id: offerId },
      include: {
        mission: {
          select: {
            id: true,
            createdByUserId: true,
            status: true,
          },
        },
      },
    });

    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    // Only mission owner can accept
    if (offer.mission.createdByUserId !== userId) {
      throw new ForbiddenException('Only mission owner can accept offers');
    }

    // Cannot accept if already accepted
    if (offer.status === LocalOfferStatus.ACCEPTED) {
      throw new BadRequestException('Offer already accepted');
    }

    // Cannot accept if mission is not open
    if (offer.mission.status !== 'open') {
      throw new BadRequestException('Mission is no longer open');
    }

    // Use transaction to:
    // 1. Accept this offer
    // 2. Decline all other offers
    // 3. Update mission status
    const result = await this.prisma.$transaction(async (tx) => {
      // Accept this offer
      const acceptedOffer = await tx.localOffer.update({
        where: { id: offerId },
        data: {
          status: LocalOfferStatus.ACCEPTED,
          updatedAt: new Date(),
        },
        include: {
          worker: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              city: true,
            },
          },
        },
      });

      // Decline all other offers for this mission
      await tx.localOffer.updateMany({
        where: {
          missionId: offer.missionId,
          id: { not: offerId },
          status: LocalOfferStatus.PENDING,
        },
        data: {
          status: LocalOfferStatus.DECLINED,
          updatedAt: new Date(),
        },
      });

      // Update mission: assign worker and set status to in_progress
      await tx.localMission.update({
        where: { id: offer.missionId },
        data: {
          assignedToUserId: offer.workerId,
          status: 'in_progress',
          updatedAt: new Date(),
        },
      });

      return acceptedOffer;
    });

    this.logger.log(`Offer accepted: ${offerId} by user ${userId}`);

    return result;
  }

  /**
   * Get offer by ID
   */
  async findById(offerId: string) {
    const offer = await this.prisma.localOffer.findUnique({
      where: { id: offerId },
      include: {
        worker: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            city: true,
          },
        },
      },
    });

    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    return offer;
  }

  /**
   * PR-S5: Get all offers made by a worker (my applications)
   * 
   * @param workerId - ID of the worker
   * @returns List of offers with mission details
   */
  async findByWorker(workerId: string) {
    const offers = await this.prisma.localOffer.findMany({
      where: { workerId },
      orderBy: { createdAt: 'desc' },
      include: {
        mission: {
          select: {
            id: true,
            title: true,
            description: true,
            category: true,
            price: true,
            city: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    this.logger.log(`Found ${offers.length} offers for worker ${workerId}`);

    return offers;
  }

  /**
   * PR-S5: Reject an offer (mission owner only)
   * 
   * @param offerId - Offer ID
   * @param userId - Current user ID (must be mission owner)
   * @throws NotFoundException if offer not found
   * @throws ForbiddenException if user is not mission owner
   * @throws BadRequestException if offer not pending
   */
  async reject(offerId: string, userId: string) {
    // Get offer with mission
    const offer = await this.prisma.localOffer.findUnique({
      where: { id: offerId },
      include: {
        mission: {
          select: {
            id: true,
            createdByUserId: true,
            status: true,
          },
        },
      },
    });

    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    // Only mission owner can reject
    if (offer.mission.createdByUserId !== userId) {
      throw new ForbiddenException('Only mission owner can reject offers');
    }

    // Cannot reject if not pending
    if (offer.status !== LocalOfferStatus.PENDING) {
      throw new BadRequestException('Can only reject pending offers');
    }

    // Update offer status
    const rejectedOffer = await this.prisma.localOffer.update({
      where: { id: offerId },
      data: {
        status: LocalOfferStatus.DECLINED,
        updatedAt: new Date(),
      },
      include: {
        worker: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            city: true,
          },
        },
      },
    });

    this.logger.log(`Offer rejected: ${offerId} by user ${userId}`);

    return rejectedOffer;
  }
}

