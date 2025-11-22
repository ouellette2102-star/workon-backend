import { Controller, Get, Post, Param, Body, UseGuards, Request } from '@nestjs/common';
import { ContractsService } from './contracts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { SignContractDto } from './dto/sign-contract.dto';
import { UserRole } from '@prisma/client';

@Controller('contracts')
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Get(':missionId')
  @UseGuards(JwtAuthGuard)
  async getContractStatus(@Param('missionId') missionId: string) {
    return this.contractsService.getContractStatus(missionId);
  }

  @Get(':missionId/create')
  @UseGuards(JwtAuthGuard)
  async getOrCreateContract(@Param('missionId') missionId: string) {
    return this.contractsService.getOrCreateContract(missionId);
  }

  @Post(':missionId/sign')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.WORKER, UserRole.EMPLOYER)
  async signContract(
    @Request() req: any,
    @Param('missionId') missionId: string,
    @Body() signContractDto: SignContractDto,
  ) {
    return this.contractsService.signContract(req.user.sub, req.user.role, missionId, signContractDto);
  }
}

