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
    const dispute = await this.prisma.dispute.create({
      data: {
        id: `disp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        missionId: dto.missionId || undefined,
        localMissionId: dto.localMissionId || undefined,
        openedById: req.user.sub,
        localOpenedById: dto.localMissionId ? req.user.sub : undefined,
        reason: dto.reason,
        updatedAt: new Date(),
      },
    });

    this.logger.log(`Dispute created: ${dispute.id} for mission ${dto.missionId || dto.localMissionId}`);
    return dispute;
  }

  @Get('mission/:missionId')
  @ApiOperation({ summary: 'Get dispute for a mission' })
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
  async addEvidence(@Request() req: any, @Param('id') disputeId: string, @Body() dto: AddEvidenceDto) {
    const dispute = await this.prisma.dispute.findUnique({ where: { id: disputeId } });
    if (!dispute) throw new NotFoundException('Dispute not found');

    const evidence = await this.prisma.disputeEvidence.create({
      data: {
        id: `ev_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        disputeId,
        submittedById: req.user.sub,
        type: dto.type,
        content: dto.content,
        fileUrl: dto.fileUrl,
        updatedAt: new Date(),
      },
    });

    // Add timeline entry
    await this.prisma.disputeTimeline.create({
      data: {
        id: `tl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        disputeId,
        action: 'EVIDENCE_ADDED',
        performedById: req.user.sub,
        details: `Evidence submitted: ${dto.type}`,
      },
    });

    return evidence;
  }

  @Patch(':id/resolve')
  @ApiOperation({ summary: 'Resolve a dispute' })
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
        id: `tl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        disputeId: id,
        action: 'RESOLVED',
        performedById: req.user.sub,
        details: dto.resolution,
      },
    });

    return updated;
  }
}
