import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO pour la demande de reset password
 * 
 * POST /api/v1/auth/forgot-password
 */
export class ForgotPasswordDto {
  @ApiProperty({
    description: 'Email de l\'utilisateur',
    example: 'user@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

/**
 * Réponse pour forgot-password
 * Toujours succès pour éviter l'énumération d'emails
 */
export class ForgotPasswordResponseDto {
  @ApiProperty({
    description: 'Message de confirmation',
    example: 'Si cet email existe, un lien de réinitialisation a été envoyé.',
  })
  message: string;
}

