import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateMessageDto {
  @IsString()
  @IsNotEmpty({ message: 'Le message ne peut pas être vide' })
  @MaxLength(2000, { message: 'Le message ne peut pas dépasser 2000 caractères' })
  content!: string;
}

