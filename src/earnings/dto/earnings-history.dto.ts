import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, Min, Max, IsString } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Status of an earning transaction.
 */
export type EarningStatus = 'pending' | 'available' | 'paid';

/**
 * Single earning transaction item.
 *
 * PR-EARNINGS: Earnings module implementation.
 */
export class EarningTransactionDto {
  @ApiProperty({
    description: 'Unique transaction ID (same as mission ID)',
    example: 'local_1705678901234_abc',
  })
  id: string;

  @ApiProperty({
    description: 'Mission ID',
    example: 'local_1705678901234_abc',
  })
  missionId: string;

  @ApiProperty({
    description: 'Mission title',
    example: 'Déneigement entrée',
  })
  missionTitle: string;

  @ApiProperty({
    description: 'Client name (employer)',
    example: 'Jean Dupont',
  })
  clientName: string;

  @ApiProperty({
    description: 'Date of the transaction (mission completion)',
    example: '2026-01-15T10:30:00.000Z',
  })
  date: string;

  @ApiProperty({
    description: 'Gross amount (before commission)',
    example: 100.0,
  })
  grossAmount: number;

  @ApiProperty({
    description: 'Commission amount deducted',
    example: 15.0,
  })
  commissionAmount: number;

  @ApiProperty({
    description: 'Net amount (after commission)',
    example: 85.0,
  })
  netAmount: number;

  @ApiProperty({
    description: 'Transaction status',
    enum: ['pending', 'available', 'paid'],
    example: 'paid',
  })
  status: EarningStatus;

  @ApiPropertyOptional({
    description: 'Date when amount was paid out (if paid)',
    example: '2026-01-18T14:00:00.000Z',
  })
  paidAt?: string;

  @ApiProperty({
    description: 'Currency code',
    example: 'CAD',
  })
  currency: string;
}

/**
 * Query parameters for earnings history endpoint.
 */
export class EarningsHistoryQueryDto {
  @ApiPropertyOptional({
    description: 'Cursor for pagination (last item ID)',
    example: 'local_1705678901234_abc',
  })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({
    description: 'Number of items to return (default 20, max 100)',
    example: 20,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

/**
 * Response for earnings history endpoint (paginated).
 */
export class EarningsHistoryResponseDto {
  @ApiProperty({
    description: 'List of earning transactions',
    type: [EarningTransactionDto],
  })
  transactions: EarningTransactionDto[];

  @ApiPropertyOptional({
    description: 'Cursor for next page (null if no more items)',
    example: 'local_1705678901234_xyz',
  })
  nextCursor: string | null;

  @ApiProperty({
    description: 'Total count of transactions (for display)',
    example: 50,
  })
  totalCount: number;
}

/**
 * Response for earnings by mission endpoint.
 */
export class EarningsByMissionResponseDto extends EarningTransactionDto {
  @ApiProperty({
    description: 'Mission category',
    example: 'deneigement',
  })
  category: string;

  @ApiProperty({
    description: 'Mission city',
    example: 'Montréal',
  })
  city: string;

  @ApiPropertyOptional({
    description: 'Mission address',
    example: '123 Rue Exemple',
  })
  address?: string;
}

