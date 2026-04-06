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
import { BookingStatus } from '@prisma/client';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CreateTemplateDto } from './dto/create-template.dto';
import { SetAvailabilityDto, BlockTimeOffDto } from './dto/set-availability.dto';

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
  async createTemplate(@Request() req: any, @Body() dto: CreateTemplateDto) {
    return this.schedulingService.createRecurringTemplate({
      workerId: req.user.sub,
      title: dto.title,
      description: dto.description,
      categoryId: dto.categoryId,
      priceType: dto.priceType,
      price: dto.price,
      duration: dto.duration,
      recurrenceRule: dto.recurrenceRule,
      recurrenceData: dto.recurrenceData,
      maxOccurrences: dto.maxOccurrences,
      validFrom: dto.validFrom ? new Date(dto.validFrom) : undefined,
      validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
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
  async setAvailability(@Request() req: any, @Body() dto: SetAvailabilityDto) {
    return this.schedulingService.setAvailability({
      workerId: req.user.sub,
      slots: dto.slots,
    });
  }

  @Get('availability')
  @ApiOperation({ summary: 'Get worker availability' })
  async getAvailability(@Request() req: any) {
    return this.schedulingService.getWorkerAvailability(req.user.sub);
  }

  @Post('availability/block')
  @ApiOperation({ summary: 'Block a time slot (time off)' })
  async blockTimeOff(@Request() req: any, @Body() dto: BlockTimeOffDto) {
    return this.schedulingService.blockTimeOff({
      workerId: req.user.sub,
      specificDate: new Date(dto.specificDate),
      startTime: dto.startTime,
      endTime: dto.endTime,
      timezone: dto.timezone,
    });
  }

  // ========================================
  // BOOKINGS
  // ========================================

  @Post('bookings')
  @ApiOperation({ summary: 'Create a booking' })
  @ApiResponse({ status: 201, description: 'Booking created' })
  async createBooking(@Request() req: any, @Body() dto: CreateBookingDto) {
    return this.schedulingService.createBooking({
      clientId: req.user.sub,
      workerId: dto.workerId,
      templateId: dto.templateId,
      title: dto.title,
      description: dto.description,
      scheduledAt: new Date(dto.scheduledAt),
      duration: dto.duration,
      timezone: dto.timezone,
      price: dto.price,
      priceType: dto.priceType,
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
