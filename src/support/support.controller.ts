import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SupportService } from './support.service';
import {
  CreateSupportTicketDto,
  AddTicketMessageDto,
  SupportTicketResponseDto,
  TicketListResponseDto,
} from './dto';

/**
 * PR-00: Support Tickets Controller
 * 
 * In-app customer support ticket management.
 * All endpoints require authentication.
 */
@ApiTags('Support')
@Controller('api/v1/support')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post('tickets')
  @ApiOperation({
    summary: 'Create support ticket',
    description: 'Create a new support ticket. Device context is captured for fraud prevention.',
  })
  @ApiResponse({
    status: 201,
    description: 'Ticket created successfully',
    type: SupportTicketResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createTicket(
    @Body() dto: CreateSupportTicketDto,
    @Request() req: any,
  ): Promise<SupportTicketResponseDto> {
    return this.supportService.createTicket(
      req.user.sub,
      dto,
      req.context,
    );
  }

  @Get('tickets')
  @ApiOperation({
    summary: 'Get my tickets',
    description: 'Get all support tickets created by the authenticated user.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({
    status: 200,
    description: 'List of tickets',
    type: TicketListResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMyTickets(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Request() req?: any,
  ): Promise<TicketListResponseDto> {
    return this.supportService.getUserTickets(
      req.user.sub,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get('tickets/:id')
  @ApiOperation({
    summary: 'Get ticket by ID',
    description: 'Get a specific support ticket with all messages.',
  })
  @ApiParam({ name: 'id', description: 'Ticket ID' })
  @ApiResponse({
    status: 200,
    description: 'Ticket details',
    type: SupportTicketResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  async getTicket(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<SupportTicketResponseDto> {
    return this.supportService.getTicketById(id, req.user.sub);
  }

  @Post('tickets/:id/messages')
  @ApiOperation({
    summary: 'Add message to ticket',
    description: 'Add a new message to an existing support ticket.',
  })
  @ApiParam({ name: 'id', description: 'Ticket ID' })
  @ApiResponse({
    status: 201,
    description: 'Message added',
    type: SupportTicketResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Access denied or ticket closed' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  async addMessage(
    @Param('id') id: string,
    @Body() dto: AddTicketMessageDto,
    @Request() req: any,
  ): Promise<SupportTicketResponseDto> {
    return this.supportService.addMessage(
      id,
      req.user.sub,
      dto,
      req.context,
    );
  }

  @Patch('tickets/:id/close')
  @ApiOperation({
    summary: 'Close ticket',
    description: 'Close a support ticket. Only the ticket owner can close it.',
  })
  @ApiParam({ name: 'id', description: 'Ticket ID' })
  @ApiResponse({
    status: 200,
    description: 'Ticket closed',
    type: SupportTicketResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  async closeTicket(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<SupportTicketResponseDto> {
    return this.supportService.closeTicket(id, req.user.sub, req.context);
  }
}

