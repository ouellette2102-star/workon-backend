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

/**
 * Messages Controller - Messagerie entre parties
 *
 * Endpoints pour la communication entre employeurs et travailleurs
 * dans le contexte d'une mission. Chaque conversation est liée à une mission.
 */
@ApiTags('Messages')
@ApiBearerAuth('JWT')
@Controller('api/v1/messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  /**
   * GET /api/v1/messages/conversations
   * List all conversations for the current user.
   */
  @Get('conversations')
  @ApiOperation({
    summary: 'Get all conversations',
    description:
      'Returns all chat threads where the user is involved (as employer or worker). ' +
      'Each conversation is linked to a mission. ' +
      'Sorted by most recent message first. Includes unread count for each conversation.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of conversations with metadata',
    type: [ConversationResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid or missing JWT token' })
  getConversations(@Request() req: any) {
    return this.messagesService.getConversations(req.user.sub);
  }

  /**
   * GET /api/v1/messages/thread/:missionId
   * Get all messages for a mission conversation
   */
  @Get('thread/:missionId')
  @ApiOperation({
    summary: 'Get messages for a mission',
    description:
      'Returns all messages in a conversation linked to a specific mission. ' +
      'Only the employer (mission creator) and assigned worker can access the thread. ' +
      'Messages are sorted by creation time (oldest first).',
  })
  @ApiParam({
    name: 'missionId',
    description: 'Mission ID to get messages for',
    example: 'local_1705678901234_abc',
  })
  @ApiResponse({
    status: 200,
    description: 'List of messages in chronological order',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'msg_abc123' },
          missionId: { type: 'string', example: 'local_1705678901234_abc' },
          senderId: { type: 'string', example: 'user_xyz789' },
          senderRole: { type: 'string', enum: ['EMPLOYER', 'WORKER'] },
          content: { type: 'string', example: 'Bonjour, je suis disponible.' },
          read: { type: 'boolean', example: false },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid or missing JWT token' })
  @ApiResponse({ status: 403, description: 'Access denied - not a participant of this mission' })
  @ApiResponse({ status: 404, description: 'Mission not found' })
  getMessages(@Param('missionId') missionId: string, @Request() req: any) {
    return this.messagesService.getMessagesForMission(missionId, req.user.sub);
  }

  /**
   * POST /api/v1/messages
   * Send a new message in a mission conversation
   */
  @Post()
  @ApiOperation({
    summary: 'Send a message',
    description:
      'Sends a message in a mission conversation. ' +
      'The mission must have an assigned worker (status: assigned, in_progress, or completed). ' +
      'Triggers a push notification to the recipient if they have a registered device.',
  })
  @ApiResponse({
    status: 201,
    description: 'Message sent successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: 'msg_abc123' },
        missionId: { type: 'string' },
        senderId: { type: 'string' },
        senderRole: { type: 'string', enum: ['EMPLOYER', 'WORKER'] },
        content: { type: 'string' },
        read: { type: 'boolean', example: false },
        createdAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid content or mission has no assigned worker' })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid or missing JWT token' })
  @ApiResponse({ status: 403, description: 'Access denied - not a participant of this mission' })
  @ApiResponse({ status: 404, description: 'Mission not found' })
  createMessage(
    @Body() dto: CreateMessageDto,
    @Request() req: any,
  ) {
    return this.messagesService.createMessage(dto.missionId, req.user.sub, dto);
  }

  /**
   * PATCH /api/v1/messages/read/:missionId
   * Mark all messages in a conversation as read
   */
  @Patch('read/:missionId')
  @ApiOperation({
    summary: 'Mark messages as read',
    description:
      'Marks all messages in a conversation as read for the authenticated user. ' +
      'Only marks messages sent by the other participant (not your own messages).',
  })
  @ApiParam({
    name: 'missionId',
    description: 'Mission ID to mark messages as read',
    example: 'local_1705678901234_abc',
  })
  @ApiResponse({
    status: 200,
    description: 'Messages marked as read',
    schema: {
      type: 'object',
      properties: {
        count: { type: 'number', example: 5, description: 'Number of messages marked as read' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid or missing JWT token' })
  @ApiResponse({ status: 403, description: 'Access denied - not a participant of this mission' })
  markAsRead(@Param('missionId') missionId: string, @Request() req: any) {
    return this.messagesService.markAsRead(missionId, req.user.sub);
  }

  /**
   * GET /api/v1/messages/unread-count
   * Get total unread messages count for user
   */
  @Get('unread-count')
  @ApiOperation({
    summary: 'Get unread messages count',
    description:
      'Returns the total number of unread messages across all conversations. ' +
      'Useful for displaying a badge/counter in the app.',
  })
  @ApiResponse({
    status: 200,
    description: 'Total unread count',
    schema: {
      type: 'object',
      properties: {
        count: { type: 'number', example: 3, description: 'Total unread messages' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid or missing JWT token' })
  getUnreadCount(@Request() req: any) {
    return this.messagesService.getUnreadCount(req.user.sub);
  }
}

