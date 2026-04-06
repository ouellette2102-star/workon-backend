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
} from '@nestjs/swagger';
import { SchedulingService } from './scheduling.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BookingStatus, RecurrenceRule } from '@prisma/client';

/**
 * Scheduling Controller
 * Exposes Booking, Availability, and RecurringMissionTemplate endpoints.
 *
 * All endpoints require JWT authentication.
 */
@ApiTags('Scheduling')
@Controller('api/v1/scheduling')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SchedulingController {
  constructor(private readonly schedulingService: SchedulingService) {}

  // ========================================
  // RECURRING MISSION TEMPLATES
  // ========================================

  @Post('templates')
  @ApiOperation({ summary: 'Create a recurring mission template' })
  @ApiResponse({ status: 201, description: 'Template created' })
  async createTemplate(@Request() req: any, @Body() body: {
    title: string;
    description: string;
    categoryId: string;
    priceType: string;
    price: number;
    duration: number;
    recurrenceRule: RecurrenceRule;
    recurrenceData?: Record<string, unknown>;
    maxOccurrences?: number;
    validFrom?: string;
    validUntil?: string;
  }) {
    return this.schedulingService.createRecurringTemplate({
      workerId: req.user.sub,
      title: body.title,
      description: body.description,
      categoryId: body.categoryId,
      priceType: body.priceType,
      price: body.price,
      duration: body.duration,
      recurrenceRule: body.recurrenceRule,
      recurrenceData: body.recurrenceData,
      maxOccurrences: body.maxOccurrences,
      validFrom: body.validFrom ? new Date(body.validFrom) : undefined,
      validUntil: body.validUntil ? new Date(body.validUntil) : undefined,
    });
  }

  @Get('templates')
  @ApiOperation({ summary: 'Get worker recurring templates' })
  async getTemplates(@Request() req: any) {
    return this.schedulingService.getWorkerTemplates(req.user.sub);
  }

  @Patch('templates/:id/deactivate')
  @ApiOperation({ summary: 'Deactivate a recurring template' })
  async deactivateTemplate(@Request() req: any, @Param('id') id: string) {
    return this.schedulingService.deactivateTemplate(id, req.user.sub);
  }

  // ========================================
  // AVAILABILITY
  // ========================================

  @Post('availability')
  @ApiOperation({ summary: 'Set worker availability slots' })
  async setAvailability(@Request() req: any, @Body() body: {
    slots: Array<{
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      timezone?: string;
    }>;
  }) {
    return this.schedulingService.setAvailability({
      workerId: req.user.sub,
      slots: body.slots,
    });
  }

  @Get('availability')
  @ApiOperation({ summary: 'Get worker availability' })
  async getAvailability(@Request() req: any) {
    return this.schedulingService.getWorkerAvailability(req.user.sub);
  }

  @Post('availability/block')
  @ApiOperation({ summary: 'Block a time slot (time off)' })
  async blockTimeOff(@Request() req: any, @Body() body: {
    specificDate: string;
    startTime: string;
    endTime: string;
    timezone?: string;
  }) {
    return this.schedulingService.blockTimeOff({
      workerId: req.user.sub,
      specificDate: new Date(body.specificDate),
      startTime: body.startTime,
      endTime: body.endTime,
      timezone: body.timezone,
    });
  }

  // ========================================
  // BOOKINGS
  // ========================================

  @Post('bookings')
  @ApiOperation({ summary: 'Create a booking' })
  @ApiResponse({ status: 201, description: 'Booking created' })
  async createBooking(@Request() req: any, @Body() body: {
    workerId: string;
    templateId?: string;
    title: string;
    description?: string;
    scheduledAt: string;
    duration: number;
    timezone?: string;
    price: number;
    priceType: string;
  }) {
    return this.schedulingService.createBooking({
      clientId: req.user.sub,
      workerId: body.workerId,
      templateId: body.templateId,
      title: body.title,
      description: body.description,
      scheduledAt: new Date(body.scheduledAt),
      duration: body.duration,
      timezone: body.timezone,
      price: body.price,
      priceType: body.priceType,
    });
  }

  @Patch('bookings/:id/confirm')
  @ApiOperation({ summary: 'Confirm a booking (worker)' })
  async confirmBooking(@Request() req: any, @Param('id') id: string) {
    return this.schedulingService.confirmBooking(id, req.user.sub);
  }

  @Patch('bookings/:id/cancel')
  @ApiOperation({ summary: 'Cancel a booking' })
  async cancelBooking(@Request() req: any, @Param('id') id: string, @Body() body: {
    reason?: string;
  }) {
    return this.schedulingService.cancelBooking(id, req.user.sub, body.reason);
  }

  @Patch('bookings/:id/complete')
  @ApiOperation({ summary: 'Complete a booking (worker)' })
  async completeBooking(@Request() req: any, @Param('id') id: string) {
    return this.schedulingService.completeBooking(id, req.user.sub);
  }

  @Get('bookings/mine')
  @ApiOperation({ summary: 'Get my bookings (as client)' })
  async getMyBookings(
    @Request() req: any,
    @Query('status') status?: BookingStatus,
    @Query('upcoming') upcoming?: string,
  ) {
    return this.schedulingService.getClientBookings(req.user.sub, {
      status,
      upcoming: upcoming === 'true',
    });
  }

  @Get('bookings/worker')
  @ApiOperation({ summary: 'Get my bookings (as worker)' })
  async getWorkerBookings(
    @Request() req: any,
    @Query('status') status?: BookingStatus,
    @Query('upcoming') upcoming?: string,
  ) {
    return this.schedulingService.getWorkerBookings(req.user.sub, {
      status,
      upcoming: upcoming === 'true',
    });
  }
}
