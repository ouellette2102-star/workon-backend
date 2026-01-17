import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateConversationMessageDto {
  @ApiProperty({ description: 'Message text' })
  @IsString()
  @IsNotEmpty()
  text: string;
}

