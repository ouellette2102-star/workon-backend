import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class VerifyEmailOtpDto {
  @ApiProperty({ description: 'New email address' })
  @IsEmail()
  @IsNotEmpty()
  newEmail: string;

  @ApiProperty({ description: 'Verification code (OTP)' })
  @IsNotEmpty()
  code: string;
}

