import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEmail, Matches } from 'class-validator';

/**
 * Canadian phone regex: accepts +1XXXXXXXXXX, 1XXXXXXXXXX, XXXXXXXXXX, (XXX) XXX-XXXX
 * Strips formatting in the service layer.
 */
const CA_PHONE_REGEX = /^(\+?1?[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/;

export class CreateLeadDto {
  @ApiProperty({ example: 'Jean Tremblay' })
  @IsString()
  @IsNotEmpty({ message: 'Le nom du client est requis' })
  clientName: string;

  @ApiProperty({ example: '514-555-1234' })
  @IsString()
  @IsNotEmpty({ message: 'Le numéro de téléphone est requis' })
  @Matches(CA_PHONE_REGEX, {
    message: 'Numéro de téléphone canadien invalide',
  })
  clientPhone: string;

  @ApiPropertyOptional({ example: 'jean@example.com' })
  @IsOptional()
  @IsEmail({}, { message: 'Format de courriel invalide' })
  clientEmail?: string;

  @ApiProperty({ example: 'Entretien paysager' })
  @IsString()
  @IsNotEmpty({ message: 'Le service demandé est requis' })
  serviceRequested: string;

  @ApiPropertyOptional({ example: 'Je cherche un entretien régulier pour ma cour arrière' })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiProperty({ example: 'pro_abc123' })
  @IsString()
  @IsNotEmpty()
  professionalId: string;

  @ApiPropertyOptional({ example: 'facebook_ad' })
  @IsOptional()
  @IsString()
  source?: string;
}
