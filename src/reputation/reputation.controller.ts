import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ReputationService } from './reputation.service';

@ApiTags('Reputation')
@Controller('api/v1/reputation')
export class ReputationController {
  constructor(private readonly reputationService: ReputationService) {}

  @Get('users/:id')
  @ApiOperation({
    summary: 'Get reputation block for a LocalUser',
    description:
      'Returns materialized trust score, rating average, review count and ' +
      'completion count. Updated automatically on review and mission events.',
  })
  @ApiParam({ name: 'id', description: 'LocalUser id' })
  @ApiResponse({ status: 200, description: 'Reputation block' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserReputation(@Param('id') id: string) {
    const reputation = await this.reputationService.getReputation(id);
    if (!reputation) {
      throw new NotFoundException('User not found');
    }
    return reputation;
  }
}
