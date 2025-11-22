import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RatioResponseDto {
  @ApiPropertyOptional({
    example: 'Montréal',
    description: 'Region name (null if global)',
    nullable: true,
  })
  region: string | null;

  @ApiProperty({
    example: 150,
    description: 'Number of workers in the region',
  })
  workers: number;

  @ApiProperty({
    example: 75,
    description: 'Number of employers in the region',
  })
  employers: number;

  @ApiProperty({
    example: 25,
    description: 'Number of residential clients in the region',
  })
  residentialClients: number;

  @ApiProperty({
    example: 2.0,
    description: 'Worker to employer ratio',
  })
  workerToEmployerRatio: number;
}

