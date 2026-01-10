import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LocalOfferStatus, LocalMissionStatus } from '@prisma/client';

export class OfferWorkerDto {
  @ApiProperty({ example: 'local_1234567890_abc123' })
  id: string;

  @ApiProperty({ example: 'John' })
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  lastName: string;

  @ApiProperty({ example: 'Paris', required: false, nullable: true })
  city: string | null;
}

/**
 * PR-S5: Mission details for /offers/mine endpoint
 */
export class OfferMissionDto {
  @ApiProperty({ example: 'local_1234567890_abc123' })
  id: string;

  @ApiProperty({ example: 'Réparer robinet' })
  title: string;

  @ApiProperty({ example: 'Le robinet fuit...' })
  description: string;

  @ApiProperty({ example: 'plumbing' })
  category: string;

  @ApiProperty({ example: 150.00 })
  price: number;

  @ApiProperty({ example: 'Montréal' })
  city: string;

  @ApiProperty({ enum: ['open', 'assigned', 'in_progress', 'completed', 'cancelled'] })
  status: LocalMissionStatus;

  @ApiProperty({ example: '2024-12-28T14:30:00.000Z' })
  createdAt: Date;
}

export class OfferResponseDto {
  @ApiProperty({
    description: 'Unique offer ID',
    example: 'offer_1234567890_abc123',
  })
  id: string;

  @ApiProperty({
    description: 'Mission ID',
    example: 'local_1234567890_abc123',
  })
  missionId: string;

  @ApiProperty({
    description: 'Worker ID who made the offer',
    example: 'local_1234567890_abc123',
  })
  workerId: string;

  @ApiProperty({
    description: 'Proposed price',
    example: 150.00,
  })
  price: number;

  @ApiProperty({
    description: 'Optional message',
    example: 'I can start tomorrow.',
    required: false,
    nullable: true,
  })
  message: string | null;

  @ApiProperty({
    description: 'Offer status',
    enum: ['PENDING', 'ACCEPTED', 'DECLINED'],
    example: 'PENDING',
  })
  status: LocalOfferStatus;

  @ApiPropertyOptional({
    description: 'Worker details (included in mission offers list)',
    type: OfferWorkerDto,
  })
  worker?: OfferWorkerDto;

  @ApiPropertyOptional({
    description: 'Mission details (included in my offers list)',
    type: OfferMissionDto,
  })
  mission?: OfferMissionDto;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-12-28T14:30:00.000Z',
  })
  createdAt: Date;
}

