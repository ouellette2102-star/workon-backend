import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class WorkerBadgeDto {
  @ApiProperty({ example: 'Fiable' })
  label: string;

  @ApiProperty({ example: 'reliable' })
  type: string;
}

export class WorkerProfileResponseDto {
  @ApiProperty({ description: 'LocalUser ID' })
  id: string;

  @ApiProperty({ example: 'Marc' })
  firstName: string;

  @ApiProperty({ example: 'Dubois' })
  lastName: string;

  @ApiPropertyOptional({ example: 'Marc Dubois' })
  fullName?: string;

  @ApiPropertyOptional({ example: 'Paysagiste' })
  jobTitle?: string;

  @ApiPropertyOptional({ example: 'Montréal' })
  city?: string;

  @ApiPropertyOptional({ example: 'https://storage.../photo.jpg' })
  photoUrl?: string;

  @ApiProperty({ example: 4.8 })
  averageRating: number;

  @ApiProperty({ example: 96 })
  completionPercentage: number;

  @ApiProperty({ example: 52 })
  reviewCount: number;

  @ApiProperty({ example: 182 })
  completedMissions: number;

  @ApiProperty({ type: [WorkerBadgeDto] })
  badges: WorkerBadgeDto[];

  @ApiPropertyOptional({ example: 4500 })
  hourlyRateCents?: number;
}

export class WorkersListResponseDto {
  @ApiProperty({ type: [WorkerProfileResponseDto] })
  workers: WorkerProfileResponseDto[];

  @ApiProperty({ example: 42 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;
}
