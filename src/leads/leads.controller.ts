import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  Logger,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadStatusDto } from './dto/update-lead-status.dto';
import { LeadStatus, UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Leads')
@Controller('api/v1/leads')
export class LeadsController {
  private readonly logger = new Logger(LeadsController.name);

  constructor(private readonly leadsService: LeadsService) {}

  /**
   * POST /api/v1/leads
   * Public — captures a client demand from a professional's page.
   */
  @Post()
  @HttpCode(201)
  @ApiOperation({
    summary: 'Capture a client demand',
    description:
      'Receives a demand from the pro page form. ' +
      'Validates phone (Canadian format), checks for duplicates, ' +
      'stores the lead, and routes it to the professional via GHL + email/SMS.',
  })
  @ApiResponse({ status: 201, description: 'Lead created and routed' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 404, description: 'Professional not found' })
  @ApiResponse({ status: 409, description: 'Duplicate lead within 7 days' })
  async createLead(@Body() dto: CreateLeadDto) {
    this.logger.log(`New lead received for pro ${dto.professionalId}`);
    return this.leadsService.createLead(dto);
  }

  /**
   * GET /api/v1/leads
   * Admin-only — returns all leads with optional filters.
   */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List all leads (admin)',
    description: 'Admin-only endpoint. Returns all leads with optional status and date filters.',
  })
  @ApiQuery({ name: 'status', required: false, enum: LeadStatus })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'All leads' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  async getAllLeads(
    @Query('status') status?: LeadStatus,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.leadsService.getAllLeads(
      status,
      limit ? parseInt(limit, 10) : 50,
      offset ? parseInt(offset, 10) : 0,
    );
  }

  /**
   * GET /api/v1/leads/pro/:proId
   * Protected — returns leads for a professional.
   */
  @Get('pro/:proId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List leads for a professional' })
  @ApiParam({ name: 'proId', description: 'Professional LocalUser ID' })
  @ApiQuery({ name: 'status', required: false, enum: LeadStatus })
  @ApiResponse({ status: 200, description: 'Leads list' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getLeadsByPro(
    @Param('proId') proId: string,
    @Query('status') status?: LeadStatus,
  ) {
    return this.leadsService.getLeadsByPro(proId, status);
  }

  /**
   * PATCH /api/v1/leads/:id/status
   * Protected — update lead status.
   */
  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update lead status' })
  @ApiParam({ name: 'id', description: 'Lead ID' })
  @ApiResponse({ status: 200, description: 'Status updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Lead not found' })
  async updateLeadStatus(
    @Param('id') id: string,
    @Body() dto: UpdateLeadStatusDto,
  ) {
    return this.leadsService.updateLeadStatus(id, dto);
  }

  /**
   * POST /api/v1/leads/:id/convert
   * Protected (admin) — manually convert a lead to a mission
   * with optional custom parameters (price, location, category).
   */
  @Post(':id/convert')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Convert lead to mission',
    description:
      'Manually converts a lead into an open mission. ' +
      'Optional params override auto-detected values (price, location, category).',
  })
  @ApiParam({ name: 'id', description: 'Lead ID' })
  @ApiResponse({ status: 201, description: 'Mission created from lead' })
  @ApiResponse({ status: 404, description: 'Lead not found' })
  @ApiResponse({ status: 409, description: 'Lead already converted' })
  async convertLeadToMission(
    @Param('id') id: string,
    @Body() params: {
      price?: number;
      latitude?: number;
      longitude?: number;
      city?: string;
      address?: string;
      category?: string;
      title?: string;
    },
  ) {
    this.logger.log(`Manual lead→mission conversion requested: ${id}`);
    return this.leadsService.convertLeadToMission(id, params);
  }
}
