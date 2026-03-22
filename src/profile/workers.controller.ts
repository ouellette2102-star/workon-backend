import {
  Controller,
  Get,
  Param,
  Query,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { WorkersService } from './workers.service';
import {
  WorkerProfileResponseDto,
  WorkersListResponseDto,
} from './dto/worker-profile-response.dto';

@ApiTags('Profiles')
@Controller('api/v1/profiles')
export class WorkersController {
  constructor(private readonly workersService: WorkersService) {}

  /**
   * GET /api/v1/profiles/workers
   * Public — no auth required.
   * Returns paginated list of active workers with ratings and badges.
   */
  @Get('workers')
  @ApiOperation({
    summary: 'List active workers',
    description:
      'Returns paginated list of active workers with ratings, badges, and completion stats. Public endpoint.',
  })
  @ApiQuery({ name: 'city', required: false, example: 'Montréal' })
  @ApiQuery({ name: 'category', required: false, example: 'Paysagisme' })
  @ApiQuery({ name: 'limit', required: false, example: 20, type: Number })
  @ApiQuery({ name: 'page', required: false, example: 1, type: Number })
  @ApiResponse({ status: 200, type: WorkersListResponseDto })
  async getWorkers(
    @Query('city') city?: string,
    @Query('category') category?: string,
    @Query('limit') limit?: string,
    @Query('page') page?: string,
  ): Promise<WorkersListResponseDto> {
    return this.workersService.getWorkers({
      city,
      category,
      limit: limit ? parseInt(limit, 10) : undefined,
      page: page ? parseInt(page, 10) : undefined,
    });
  }

  /**
   * GET /api/v1/profiles/workers/:id
   * Public — no auth required.
   * Returns the public profile of a single worker.
   */
  @Get('workers/:id')
  @ApiOperation({ summary: 'Get a single worker public profile' })
  @ApiParam({ name: 'id', description: 'Worker LocalUser ID' })
  @ApiResponse({ status: 200, type: WorkerProfileResponseDto })
  @ApiResponse({ status: 404, description: 'Worker not found' })
  async getWorkerById(
    @Param('id') id: string,
  ): Promise<WorkerProfileResponseDto> {
    try {
      return await this.workersService.getWorkerById(id);
    } catch {
      throw new NotFoundException('Travailleur introuvable');
    }
  }
}
