import { ApiProperty } from '@nestjs/swagger';

/**
 * Home stats response - aggregated metrics for the Home page
 * Public endpoint - no authentication required
 */
export class HomeStatsResponseDto {
  @ApiProperty({
    example: 182,
    description: 'Number of completed service contracts',
  })
  completedContracts: number;

  @ApiProperty({
    example: 2453,
    description: 'Number of active workers (candidates)',
  })
  activeWorkers: number;

  @ApiProperty({
    example: 24,
    description: 'Number of open service calls (available missions)',
  })
  openServiceCalls: number;
}
