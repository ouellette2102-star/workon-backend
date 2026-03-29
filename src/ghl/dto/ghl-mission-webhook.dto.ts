import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsLatitude,
  IsLongitude,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * DTO for GHL mission webhook payload
 * Received from GoHighLevel via N8N workflow
 */
export class GhlMissionWebhookDto {
  @ApiProperty({ example: 'Déneigement entrée', description: 'Mission title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'Besoin de déneiger une entrée de 20m', description: 'Mission description' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: 'snow_removal', description: 'Mission category' })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiProperty({ example: 7500, description: 'Price in cents (e.g. 7500 = $75.00 CAD)' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  priceCents: number;

  @ApiProperty({ example: 45.5017, description: 'Latitude' })
  @Type(() => Number)
  @IsLatitude()
  latitude: number;

  @ApiProperty({ example: -73.5673, description: 'Longitude' })
  @Type(() => Number)
  @IsLongitude()
  longitude: number;

  @ApiProperty({ example: 'Montréal', description: 'City' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiPropertyOptional({ example: '123 rue Example', description: 'Address' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ example: 'ghl_contact_123', description: 'GHL contact ID' })
  @IsString()
  @IsOptional()
  ghlContactId?: string;

  @ApiPropertyOptional({ example: 'client@email.com', description: 'Client email from GHL' })
  @IsString()
  @IsOptional()
  clientEmail?: string;

  @ApiPropertyOptional({ example: 'Jean Tremblay', description: 'Client name from GHL' })
  @IsString()
  @IsOptional()
  clientName?: string;
}
