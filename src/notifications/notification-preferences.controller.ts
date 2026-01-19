import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationPreferencesService } from './notification-preferences.service';
import { UpdateNotificationPreferenceDto, SetQuietHoursDto } from './dto';
import { NotificationType } from '@prisma/client';

@ApiTags('Notification Preferences')
@Controller('api/v1/notifications/preferences')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationPreferencesController {
  constructor(
    private readonly preferencesService: NotificationPreferencesService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all notification preferences for current user' })
  @ApiResponse({ status: 200, description: 'List of notification preferences' })
  async getPreferences(@Request() req: any) {
    const userId = req.user.userId || req.user.sub;
    return this.preferencesService.getUserPreferences(userId);
  }

  @Get(':notificationType')
  @ApiOperation({ summary: 'Get preference for a specific notification type' })
  @ApiParam({
    name: 'notificationType',
    enum: NotificationType,
    description: 'Type of notification',
  })
  @ApiResponse({ status: 200, description: 'Notification preference' })
  async getPreference(
    @Request() req: any,
    @Param('notificationType') notificationType: string,
  ) {
    const userId = req.user.userId || req.user.sub;

    // Validate notification type
    if (!Object.values(NotificationType).includes(notificationType as NotificationType)) {
      throw new BadRequestException(`Invalid notification type: ${notificationType}`);
    }

    return this.preferencesService.getOrCreatePreference(
      userId,
      notificationType as NotificationType,
    );
  }

  @Put(':notificationType')
  @ApiOperation({ summary: 'Update preference for a specific notification type' })
  @ApiParam({
    name: 'notificationType',
    enum: NotificationType,
    description: 'Type of notification',
  })
  @ApiResponse({ status: 200, description: 'Updated notification preference' })
  async updatePreference(
    @Request() req: any,
    @Param('notificationType') notificationType: string,
    @Body() dto: UpdateNotificationPreferenceDto,
  ) {
    const userId = req.user.userId || req.user.sub;

    // Validate notification type
    if (!Object.values(NotificationType).includes(notificationType as NotificationType)) {
      throw new BadRequestException(`Invalid notification type: ${notificationType}`);
    }

    return this.preferencesService.updatePreference(
      userId,
      notificationType as NotificationType,
      dto,
    );
  }

  @Put('quiet-hours')
  @ApiOperation({ summary: 'Set quiet hours for all notification types' })
  @ApiResponse({ status: 200, description: 'Quiet hours updated' })
  async setQuietHours(
    @Request() req: any,
    @Body() dto: SetQuietHoursDto,
  ) {
    const userId = req.user.userId || req.user.sub;

    await this.preferencesService.setQuietHours(
      userId,
      dto.quietHoursStart ?? null,
      dto.quietHoursEnd ?? null,
      dto.timezone,
    );

    return { success: true, message: 'Quiet hours updated' };
  }

  @Post('unsubscribe-marketing')
  @ApiOperation({ summary: 'Unsubscribe from all marketing notifications' })
  @ApiResponse({ status: 200, description: 'Unsubscribed from marketing' })
  async unsubscribeFromMarketing(@Request() req: any) {
    const userId = req.user.userId || req.user.sub;
    await this.preferencesService.unsubscribeFromMarketing(userId);
    return { success: true, message: 'Unsubscribed from marketing notifications' };
  }

  @Post('initialize')
  @ApiOperation({ summary: 'Initialize default preferences for user (called on registration)' })
  @ApiResponse({ status: 200, description: 'Default preferences initialized' })
  async initializeDefaults(@Request() req: any) {
    const userId = req.user.userId || req.user.sub;
    await this.preferencesService.initializeDefaultPreferences(userId);
    return { success: true, message: 'Default preferences initialized' };
  }
}

