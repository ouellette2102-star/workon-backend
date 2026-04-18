import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ConversationsService } from './conversations.service';
import { SendConversationMessageDto } from './dto/send-message.dto';

@ApiTags('Conversations')
@ApiBearerAuth()
@Controller('api/v1/conversations')
@UseGuards(JwtAuthGuard)
export class ConversationsController {
  constructor(private readonly conversations: ConversationsService) {}

  @Get()
  @ApiOperation({ summary: 'List my conversations' })
  @ApiResponse({ status: 200 })
  async list(@Request() req: { user: { sub: string } }) {
    return this.conversations.listForUser(req.user.sub);
  }

  @Get(':id/messages')
  @ApiOperation({ summary: 'Get messages in a conversation' })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  async getMessages(
    @Request() req: { user: { sub: string } },
    @Param('id') id: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.conversations.getMessages(id, req.user.sub, {
      cursor,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Post(':id/messages')
  @ApiOperation({ summary: 'Send a message in a conversation' })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiResponse({ status: 201 })
  async sendMessage(
    @Request() req: { user: { sub: string } },
    @Param('id') id: string,
    @Body() dto: SendConversationMessageDto,
  ) {
    return this.conversations.sendMessage(id, req.user.sub, dto.content);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark messages in a conversation as read' })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  async markRead(
    @Request() req: { user: { sub: string } },
    @Param('id') id: string,
  ) {
    return this.conversations.markAsRead(id, req.user.sub);
  }
}
