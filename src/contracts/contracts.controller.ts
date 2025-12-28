import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { ContractsService } from './contracts.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractStatusDto } from './dto/update-contract-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Contracts')
@ApiBearerAuth()
@Controller('api/v1/contracts')
@UseGuards(JwtAuthGuard)
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  /**
   * POST /api/v1/contracts
   * Créer un contrat pour une mission
   */
  @Post()
  @ApiOperation({ summary: 'Create a contract for a mission' })
  @ApiResponse({ status: 201, description: 'Contract created' })
  @ApiResponse({ status: 400, description: 'Invalid data or contract already exists' })
  @ApiResponse({ status: 403, description: 'Only employer can create contract' })
  @ApiResponse({ status: 404, description: 'Mission not found' })
  createContract(@Body() dto: CreateContractDto, @Request() req: any) {
    return this.contractsService.createContract(req.user.sub, dto);
  }

  /**
   * GET /api/v1/contracts/:id
   * Récupérer un contrat par ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a contract by ID' })
  @ApiParam({ name: 'id', description: 'Contract ID' })
  @ApiResponse({ status: 200, description: 'Contract details' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Contract not found' })
  getContract(@Param('id') id: string, @Request() req: any) {
    return this.contractsService.getContractById(req.user.sub, id);
  }

  /**
   * GET /api/v1/contracts/user/me
   * Récupérer les contrats de l'utilisateur connecté
   */
  @Get('user/me')
  @ApiOperation({ summary: 'Get contracts for current user' })
  @ApiResponse({ status: 200, description: 'List of contracts' })
  getUserContracts(@Request() req: any) {
    return this.contractsService.getContractsForUser(req.user.sub);
  }

  /**
   * PATCH /api/v1/contracts/:id/status
   * Mettre à jour le statut d'un contrat
   */
  @Patch(':id/status')
  @ApiOperation({ summary: 'Update contract status' })
  @ApiParam({ name: 'id', description: 'Contract ID' })
  @ApiResponse({ status: 200, description: 'Contract updated' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 403, description: 'Not authorized for this action' })
  @ApiResponse({ status: 404, description: 'Contract not found' })
  updateContractStatus(
    @Param('id') id: string,
    @Body() dto: UpdateContractStatusDto,
    @Request() req: any,
  ) {
    return this.contractsService.updateContractStatus(req.user.sub, id, dto);
  }
}
