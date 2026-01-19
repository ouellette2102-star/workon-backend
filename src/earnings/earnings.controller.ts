import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Request,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { EarningsService } from './earnings.service';
import { EarningsSummaryDto } from './dto/earnings-summary.dto';
import {
  EarningsHistoryQueryDto,
  EarningsHistoryResponseDto,
  EarningsByMissionResponseDto,
} from './dto/earnings-history.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/**
 * Controller for worker earnings endpoints.
 *
 * All endpoints require authentication.
 * Workers can only see their own earnings.
 *
 * PR-EARNINGS: Earnings module implementation.
 */
@ApiTags('Earnings')
@Controller('api/v1/earnings')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class EarningsController {
  private readonly logger = new Logger(EarningsController.name);

  constructor(private readonly earningsService: EarningsService) {}

  /**
   * GET /api/v1/earnings/summary
   *
   * Get earnings summary for the authenticated worker.
   */
  @Get('summary')
  @ApiOperation({
    summary: 'Get earnings summary',
    description:
      'Returns total lifetime earnings, paid amount, pending amount, and available balance for the worker.',
  })
  @ApiResponse({
    status: 200,
    description: 'Earnings summary retrieved successfully',
    type: EarningsSummaryDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getSummary(
    @Request() req: { user: { sub: string } },
  ): Promise<EarningsSummaryDto> {
    this.logger.log(`GET /earnings/summary for user ${req.user.sub}`);
    return this.earningsService.getSummary(req.user.sub);
  }

  /**
   * GET /api/v1/earnings/history
   *
   * Get paginated earnings history.
   */
  @Get('history')
  @ApiOperation({
    summary: 'Get earnings history',
    description:
      'Returns paginated list of all earning transactions (completed/paid missions).',
  })
  @ApiResponse({
    status: 200,
    description: 'Earnings history retrieved successfully',
    type: EarningsHistoryResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getHistory(
    @Request() req: { user: { sub: string } },
    @Query() query: EarningsHistoryQueryDto,
  ): Promise<EarningsHistoryResponseDto> {
    this.logger.log(
      `GET /earnings/history for user ${req.user.sub}, cursor=${query.cursor}, limit=${query.limit}`,
    );
    return this.earningsService.getHistory(
      req.user.sub,
      query.cursor,
      query.limit ?? 20,
    );
  }

  /**
   * GET /api/v1/earnings/by-mission/:missionId
   *
   * Get earning detail for a specific mission.
   */
  @Get('by-mission/:missionId')
  @ApiOperation({
    summary: 'Get earnings by mission',
    description:
      'Returns detailed earning information for a specific completed/paid mission.',
  })
  @ApiParam({
    name: 'missionId',
    description: 'Mission ID',
    example: 'local_1705678901234_abc',
  })
  @ApiResponse({
    status: 200,
    description: 'Mission earnings retrieved successfully',
    type: EarningsByMissionResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Mission not found or not completed' })
  async getByMission(
    @Request() req: { user: { sub: string } },
    @Param('missionId') missionId: string,
  ): Promise<EarningsByMissionResponseDto> {
    this.logger.log(
      `GET /earnings/by-mission/${missionId} for user ${req.user.sub}`,
    );
    return this.earningsService.getByMission(req.user.sub, missionId);
  }
}

