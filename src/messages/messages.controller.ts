import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('missions/:missionId/messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get()
  getMessages(@Param('missionId') missionId: string, @Request() req: any) {
    return this.messagesService.getMessagesForMission(missionId, req.user.sub);
  }

  @Post()
  createMessage(
    @Param('missionId') missionId: string,
    @Request() req: any,
    @Body() dto: CreateMessageDto,
  ) {
    return this.messagesService.createMessage(missionId, req.user.sub, dto);
  }
}

