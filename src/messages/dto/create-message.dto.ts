import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMessageDto {
  @ApiProperty({
    description: 'Mission ID',
    example: 'mission_123456789',
  })
  @IsString()
  @IsNotEmpty({ message: 'Le missionId est requis' })
  missionId!: string;

  @ApiProperty({
    description: 'Message content',
    example: 'Bonjour, je suis disponible pour cette mission.',
    maxLength: 2000,
  })
  @IsString()
  @IsNotEmpty({ message: 'Le message ne peut pas être vide' })
  @MaxLength(2000, { message: 'Le message ne peut pas dépasser 2000 caractères' })
  content!: string;
}

