import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { ConversationResponseDto } from './dto/conversation-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Messages')
@ApiBearerAuth()
@Controller('api/v1/messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  /**
   * PR-INBOX: GET /api/v1/messages/conversations
   * List all conversations for the current user.
   */
  @Get('conversations')
  @ApiOperation({
    summary: 'Get all conversations',
    description:
      'Returns all chat threads where the user is involved (as employer or worker). ' +
      'Sorted by most recent message first.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of conversations',
    type: [ConversationResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getConversations(@Request() req: any) {
    return this.messagesService.getConversations(req.user.sub);
  }

  /**
   * GET /api/v1/messages/thread/:missionId
   * Récupérer les messages d'une mission
   */
  @Get('thread/:missionId')
  @ApiOperation({ summary: 'Get messages for a mission' })
  @ApiParam({ name: 'missionId', description: 'Mission ID' })
  @ApiResponse({ status: 200, description: 'List of messages' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Mission not found' })
  getMessages(@Param('missionId') missionId: string, @Request() req: any) {
    return this.messagesService.getMessagesForMission(missionId, req.user.sub);
  }

  /**
   * POST /api/v1/messages
   * Envoyer un message
   */
  @Post()
  @ApiOperation({ summary: 'Send a message' })
  @ApiResponse({ status: 201, description: 'Message sent' })
  @ApiResponse({ status: 400, description: 'Invalid content or no worker assigned' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  createMessage(
    @Body() dto: CreateMessageDto,
    @Request() req: any,
  ) {
    return this.messagesService.createMessage(dto.missionId, req.user.sub, dto);
  }

  /**
   * PATCH /api/v1/messages/read/:missionId
   * Marquer les messages comme lus
   */
  @Patch('read/:missionId')
  @ApiOperation({ summary: 'Mark messages as read' })
  @ApiParam({ name: 'missionId', description: 'Mission ID' })
  @ApiResponse({ status: 200, description: 'Messages marked as read' })
  markAsRead(@Param('missionId') missionId: string, @Request() req: any) {
    return this.messagesService.markAsRead(missionId, req.user.sub);
  }

  /**
   * GET /api/v1/messages/unread-count
   * Compter les messages non lus
   */
  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread messages count' })
  @ApiResponse({ status: 200, description: 'Unread count' })
  getUnreadCount(@Request() req: any) {
    return this.messagesService.getUnreadCount(req.user.sub);
  }
}

