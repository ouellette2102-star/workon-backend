import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateLocalMessageDto {
  @ApiProperty({
    description: 'Mission ID',
    example: 'lm_1234567890_abc123',
  })
  @IsString()
  @IsNotEmpty()
  missionId: string;

  @ApiProperty({
    description: 'Message content',
    example: 'Bonjour, je suis intéressé par cette mission.',
    maxLength: 2000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content: string;
}
