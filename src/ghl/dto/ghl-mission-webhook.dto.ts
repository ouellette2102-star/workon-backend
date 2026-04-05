import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsLatitude,
  IsLongitude,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * DTO for GHL mission webhook payload
 * Received from GoHighLevel via N8N workflow.
 *
 * Accepts BOTH formats:
 * - CamelCase (pre-mapped by N8N): title, description, category, price, etc.
 * - Snake_case (raw GHL form fields): full_name, service_type, ville, etc.
 *
 * The service normalizes all fields before creating the mission.
 * All fields are optional because GHL payloads vary by form configuration.
 */
export class GhlMissionWebhookDto {
  // === CamelCase fields (pre-mapped by N8N or well-configured webhook) ===

  @ApiPropertyOptional({ example: 'Déneigement entrée', description: 'Mission title' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ example: 'Besoin de déneiger une entrée de 20m', description: 'Mission description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'snow_removal', description: 'Mission category' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ example: 75.0, description: 'Price in CAD' })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ example: 45.5017, description: 'Latitude' })
  @Type(() => Number)
  @IsOptional()
  latitude?: number;

  @ApiPropertyOptional({ example: -73.5673, description: 'Longitude' })
  @Type(() => Number)
  @IsOptional()
  longitude?: number;

  @ApiPropertyOptional({ example: 'Montréal', description: 'City' })
  @IsString()
  @IsOptional()
  city?: string;

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

  // === Snake_case aliases (raw GHL form field names) ===
  // N8N may forward GHL payloads without transforming field names.
  // The service checks both camelCase and snake_case for each field.

  @IsString()
  @IsOptional()
  full_name?: string;

  @IsString()
  @IsOptional()
  first_name?: string;

  @IsString()
  @IsOptional()
  last_name?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  service_type?: string;

  @IsString()
  @IsOptional()
  type_de_service?: string;

  @IsString()
  @IsOptional()
  message?: string;

  @IsString()
  @IsOptional()
  ville?: string;

  @IsOptional()
  budget?: any;
}
