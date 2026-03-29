import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  IsOptional,
  IsLatitude,
  IsLongitude,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMissionDto {
  @ApiProperty({
    example: 'Déneigement entrée résidentielle',
    description: 'Mission title',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    example: 'Besoin de déneiger une entrée de 20 mètres',
    description: 'Detailed mission description',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    example: 'snow_removal',
    description: 'Mission category',
    enum: [
      'cleaning',
      'snow_removal',
      'moving',
      'handyman',
      'gardening',
      'painting',
      'delivery',
      'other',
    ],
  })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiProperty({
    example: 7500,
    description: 'Mission price in cents (e.g. 7500 = $75.00 CAD)',
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  priceCents: number;

  @ApiProperty({
    example: 45.5017,
    description: 'Mission latitude',
  })
  @IsLatitude()
  latitude: number;

  @ApiProperty({
    example: -73.5673,
    description: 'Mission longitude',
  })
  @IsLongitude()
  longitude: number;

  @ApiProperty({
    example: 'Montréal',
    description: 'City/region',
  })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiPropertyOptional({
    example: '123 rue Example',
    description: 'Full address (optional)',
  })
  @IsString()
  @IsOptional()
  address?: string;
}

