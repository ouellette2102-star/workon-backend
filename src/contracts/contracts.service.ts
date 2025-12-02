import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ContractStatus } from '@prisma/client';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractStatusDto } from './dto/update-contract-status.dto';

export interface ContractResponse {
  id: string;
  missionId: string;
  employerId: string;
  workerId: string;
  status: ContractStatus;
  amount: number;
  hourlyRate: number | null;
  startAt: string | null;
  endAt: string | null;
  signedByWorker: boolean;
  signedByEmployer: boolean;
  createdAt: string;
  updatedAt: string;
  mission?: {
    id: string;
    title: string;
  };
  employer?: {
    id: string;
    clerkId: string;
  };
  worker?: {
    id: string;
    clerkId: string;
  };
}

@Injectable()
export class ContractsService {
  private readonly logger = new Logger(ContractsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Créer un contrat pour une mission
   */
  async createContract(
    clerkUserId: string,
    dto: CreateContractDto,
  ): Promise<ContractResponse> {
    // Vérifier que la mission existe
    const mission = await this.prisma.mission.findUnique({
      where: { id: dto.missionId },
      include: {
        authorClient: true,
        assigneeWorker: true,
        contract: true,
      },
    });

    if (!mission) {
      throw new NotFoundException('Mission non trouvée');
    }

    // Vérifier que l'utilisateur est l'employer de la mission
    if (mission.authorClient.clerkId !== clerkUserId) {
      throw new ForbiddenException('Seul l\'employer peut créer un contrat');
    }

    // Vérifier qu'un worker est assigné
    if (!mission.assigneeWorker) {
      throw new BadRequestException('La mission doit avoir un worker assigné');
    }

    // Vérifier qu'un contrat n'existe pas déjà
    if (mission.contract) {
      throw new BadRequestException('Un contrat existe déjà pour cette mission');
    }

    // Créer le contrat
    const contract = await this.prisma.contract.create({
      data: {
        id: `contract_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        missionId: mission.id,
        employerId: mission.authorClientId,
        workerId: mission.assigneeWorkerId!,
        amount: dto.amount,
        hourlyRate: dto.hourlyRate,
        startAt: dto.startAt ? new Date(dto.startAt) : null,
        endAt: dto.endAt ? new Date(dto.endAt) : null,
        status: ContractStatus.DRAFT,
      },
      include: {
        mission: { select: { id: true, title: true } },
        employer: { select: { id: true, clerkId: true } },
        worker: { select: { id: true, clerkId: true } },
      },
    });

    this.logger.log(`Contract created: ${contract.id} for mission ${dto.missionId}`);

    return this.mapToResponse(contract);
  }

  /**
   * Récupérer un contrat par ID
   */
  async getContractById(
    clerkUserId: string,
    contractId: string,
  ): Promise<ContractResponse> {
    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
      include: {
        mission: { select: { id: true, title: true } },
        employer: { select: { id: true, clerkId: true } },
        worker: { select: { id: true, clerkId: true } },
      },
    });

    if (!contract) {
      throw new NotFoundException('Contrat non trouvé');
    }

    // Vérifier l'accès
    if (
      contract.employer.clerkId !== clerkUserId &&
      contract.worker.clerkId !== clerkUserId
    ) {
      throw new ForbiddenException('Accès non autorisé à ce contrat');
    }

    return this.mapToResponse(contract);
  }

  /**
   * Récupérer les contrats d'un utilisateur
   */
  async getContractsForUser(clerkUserId: string): Promise<ContractResponse[]> {
    const user = await this.prisma.user.findUnique({
      where: { clerkId: clerkUserId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    const contracts = await this.prisma.contract.findMany({
      where: {
        OR: [
          { employerId: user.id },
          { workerId: user.id },
        ],
      },
      include: {
        mission: { select: { id: true, title: true } },
        employer: { select: { id: true, clerkId: true } },
        worker: { select: { id: true, clerkId: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return contracts.map((c) => this.mapToResponse(c));
  }

  /**
   * Mettre à jour le statut d'un contrat
   */
  async updateContractStatus(
    clerkUserId: string,
    contractId: string,
    dto: UpdateContractStatusDto,
  ): Promise<ContractResponse> {
    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
      include: {
        employer: { select: { id: true, clerkId: true } },
        worker: { select: { id: true, clerkId: true } },
      },
    });

    if (!contract) {
      throw new NotFoundException('Contrat non trouvé');
    }

    const isEmployer = contract.employer.clerkId === clerkUserId;
    const isWorker = contract.worker.clerkId === clerkUserId;

    if (!isEmployer && !isWorker) {
      throw new ForbiddenException('Accès non autorisé');
    }

    // Valider les transitions de statut
    this.validateStatusTransition(contract.status, dto.status, isEmployer, isWorker);

    // Mettre à jour
    const updateData: any = { status: dto.status };

    // Si le worker accepte, marquer comme signé par le worker
    if (dto.status === ContractStatus.ACCEPTED && isWorker) {
      updateData.signedByWorker = true;
    }

    // Si l'employer envoie le contrat, marquer comme signé par l'employer
    if (dto.status === ContractStatus.PENDING && isEmployer) {
      updateData.signedByEmployer = true;
    }

    const updatedContract = await this.prisma.contract.update({
      where: { id: contractId },
      data: updateData,
      include: {
        mission: { select: { id: true, title: true } },
        employer: { select: { id: true, clerkId: true } },
        worker: { select: { id: true, clerkId: true } },
      },
    });

    this.logger.log(`Contract ${contractId} status updated to ${dto.status}`);

    return this.mapToResponse(updatedContract);
  }

  /**
   * Valider les transitions de statut
   */
  private validateStatusTransition(
    currentStatus: ContractStatus,
    newStatus: ContractStatus,
    isEmployer: boolean,
    isWorker: boolean,
  ): void {
    const validTransitions: Record<ContractStatus, ContractStatus[]> = {
      [ContractStatus.DRAFT]: [ContractStatus.PENDING, ContractStatus.CANCELLED],
      [ContractStatus.PENDING]: [ContractStatus.ACCEPTED, ContractStatus.REJECTED, ContractStatus.CANCELLED],
      [ContractStatus.ACCEPTED]: [ContractStatus.COMPLETED, ContractStatus.CANCELLED],
      [ContractStatus.REJECTED]: [],
      [ContractStatus.COMPLETED]: [],
      [ContractStatus.CANCELLED]: [],
    };

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      throw new BadRequestException(
        `Transition de ${currentStatus} vers ${newStatus} non autorisée`,
      );
    }

    // Règles spécifiques
    if (newStatus === ContractStatus.PENDING && !isEmployer) {
      throw new ForbiddenException('Seul l\'employer peut envoyer le contrat');
    }

    if (
      (newStatus === ContractStatus.ACCEPTED || newStatus === ContractStatus.REJECTED) &&
      !isWorker
    ) {
      throw new ForbiddenException('Seul le worker peut accepter/refuser le contrat');
    }

    if (newStatus === ContractStatus.COMPLETED && !isEmployer) {
      throw new ForbiddenException('Seul l\'employer peut marquer le contrat comme complété');
    }
  }

  /**
   * Mapper vers la réponse
   */
  private mapToResponse(contract: any): ContractResponse {
    return {
      id: contract.id,
      missionId: contract.missionId,
      employerId: contract.employerId,
      workerId: contract.workerId,
      status: contract.status,
      amount: contract.amount,
      hourlyRate: contract.hourlyRate,
      startAt: contract.startAt?.toISOString() || null,
      endAt: contract.endAt?.toISOString() || null,
      signedByWorker: contract.signedByWorker,
      signedByEmployer: contract.signedByEmployer,
      createdAt: contract.createdAt.toISOString(),
      updatedAt: contract.updatedAt.toISOString(),
      mission: contract.mission,
      employer: contract.employer,
      worker: contract.worker,
    };
  }
}
