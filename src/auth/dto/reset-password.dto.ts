import { IsString, IsNotEmpty, MinLength, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO pour réinitialiser le mot de passe
 * 
 * POST /api/v1/auth/reset-password
 */
export class ResetPasswordDto {
  @ApiProperty({
    description: 'Email de l\'utilisateur',
    example: 'user@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Token de réinitialisation reçu par email',
    example: 'a1b2c3d4e5f6...',
  })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({
    description: 'Nouveau mot de passe (min 8 caractères)',
    example: 'NewSecurePassword123!',
    minLength: 8,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  newPassword: string;
}

/**
 * Réponse pour reset-password
 */
export class ResetPasswordResponseDto {
  @ApiProperty({
    description: 'Succès de la réinitialisation',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Message de confirmation',
    example: 'Mot de passe réinitialisé avec succès.',
  })
  message: string;
}

