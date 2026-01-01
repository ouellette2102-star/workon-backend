import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

/**
 * Request DTO for POST /auth/change-email
 */
export class ChangeEmailDto {
  @ApiProperty({
    description: 'New email address to change to',
    example: 'newemail@example.com',
  })
  @IsEmail({}, { message: 'Format d\'email invalide' })
  @IsNotEmpty({ message: 'L\'email est requis' })
  @MaxLength(255, { message: 'L\'email est trop long' })
  newEmail: string;
}

/**
 * Response DTO for POST /auth/change-email
 */
export class ChangeEmailResponseDto {
  @ApiProperty({ description: 'Operation success status', example: true })
  ok: boolean;

  @ApiProperty({
    description: 'Human-readable message',
    example: 'If this email is available, a verification code was sent.',
  })
  message: string;

  @ApiProperty({
    description: 'Error code if ok=false',
    example: 'EMAIL_IN_USE',
    required: false,
    enum: ['EMAIL_IN_USE', 'RATE_LIMITED', 'INVALID_EMAIL'],
  })
  errorCode?: string;
}

