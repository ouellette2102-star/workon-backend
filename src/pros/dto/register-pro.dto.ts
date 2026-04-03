import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEmail, Matches, MinLength } from 'class-validator';

export class RegisterProDto {
  @ApiProperty({ example: 'Marc' })
  @IsString()
  @IsNotEmpty({ message: 'Le prénom est requis' })
  firstName: string;

  @ApiProperty({ example: 'Dubois' })
  @IsString()
  @IsNotEmpty({ message: 'Le nom est requis' })
  lastName: string;

  @ApiProperty({ example: 'marc@example.com' })
  @IsEmail({}, { message: 'Format de courriel invalide' })
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: '514-555-9876' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^(\+?1?[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/, {
    message: 'Numéro de téléphone canadien invalide',
  })
  phone: string;

  @ApiProperty({ example: 'Montréal' })
  @IsString()
  @IsNotEmpty({ message: 'La ville est requise' })
  city: string;

  @ApiProperty({ example: 'paysagement', description: 'Service category' })
  @IsString()
  @IsNotEmpty({ message: 'La catégorie de service est requise' })
  category: string;

  @ApiPropertyOptional({ example: 'Paysagiste professionnel avec 10 ans d\'expérience' })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({ example: 25 })
  @IsOptional()
  serviceRadiusKm?: number;

  @ApiPropertyOptional({ example: 'Secure123!' })
  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'Le mot de passe doit avoir au moins 8 caractères' })
  password?: string;
}
