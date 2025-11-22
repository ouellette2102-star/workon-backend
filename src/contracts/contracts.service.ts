import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SignContractDto } from './dto/sign-contract.dto';
import { randomBytes } from 'crypto';

@Injectable()
export class ContractsService {
  private readonly logger = new Logger(ContractsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Créer ou obtenir un contrat pour une mission
   */
  async getOrCreateContract(missionId: string) {
    // Vérifier que la mission existe
    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },
      include: {
        authorClient: true,
        assigneeWorker: true,
      },
    });

    if (!mission) {
      throw new NotFoundException('Mission non trouvée');
    }

    // Vérifier que la mission a un worker assigné
    if (!mission.assigneeWorker) {
      throw new BadRequestException('La mission doit avoir un worker assigné pour créer un contrat');
    }

    // Vérifier que la mission est en cours ou complétée
    if (mission.status !== 'IN_PROGRESS' && mission.status !== 'COMPLETED') {
      throw new BadRequestException('Le contrat ne peut être créé que pour une mission en cours ou complétée');
    }

    // Vérifier si un contrat existe déjà
    let contract = mission.contracts[0];

    if (!contract) {
      // Générer un nonce unique pour la signature
      const signatureNonce = this.generateNonce();

      contract = await this.prisma.contract.create({
        data: {
          missionId: mission.id,
          signatureNonce,
          signedByWorker: false,
          signedByEmployer: false,
          // Placeholder pour l'URL du contrat (à générer via service de stockage)
          contractUrl: null,
        },
      });

      this.logger.log(`Contrat créé: ${contract.id} pour mission ${missionId}`);
    }

    return contract;
  }

  /**
   * Signer un contrat (worker ou employer)
   */
  async signContract(userId: string, userRole: string, missionId: string, signContractDto: SignContractDto) {
    const { signatureNonce } = signContractDto;

    // Vérifier que la mission existe
    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },
      include: {
        employer: true,
        worker: true,
        contracts: true,
      },
    });

    if (!mission) {
      throw new NotFoundException('Mission non trouvée');
    }

    // Vérifier que le contrat existe
    const contract = mission.contracts[0];
    if (!contract) {
      throw new NotFoundException('Contrat non trouvé pour cette mission');
    }

    // Vérifier le nonce (pour éviter les signatures dupliquées)
    if (contract.signatureNonce !== signatureNonce) {
      throw new BadRequestException('Nonce de signature invalide');
    }

    // Vérifier les permissions
    if (userRole === 'WORKER') {
      if (mission.worker?.userId !== userId) {
        throw new ForbiddenException('Vous ne pouvez pas signer ce contrat');
      }
      if (contract.signedByWorker) {
        throw new BadRequestException('Contrat déjà signé par le worker');
      }
    } else if (userRole === 'EMPLOYER') {
      if (mission.employer.userId !== userId) {
        throw new ForbiddenException('Vous ne pouvez pas signer ce contrat');
      }
      if (contract.signedByEmployer) {
        throw new BadRequestException('Contrat déjà signé par l\'employer');
      }
    } else {
      throw new ForbiddenException('Seuls les workers et employers peuvent signer un contrat');
    }

    // Mettre à jour la signature
    const updateData: any = {};
    if (userRole === 'WORKER') {
      updateData.signedByWorker = true;
    } else if (userRole === 'EMPLOYER') {
      updateData.signedByEmployer = true;
    }

    // Générer un nouveau nonce après signature (pour éviter la réutilisation)
    updateData.signatureNonce = this.generateNonce();

    const updatedContract = await this.prisma.contract.update({
      where: { id: contract.id },
      data: updateData,
      include: {
        mission: {
          include: {
            employer: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
            worker: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    this.logger.log(`Contrat signé par ${userRole}: ${contract.id} pour mission ${missionId}`);

    // Vérifier si le contrat est complètement signé
    if (updatedContract.signedByWorker && updatedContract.signedByEmployer) {
      this.logger.log(`Contrat complètement signé: ${contract.id}`);
      // Placeholder: Notifier les parties, générer le PDF final, etc.
    }

    return updatedContract;
  }

  /**
   * Obtenir le statut d'un contrat
   */
  async getContractStatus(missionId: string) {
    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },
      include: {
        contracts: true,
      },
    });

    if (!mission) {
      throw new NotFoundException('Mission non trouvée');
    }

    const contract = mission.contracts[0];
    if (!contract) {
      return { exists: false };
    }

    return {
      exists: true,
      signedByWorker: contract.signedByWorker,
      signedByEmployer: contract.signedByEmployer,
      fullySigned: contract.signedByWorker && contract.signedByEmployer,
      contractUrl: contract.contractUrl,
    };
  }

  /**
   * Générer un nonce unique pour la signature
   */
  private generateNonce(): string {
    return randomBytes(32).toString('hex');
  }
}

