import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Equals } from 'class-validator';

/**
 * DTO for account deletion request
 * 
 * Requires explicit confirmation to prevent accidental deletions.
 */
export class DeleteAccountDto {
  @ApiProperty({
    description: 'Confirmation string - must be exactly "DELETE" to proceed',
    example: 'DELETE',
  })
  @IsString({ message: 'La confirmation doit être une chaîne de caractères' })
  @Equals('DELETE', { message: 'Veuillez saisir "DELETE" pour confirmer la suppression' })
  confirm: string;
}

/**
 * Response DTO for account deletion
 */
export class DeleteAccountResponseDto {
  @ApiProperty({
    description: 'Whether the operation was successful',
    example: true,
  })
  ok: boolean;

  @ApiPropertyOptional({
    description: 'Success or error message',
    example: 'Votre compte a été supprimé.',
  })
  message?: string;

  @ApiPropertyOptional({
    description: 'Error code for programmatic handling',
    example: 'CONFIRM_REQUIRED',
    enum: ['CONFIRM_REQUIRED', 'ACCOUNT_NOT_FOUND', 'DELETION_FAILED'],
  })
  errorCode?: string;
}

