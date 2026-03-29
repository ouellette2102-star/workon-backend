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
  amountCents: number;
  hourlyRateCents: number | null;
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
        amountCents: dto.amountCents,
        hourlyRateCents: dto.hourlyRateCents,
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
    const contract = await this.prisma.contract.findFirst({
      where: { id: contractId, deletedAt: null },
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
        deletedAt: null,
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
    const contract = await this.prisma.contract.findFirst({
      where: { id: contractId, deletedAt: null },
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
   * Sign a contract electronically
   * Generates a unique nonce and records the signature timestamp
   */
  async signContract(
    clerkUserId: string,
    contractId: string,
    ipAddress?: string,
  ): Promise<{ signed: boolean; role: string; signatureNonce: string }> {
    const contract = await this.prisma.contract.findFirst({
      where: { id: contractId, deletedAt: null },
      include: {
        employer: { select: { id: true, clerkId: true } },
        worker: { select: { id: true, clerkId: true } },
      },
    });

    if (!contract) {
      throw new NotFoundException('Contrat non trouvé');
    }

    const isEmployer = contract.employer?.clerkId === clerkUserId;
    const isWorker = contract.worker?.clerkId === clerkUserId;

    if (!isEmployer && !isWorker) {
      throw new ForbiddenException('Seules les parties du contrat peuvent signer');
    }

    if (contract.status === ContractStatus.CANCELLED || contract.status === ContractStatus.REJECTED) {
      throw new BadRequestException('Impossible de signer un contrat annulé ou refusé');
    }

    const role = isEmployer ? 'employer' : 'worker';
    const alreadySigned = isEmployer ? contract.signedByEmployer : contract.signedByWorker;

    if (alreadySigned) {
      throw new BadRequestException(`Ce contrat est déjà signé par le ${role}`);
    }

    // Generate signature nonce (unique proof of signing)
    const nonce = `sig_${Date.now()}_${Math.random().toString(36).substr(2, 12)}`;
    const signatureRecord = {
      nonce,
      role,
      userId: clerkUserId,
      signedAt: new Date().toISOString(),
      ip: ipAddress || 'unknown',
    };

    const updateData: Record<string, unknown> = {};
    if (isEmployer) {
      updateData.signedByEmployer = true;
    } else {
      updateData.signedByWorker = true;
    }

    // Append nonce (combine if both parties signed)
    const existingNonce = contract.signatureNonce;
    updateData.signatureNonce = existingNonce
      ? `${existingNonce}|${JSON.stringify(signatureRecord)}`
      : JSON.stringify(signatureRecord);

    // Auto-transition: if both parties signed and status is PENDING → ACCEPTED
    const otherPartySigned = isEmployer ? contract.signedByWorker : contract.signedByEmployer;
    if (otherPartySigned) {
      updateData.status = ContractStatus.ACCEPTED;
    }

    await this.prisma.contract.update({
      where: { id: contractId },
      data: updateData,
    });

    this.logger.log(`Contract ${contractId} signed by ${role} (${clerkUserId})`);

    return { signed: true, role, signatureNonce: nonce };
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
      amountCents: contract.amountCents,
      hourlyRateCents: contract.hourlyRateCents,
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
