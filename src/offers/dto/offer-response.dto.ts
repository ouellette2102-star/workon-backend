import { ApiProperty } from '@nestjs/swagger';
import { LocalOfferStatus } from '@prisma/client';

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

  @ApiProperty({
    description: 'Worker details',
    type: OfferWorkerDto,
  })
  worker: OfferWorkerDto;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-12-28T14:30:00.000Z',
  })
  createdAt: Date;
}

