import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDisputeDto, AddEvidenceDto, ResolveDisputeDto } from './dto/create-dispute.dto';

/**
 * Disputes Controller
 * Exposes the existing Dispute schema (Dispute, DisputeEvidence, DisputeTimeline)
 * through minimal HTTP endpoints.
 *
 * Note: Currently linked to Clerk User/Mission only.
 * LocalMission dispute support is planned.
 */
@ApiTags('Disputes')
@Controller('api/v1/disputes')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DisputesController {
  private readonly logger = new Logger(DisputesController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Post()
  @ApiOperation({ summary: 'Open a dispute on a mission' })
  @ApiResponse({ status: 201, description: 'Dispute created' })
  async createDispute(@Request() req: any, @Body() dto: CreateDisputeDto) {
    const isLocalMission = !!dto.localMissionId;

    const dispute = await this.prisma.dispute.create({
      data: {
        id: `disp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        missionId: dto.missionId || undefined,
        localMissionId: dto.localMissionId || undefined,
        openedById: req.user.sub,
        reason: dto.reason,
        updatedAt: new Date(),
      },
    });

    this.logger.log(`Dispute created: ${dispute.id} for mission ${dto.missionId || dto.localMissionId}`);
    return dispute;
  }

  @Get('mine')
  @ApiOperation({ summary: 'Get all disputes opened by or involving the authenticated user' })
  @ApiResponse({ status: 200, description: 'List of disputes' })
  async getMyDisputes(@Request() req: any) {
    const userId = req.user.sub;

    // Find disputes where user opened it OR is party to the associated mission
    // Check both Clerk Mission and LocalMission relations
    const disputes = await this.prisma.dispute.findMany({
      where: {
        OR: [
          { openedById: userId },
          {
            mission: {
              OR: [
                { authorClientId: userId },
                { assigneeWorkerId: userId },
              ],
            },
          },
          {
            localMissionId: { not: null },
          },
        ],
      },
      include: {
        evidence: true,
        timeline: { orderBy: { createdAt: 'asc' } },
        mission: {
          select: { id: true, title: true, status: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // For disputes linked to local missions, filter by participation
    // (Prisma can't do nested OR across optional relations in a single query easily)
    const localMissionIds = disputes
      .filter((d) => d.localMissionId && d.openedById !== userId && !d.missionId)
      .map((d) => d.localMissionId as string);

    let participatingLocalMissionIds = new Set<string>();
    if (localMissionIds.length > 0) {
      const localMissions = await this.prisma.localMission.findMany({
        where: {
          id: { in: localMissionIds },
          OR: [
            { createdByUserId: userId },
            { assignedToUserId: userId },
          ],
        },
        select: { id: true },
      });
      participatingLocalMissionIds = new Set(localMissions.map((m) => m.id));
    }

    // Filter: keep disputes where user is opener, or party to mission/localMission
    const filtered = disputes.filter((d) => {
      if (d.openedById === userId) return true;
      if (d.missionId) return true; // already filtered by Prisma OR on mission
      if (d.localMissionId) return participatingLocalMissionIds.has(d.localMissionId);
      return false;
    });

    return filtered;
  }

  @Get('mission/:missionId')
  @ApiOperation({ summary: 'Get dispute for a mission' })
  @ApiResponse({ status: 200, description: 'Dispute found' })
  @ApiResponse({ status: 404, description: 'No dispute for this mission' })
  async getDisputeByMission(@Param('missionId') missionId: string) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { missionId },
      include: {
        evidence: true,
        timeline: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!dispute) {
      throw new NotFoundException('No dispute found for this mission');
    }

    return dispute;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get dispute by ID' })
  @ApiResponse({ status: 200, description: 'Dispute found' })
  @ApiResponse({ status: 404, description: 'Dispute not found' })
  async getDispute(@Param('id') id: string) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id },
      include: {
        evidence: true,
        timeline: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    return dispute;
  }

  @Post(':id/evidence')
  @ApiOperation({ summary: 'Add evidence to a dispute' })
  @ApiResponse({ status: 201, description: 'Evidence added' })
  @ApiResponse({ status: 404, description: 'Dispute not found' })
  async addEvidence(@Request() req: any, @Param('id') disputeId: string, @Body() dto: AddEvidenceDto) {
    const dispute = await this.prisma.dispute.findUnique({ where: { id: disputeId } });
    if (!dispute) throw new NotFoundException('Dispute not found');

    const evidence = await this.prisma.disputeEvidence.create({
      data: {
        disputeId,
        uploadedBy: req.user.sub,
        type: dto.type as any,
        url: dto.fileUrl || '',
        description: dto.content,
      },
    });

    // Add timeline entry
    await this.prisma.disputeTimeline.create({
      data: {
        disputeId,
        action: 'EVIDENCE_ADDED',
        actorId: req.user.sub,
        actorType: 'user',
        details: `Evidence submitted: ${dto.type}`,
      },
    });

    return evidence;
  }

  @Patch(':id/resolve')
  @ApiOperation({ summary: 'Resolve a dispute' })
  @ApiResponse({ status: 200, description: 'Dispute resolved' })
  @ApiResponse({ status: 404, description: 'Dispute not found' })
  async resolveDispute(@Request() req: any, @Param('id') id: string, @Body() dto: ResolveDisputeDto) {
    const dispute = await this.prisma.dispute.findUnique({ where: { id } });
    if (!dispute) throw new NotFoundException('Dispute not found');

    const updated = await this.prisma.dispute.update({
      where: { id },
      data: {
        status: 'RESOLVED',
        resolution: dto.resolution,
        updatedAt: new Date(),
      },
    });

    await this.prisma.disputeTimeline.create({
      data: {
        disputeId: id,
        action: 'RESOLVED',
        actorId: req.user.sub,
        actorType: 'user',
        details: dto.resolution,
      },
    });

    return updated;
  }
}
