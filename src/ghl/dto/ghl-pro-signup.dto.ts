import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsOptional,
  IsArray,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for GHL worker (pro) signup webhook payload
 * Received from GoHighLevel via N8N workflow
 */
export class GhlProSignupDto {
  @ApiProperty({ example: 'Jean', description: 'First name' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Tremblay', description: 'Last name' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: 'jean@email.com', description: 'Email' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiPropertyOptional({ example: '+15145551234', description: 'Phone number' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: 'Montréal', description: 'City' })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ example: ['plumbing', 'handyman'], description: 'Service categories' })
  @IsArray()
  @IsOptional()
  categories?: string[];

  @ApiPropertyOptional({ example: 'ghl_contact_456', description: 'GHL contact ID' })
  @IsString()
  @IsOptional()
  ghlContactId?: string;

  @ApiPropertyOptional({ example: 'facebook', description: 'Acquisition source' })
  @IsString()
  @IsOptional()
  source?: string;
}
