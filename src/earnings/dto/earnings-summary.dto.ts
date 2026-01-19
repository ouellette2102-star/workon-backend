import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for earnings summary response.
 *
 * All amounts are in CAD (or configured currency).
 * Commission rate is configured server-side (not exposed).
 *
 * PR-EARNINGS: Earnings module implementation.
 */
export class EarningsSummaryDto {
  @ApiProperty({
    description: 'Total lifetime gross earnings (before commission)',
    example: 5000.0,
  })
  totalLifetimeGross: number;

  @ApiProperty({
    description: 'Total lifetime net earnings (after commission)',
    example: 4250.0,
  })
  totalLifetimeNet: number;

  @ApiProperty({
    description: 'Total amount already paid out to worker',
    example: 3000.0,
  })
  totalPaid: number;

  @ApiProperty({
    description: 'Amount pending (completed missions, not yet paid)',
    example: 1000.0,
  })
  totalPending: number;

  @ApiProperty({
    description: 'Amount available for payout (net, after commission)',
    example: 850.0,
  })
  totalAvailable: number;

  @ApiProperty({
    description: 'Number of completed missions (lifetime)',
    example: 25,
  })
  completedMissionsCount: number;

  @ApiProperty({
    description: 'Number of paid missions (lifetime)',
    example: 20,
  })
  paidMissionsCount: number;

  @ApiProperty({
    description: 'Commission rate applied (0.0 - 1.0)',
    example: 0.15,
  })
  commissionRate: number;

  @ApiProperty({
    description: 'Currency code',
    example: 'CAD',
  })
  currency: string;
}

