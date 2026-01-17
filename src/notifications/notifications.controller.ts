import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  UseGuards,
  Request,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Notifications')
@Controller('api/v1/notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async getNotifications(
    @Request() req: any,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    // req.user.userId contient l'id interne User (ou sub pour clerkId si pas mappé)
    const userId = req.user.userId || req.user.sub;
    const onlyUnread = unreadOnly === 'true';
    return this.notificationsService.getNotifications(userId, onlyUnread);
  }

  @Get('unread-count')
  async getUnreadCount(@Request() req: any) {
    const userId = req.user.userId || req.user.sub;
    const count = await this.notificationsService.countUnread(userId);
    return { count };
  }

  @Patch(':id/read')
  async markAsRead(@Param('id') id: string, @Request() _req: any) {
    try {
      await this.notificationsService.markAsRead(id);
      return { success: true };
    } catch (error) {
      throw new NotFoundException('Notification not found or access denied');
    }
  }

  @Patch('read-all')
  async markAllAsRead(@Request() req: any) {
    const userId = req.user.userId || req.user.sub;
    await this.notificationsService.markAllAsRead(userId);
    return { success: true };
  }
}

