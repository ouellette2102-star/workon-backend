import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Mission pin DTO - lightweight payload for map markers
 * Used by frontend to display mission pins on the map without loading full details
 */
export class MissionPinDto {
  @ApiProperty({
    description: 'Unique mission identifier',
    example: 'lm_123456789_abc',
  })
  id: string;

  @ApiProperty({
    description: 'Mission title (displayed on pin tooltip)',
    example: 'Entretien ménager résidentiel',
  })
  title: string;

  @ApiProperty({
    description: 'Category name in French (matches catalog categories)',
    example: 'Entretien',
  })
  category: string;

  @ApiProperty({
    description: 'GPS latitude coordinate for map pin placement',
    example: 45.5017,
    minimum: -90,
    maximum: 90,
  })
  latitude: number;

  @ApiProperty({
    description: 'GPS longitude coordinate for map pin placement',
    example: -73.5673,
    minimum: -180,
    maximum: 180,
  })
  longitude: number;

  @ApiProperty({
    description: 'City name for display and filtering',
    example: 'Montréal',
  })
  city: string;

  @ApiProperty({
    description: 'Mission price in CAD',
    example: 75.0,
    minimum: 0,
  })
  price: number;

  @ApiProperty({
    description: 'Current mission status',
    example: 'open',
    enum: ['open', 'assigned', 'in_progress', 'completed', 'cancelled'],
  })
  status: string;

  @ApiProperty({
    description: 'Mission creation timestamp (ISO 8601)',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt: Date;
}

/**
 * Mission detail DTO - full mission information for detail page
 * Extends MissionPinDto with additional fields for the mission detail view
 */
export class MissionDetailDto extends MissionPinDto {
  @ApiProperty({
    description: 'Full mission description with requirements and context',
    example: "Besoin d'aide pour le ménage hebdomadaire",
  })
  description: string;

  @ApiPropertyOptional({
    description: 'Approximate address or area (privacy-safe, no exact location)',
    example: '123 rue Example, Montréal',
    nullable: true,
  })
  address: string | null;

  @ApiProperty({
    description: 'Last update timestamp (ISO 8601)',
    example: '2024-01-01T10:00:00.000Z',
  })
  updatedAt: Date;
}

/**
 * Missions health response - service monitoring data
 * Used for health checks and dashboard monitoring
 */
export class MissionsHealthDto {
  @ApiProperty({
    description: 'Total number of missions in the database',
    example: 25,
  })
  totalMissions: number;

  @ApiProperty({
    description: 'Number of missions with status "open" (available for workers)',
    example: 10,
  })
  openMissions: number;

  @ApiProperty({
    description: 'Timestamp of this health check (ISO 8601)',
    example: '2024-01-01T00:00:00.000Z',
  })
  timestamp: string;
}

