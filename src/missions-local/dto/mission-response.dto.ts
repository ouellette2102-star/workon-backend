import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

export enum MissionStatus {
  OPEN = 'open',
  ASSIGNED = 'assigned',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Exclude()
export class MissionResponseDto {
  @Expose()
  @ApiProperty({ example: 'cly123...' })
  id: string;

  @Expose()
  @ApiProperty({ example: 'Déneigement entrée résidentielle' })
  title: string;

  @Expose()
  @ApiProperty({ example: 'Besoin de déneiger une entrée de 20 mètres' })
  description: string;

  @Expose()
  @ApiProperty({ example: 'snow_removal' })
  category: string;

  @Expose()
  @ApiProperty({ example: 'open', enum: MissionStatus })
  status: string;

  @Expose()
  @ApiProperty({ example: 75.0 })
  price: number;

  @Expose()
  @ApiProperty({ example: 45.5017 })
  latitude: number;

  @Expose()
  @ApiProperty({ example: -73.5673 })
  longitude: number;

  @Expose()
  @ApiProperty({ example: 'Montréal' })
  city: string;

  @Expose()
  @ApiProperty({ example: '123 rue Example', nullable: true })
  address: string | null;

  @Expose()
  @ApiProperty({ example: 'cly_employer123' })
  createdByUserId: string;

  @Expose()
  @ApiProperty({ example: 'cly_worker456', nullable: true })
  assignedToUserId: string | null;

  @Expose()
  @ApiProperty({ example: 2.5, nullable: true })
  distanceKm?: number | null;

  @Expose()
  @ApiProperty({ example: '2024-11-18T18:00:00.000Z' })
  createdAt: Date;

  @Expose()
  @ApiProperty({ example: '2024-11-18T18:00:00.000Z' })
  updatedAt: Date;
}

