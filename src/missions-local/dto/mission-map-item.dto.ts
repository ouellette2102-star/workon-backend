import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

/**
 * Lightweight mission DTO for map pins
 * 
 * Contains only essential fields for rendering map markers.
 * Full details should be fetched via GET /missions/:id
 */
export class MissionMapItemDto {
  @ApiProperty({ description: 'Mission ID', example: 'lm_1234567890_abc123' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'Mission title', example: 'Fix leaking faucet' })
  @Expose()
  title: string;

  @ApiProperty({ description: 'Mission category', example: 'plumbing' })
  @Expose()
  category: string;

  @ApiProperty({ description: 'Latitude', example: 45.5017 })
  @Expose()
  latitude: number;

  @ApiProperty({ description: 'Longitude', example: -73.5673 })
  @Expose()
  longitude: number;

  @ApiProperty({ description: 'Mission status', example: 'open' })
  @Expose()
  status: string;

  @ApiProperty({ description: 'Price/Rate in CAD', example: 150.0 })
  @Expose()
  price: number;

  @ApiPropertyOptional({ description: 'City name', example: 'Montreal' })
  @Expose()
  city?: string;

  @ApiProperty({ description: 'Creation timestamp', example: '2024-12-26T12:00:00.000Z' })
  @Expose()
  createdAt: Date;
}

/**
 * Response wrapper for map endpoint
 */
export class MissionsMapResponseDto {
  @ApiProperty({
    description: 'List of missions within bounding box',
    type: [MissionMapItemDto],
  })
  missions: MissionMapItemDto[];

  @ApiProperty({
    description: 'Total count of missions returned',
    example: 42,
  })
  count: number;

  @ApiProperty({
    description: 'Bounding box used for query',
    example: { north: 45.55, south: 45.45, east: -73.5, west: -73.7 },
  })
  bbox: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
}

