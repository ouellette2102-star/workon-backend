import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class ChangeEmailDto {
  @ApiProperty({ description: 'New email address' })
  @IsEmail()
  @IsNotEmpty()
  newEmail: string;
}

