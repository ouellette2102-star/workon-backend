import { IsOptional, IsString, IsNumber, IsLatitude, IsLongitude } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UpdateUserProfileDto {
  @ApiPropertyOptional({
    example: 'John',
    description: 'User first name',
  })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional({
    example: 'Doe',
    description: 'User last name',
  })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional({
    example: '+1 514 555 0100',
    description: 'User phone number',
  })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({
    example: 'Montréal',
    description: 'User city/region',
  })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ example: 45.5017, description: 'Worker latitude for geolocation' })
  @Type(() => Number)
  @IsLatitude()
  @IsOptional()
  latitude?: number;

  @ApiPropertyOptional({ example: -73.5673, description: 'Worker longitude for geolocation' })
  @Type(() => Number)
  @IsLongitude()
  @IsOptional()
  longitude?: number;
}

