import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { NotificationQueueService } from './notification-queue.service';
import { QueueNotificationDto } from './dto';
import { NotificationQueueStatus, NotificationType, NotificationPriority } from '@prisma/client';

@ApiTags('Notification Queue')
@Controller('api/v1/notifications/queue')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationQueueController {
  constructor(private readonly queueService: NotificationQueueService) {}

  @Get('history')
  @ApiOperation({ summary: 'Get notification history for current user' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: NotificationQueueStatus })
  @ApiQuery({ name: 'type', required: false, enum: NotificationType })
  @ApiResponse({ status: 200, description: 'Notification history with pagination' })
  async getHistory(
    @Request() req: any,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('status') status?: NotificationQueueStatus,
    @Query('type') notificationType?: NotificationType,
  ) {
    const userId = req.user.userId || req.user.sub;

    return this.queueService.getUserNotificationHistory(userId, {
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
      status,
      notificationType,
    });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Cancel a pending notification' })
  @ApiResponse({ status: 200, description: 'Notification cancelled' })
  async cancelNotification(
    @Request() req: any,
    @Param('id') queueId: string,
  ) {
    const userId = req.user.userId || req.user.sub;

    // Verify ownership before cancelling
    const history = await this.queueService.getUserNotificationHistory(userId, { limit: 1000 });
    const notification = history.items.find(n => n.id === queueId);

    if (!notification) {
      throw new ForbiddenException('Notification not found or access denied');
    }

    if (notification.status !== NotificationQueueStatus.PENDING) {
      throw new ForbiddenException('Only pending notifications can be cancelled');
    }

    return this.queueService.cancelNotification(queueId);
  }

  // ==========================================
  // ADMIN / INTERNAL ENDPOINTS
  // ==========================================

  @Post('enqueue')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: '[Admin] Queue a notification for delivery' })
  @ApiResponse({ status: 201, description: 'Notification queued' })
  async queueNotification(@Body() dto: QueueNotificationDto) {
    return this.queueService.queueNotification({
      userId: dto.userId,
      notificationType: dto.notificationType,
      title: dto.title,
      body: dto.body,
      data: dto.data,
      priority: dto.priority,
      scheduledFor: dto.scheduledFor ? new Date(dto.scheduledFor) : undefined,
      correlationId: dto.correlationId,
      idempotencyKey: dto.idempotencyKey,
    });
  }

  @Get('pending')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: '[Admin] Get pending notifications ready for processing' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'priority', required: false, enum: NotificationPriority })
  @ApiResponse({ status: 200, description: 'List of pending notifications' })
  async getPending(
    @Query('limit') limit?: string,
    @Query('priority') priority?: NotificationPriority,
  ) {
    return this.queueService.getPendingNotifications(
      limit ? parseInt(limit, 10) : 100,
      priority,
    );
  }

  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: '[Admin] Get queue statistics' })
  @ApiResponse({ status: 200, description: 'Queue statistics' })
  async getStats() {
    return this.queueService.getQueueStats();
  }

  @Post('cleanup')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: '[Admin] Clean up old notifications' })
  @ApiQuery({ name: 'daysToKeep', required: false, type: Number, description: 'Days to keep (default: 30)' })
  @ApiResponse({ status: 200, description: 'Cleanup result' })
  async cleanup(@Query('daysToKeep') daysToKeep?: string) {
    const days = daysToKeep ? parseInt(daysToKeep, 10) : 30;
    const deleted = await this.queueService.cleanupOldNotifications(days);
    return { deleted, message: `Cleaned up ${deleted} old notifications` };
  }
}

