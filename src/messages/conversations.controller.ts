import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MessagesService } from './messages.service';
import { CreateConversationMessageDto } from './dto/create-conversation-message.dto';

@ApiTags('Conversations')
@ApiBearerAuth()
@Controller('api/v1/conversations')
@UseGuards(JwtAuthGuard)
export class ConversationsController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get()
  @ApiOperation({ summary: 'Get conversations for current user' })
  @ApiResponse({ status: 200, description: 'List of conversations' })
  getConversations(@Request() req: any) {
    const userId = req.user.userId || req.user.sub;
    return this.messagesService.getLocalConversations(userId);
  }

  @Get(':missionId/messages')
  @ApiOperation({ summary: 'Get messages for a local mission' })
  @ApiParam({ name: 'missionId', description: 'Local mission ID' })
  @ApiResponse({ status: 200, description: 'List of messages' })
  getMessages(@Param('missionId') missionId: string, @Request() req: any) {
    const userId = req.user.userId || req.user.sub;
    return this.messagesService.getLocalMessagesForMission(missionId, userId);
  }

  @Post(':missionId/messages')
  @ApiOperation({ summary: 'Send message for a local mission' })
  @ApiParam({ name: 'missionId', description: 'Local mission ID' })
  @ApiResponse({ status: 201, description: 'Message sent' })
  createMessage(
    @Param('missionId') missionId: string,
    @Body() dto: CreateConversationMessageDto,
    @Request() req: any,
  ) {
    const userId = req.user.userId || req.user.sub;
    return this.messagesService.createLocalMessage(missionId, userId, dto.text);
  }
}

