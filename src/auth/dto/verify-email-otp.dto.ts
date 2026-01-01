import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Length, MaxLength, Matches } from 'class-validator';

/**
 * Request DTO for POST /auth/verify-email-otp
 */
export class VerifyEmailOtpDto {
  @ApiProperty({
    description: 'New email address that was requested',
    example: 'newemail@example.com',
  })
  @IsEmail({}, { message: 'Format d\'email invalide' })
  @IsNotEmpty({ message: 'L\'email est requis' })
  @MaxLength(255, { message: 'L\'email est trop long' })
  newEmail: string;

  @ApiProperty({
    description: '6-digit OTP code received by email',
    example: '123456',
  })
  @IsString({ message: 'Le code doit être une chaîne' })
  @IsNotEmpty({ message: 'Le code est requis' })
  @Length(6, 6, { message: 'Le code doit contenir exactement 6 chiffres' })
  @Matches(/^\d{6}$/, { message: 'Le code doit contenir exactement 6 chiffres' })
  code: string;
}

/**
 * Response DTO for POST /auth/verify-email-otp
 */
export class VerifyEmailOtpResponseDto {
  @ApiProperty({ description: 'Operation success status', example: true })
  ok: boolean;

  @ApiProperty({
    description: 'Human-readable message',
    example: 'Email successfully updated.',
    required: false,
  })
  message?: string;

  @ApiProperty({
    description: 'Error code if ok=false',
    example: 'OTP_INVALID',
    required: false,
    enum: ['OTP_INVALID', 'OTP_EXPIRED', 'OTP_LOCKED', 'OTP_NOT_FOUND', 'EMAIL_IN_USE'],
  })
  errorCode?: string;
}

