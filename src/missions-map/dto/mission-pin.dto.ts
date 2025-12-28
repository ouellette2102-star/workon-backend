import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Mission pin DTO - lightweight for map display
 */
export class MissionPinDto {
  @ApiProperty({ example: 'lm_123456789_abc' })
  id: string;

  @ApiProperty({ example: 'Entretien ménager résidentiel' })
  title: string;

  @ApiProperty({ example: 'Entretien' })
  category: string;

  @ApiProperty({ example: 45.5017 })
  latitude: number;

  @ApiProperty({ example: -73.5673 })
  longitude: number;

  @ApiProperty({ example: 'Montréal' })
  city: string;

  @ApiProperty({ example: 75.0 })
  price: number;

  @ApiProperty({ example: 'open', enum: ['open', 'assigned', 'in_progress', 'completed', 'cancelled'] })
  status: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;
}

/**
 * Mission detail DTO - full details for mission page
 */
export class MissionDetailDto extends MissionPinDto {
  @ApiProperty({ example: 'Besoin d\'aide pour le ménage hebdomadaire' })
  description: string;

  @ApiPropertyOptional({ example: '123 rue Example, Montréal' })
  address: string | null;

  @ApiProperty({ example: '2024-01-01T10:00:00.000Z' })
  updatedAt: Date;
}

/**
 * Missions health response
 */
export class MissionsHealthDto {
  @ApiProperty({ example: 25 })
  totalMissions: number;

  @ApiProperty({ example: 10 })
  openMissions: number;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  timestamp: string;
}

