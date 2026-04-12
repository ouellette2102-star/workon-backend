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

  /**
   * Detect if the authenticated user is a LocalUser (native JWT auth).
   * Local JWT tokens include `provider: 'local'`.
   */
  private isLocalUser(req: any): boolean {
    return req.user?.provider === 'local';
  }

  @Get()
  async getNotifications(
    @Request() req: any,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    const userId = req.user.userId || req.user.sub;
    const onlyUnread = unreadOnly === 'true';

    if (this.isLocalUser(req)) {
      return this.notificationsService.getLocalNotifications(userId, onlyUnread);
    }

    return this.notificationsService.getNotifications(userId, onlyUnread);
  }

  @Get('unread-count')
  async getUnreadCount(@Request() req: any) {
    const userId = req.user.userId || req.user.sub;

    if (this.isLocalUser(req)) {
      const count = await this.notificationsService.countLocalUnread(userId);
      return { count };
    }

    const count = await this.notificationsService.countUnread(userId);
    return { count };
  }

  @Patch(':id/read')
  async markAsRead(@Param('id') id: string, @Request() req: any) {
    try {
      if (this.isLocalUser(req)) {
        await this.notificationsService.markLocalAsRead(id);
      } else {
        await this.notificationsService.markAsRead(id);
      }
      return { success: true };
    } catch (error) {
      throw new NotFoundException('Notification not found or access denied');
    }
  }

  @Patch('read-all')
  async markAllAsRead(@Request() req: any) {
    const userId = req.user.userId || req.user.sub;

    if (this.isLocalUser(req)) {
      await this.notificationsService.markAllLocalAsRead(userId);
    } else {
      await this.notificationsService.markAllAsRead(userId);
    }

    return { success: true };
  }
}
