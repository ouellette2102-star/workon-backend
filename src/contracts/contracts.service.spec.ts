import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ContractsService } from './contracts.service';
import { PrismaService } from '../prisma/prisma.service';
import { ContractStatus } from '@prisma/client';

const mockPrismaService = {
  mission: {
    findUnique: jest.fn(),
  },
  contract: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
};

describe('ContractsService', () => {
  let service: ContractsService;

  const mockMission = {
    id: 'mission-1',
    title: 'Test Mission',
    authorClientId: 'employer-1',
    assigneeWorkerId: 'worker-1',
    authorClient: { id: 'employer-1', clerkId: 'clerk-employer' },
    assigneeWorker: { id: 'worker-1', clerkId: 'clerk-worker' },
    contract: null,
  };

  const mockContract = {
    id: 'contract-1',
    missionId: 'mission-1',
    employerId: 'employer-1',
    workerId: 'worker-1',
    status: ContractStatus.DRAFT,
    amount: 500,
    hourlyRate: null,
    startAt: null,
    endAt: null,
    signedByWorker: false,
    signedByEmployer: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    mission: { id: 'mission-1', title: 'Test Mission' },
    employer: { id: 'employer-1', clerkId: 'clerk-employer' },
    worker: { id: 'worker-1', clerkId: 'clerk-worker' },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContractsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ContractsService>(ContractsService);
  });

  describe('createContract', () => {
    const createDto = {
      missionId: 'mission-1',
      amount: 500,
    };

    it('should create a contract successfully', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue(mockMission);
      mockPrismaService.contract.create.mockResolvedValue(mockContract);

      const result = await service.createContract('clerk-employer', createDto);

      expect(result.id).toBe('contract-1');
      expect(result.status).toBe(ContractStatus.DRAFT);
      expect(mockPrismaService.contract.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException if mission not found', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue(null);

      await expect(
        service.createContract('clerk-employer', createDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not employer', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue(mockMission);

      await expect(
        service.createContract('clerk-other', createDto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if no worker assigned', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue({
        ...mockMission,
        assigneeWorker: null,
        assigneeWorkerId: null,
      });

      await expect(
        service.createContract('clerk-employer', createDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if contract already exists', async () => {
      mockPrismaService.mission.findUnique.mockResolvedValue({
        ...mockMission,
        contract: mockContract,
      });

      await expect(
        service.createContract('clerk-employer', createDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should include hourlyRate and dates when provided', async () => {
      const dtoWithDetails = {
        ...createDto,
        hourlyRate: 25,
        startAt: '2026-02-01T00:00:00Z',
        endAt: '2026-02-28T00:00:00Z',
      };

      mockPrismaService.mission.findUnique.mockResolvedValue(mockMission);
      mockPrismaService.contract.create.mockResolvedValue({
        ...mockContract,
        hourlyRate: 25,
        startAt: new Date('2026-02-01'),
        endAt: new Date('2026-02-28'),
      });

      const result = await service.createContract('clerk-employer', dtoWithDetails);

      expect(result.hourlyRate).toBe(25);
      expect(result.startAt).toBeDefined();
      expect(result.endAt).toBeDefined();
    });
  });

  describe('getContractById', () => {
    it('should return contract for employer', async () => {
      mockPrismaService.contract.findUnique.mockResolvedValue(mockContract);

      const result = await service.getContractById('clerk-employer', 'contract-1');

      expect(result.id).toBe('contract-1');
    });

    it('should return contract for worker', async () => {
      mockPrismaService.contract.findUnique.mockResolvedValue(mockContract);

      const result = await service.getContractById('clerk-worker', 'contract-1');

      expect(result.id).toBe('contract-1');
    });

    it('should throw NotFoundException if contract not found', async () => {
      mockPrismaService.contract.findUnique.mockResolvedValue(null);

      await expect(
        service.getContractById('clerk-employer', 'unknown'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user has no access', async () => {
      mockPrismaService.contract.findUnique.mockResolvedValue(mockContract);

      await expect(
        service.getContractById('clerk-other', 'contract-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getContractsForUser', () => {
    it('should return contracts for user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'employer-1' });
      mockPrismaService.contract.findMany.mockResolvedValue([mockContract]);

      const result = await service.getContractsForUser('clerk-employer');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('contract-1');
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.getContractsForUser('unknown'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return empty array if no contracts', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'employer-1' });
      mockPrismaService.contract.findMany.mockResolvedValue([]);

      const result = await service.getContractsForUser('clerk-employer');

      expect(result).toHaveLength(0);
    });
  });

  describe('updateContractStatus', () => {
    it('should update status from DRAFT to PENDING (employer)', async () => {
      mockPrismaService.contract.findUnique.mockResolvedValue(mockContract);
      mockPrismaService.contract.update.mockResolvedValue({
        ...mockContract,
        status: ContractStatus.PENDING,
        signedByEmployer: true,
      });

      const result = await service.updateContractStatus(
        'clerk-employer',
        'contract-1',
        { status: ContractStatus.PENDING },
      );

      expect(result.status).toBe(ContractStatus.PENDING);
      expect(mockPrismaService.contract.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: ContractStatus.PENDING,
            signedByEmployer: true,
          }),
        }),
      );
    });

    it('should update status from PENDING to ACCEPTED (worker)', async () => {
      mockPrismaService.contract.findUnique.mockResolvedValue({
        ...mockContract,
        status: ContractStatus.PENDING,
      });
      mockPrismaService.contract.update.mockResolvedValue({
        ...mockContract,
        status: ContractStatus.ACCEPTED,
        signedByWorker: true,
      });

      const result = await service.updateContractStatus(
        'clerk-worker',
        'contract-1',
        { status: ContractStatus.ACCEPTED },
      );

      expect(result.status).toBe(ContractStatus.ACCEPTED);
    });

    it('should throw NotFoundException if contract not found', async () => {
      mockPrismaService.contract.findUnique.mockResolvedValue(null);

      await expect(
        service.updateContractStatus('clerk-employer', 'unknown', {
          status: ContractStatus.PENDING,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user has no access', async () => {
      mockPrismaService.contract.findUnique.mockResolvedValue(mockContract);

      await expect(
        service.updateContractStatus('clerk-other', 'contract-1', {
          status: ContractStatus.PENDING,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException for invalid transition', async () => {
      mockPrismaService.contract.findUnique.mockResolvedValue({
        ...mockContract,
        status: ContractStatus.COMPLETED,
      });

      await expect(
        service.updateContractStatus('clerk-employer', 'contract-1', {
          status: ContractStatus.PENDING,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException if worker tries to send contract', async () => {
      mockPrismaService.contract.findUnique.mockResolvedValue(mockContract);

      await expect(
        service.updateContractStatus('clerk-worker', 'contract-1', {
          status: ContractStatus.PENDING,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if employer tries to accept', async () => {
      mockPrismaService.contract.findUnique.mockResolvedValue({
        ...mockContract,
        status: ContractStatus.PENDING,
      });

      await expect(
        service.updateContractStatus('clerk-employer', 'contract-1', {
          status: ContractStatus.ACCEPTED,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow employer to cancel from DRAFT', async () => {
      mockPrismaService.contract.findUnique.mockResolvedValue(mockContract);
      mockPrismaService.contract.update.mockResolvedValue({
        ...mockContract,
        status: ContractStatus.CANCELLED,
      });

      const result = await service.updateContractStatus(
        'clerk-employer',
        'contract-1',
        { status: ContractStatus.CANCELLED },
      );

      expect(result.status).toBe(ContractStatus.CANCELLED);
    });

    it('should allow worker to reject from PENDING', async () => {
      mockPrismaService.contract.findUnique.mockResolvedValue({
        ...mockContract,
        status: ContractStatus.PENDING,
      });
      mockPrismaService.contract.update.mockResolvedValue({
        ...mockContract,
        status: ContractStatus.REJECTED,
      });

      const result = await service.updateContractStatus(
        'clerk-worker',
        'contract-1',
        { status: ContractStatus.REJECTED },
      );

      expect(result.status).toBe(ContractStatus.REJECTED);
    });

    it('should allow employer to complete from ACCEPTED', async () => {
      mockPrismaService.contract.findUnique.mockResolvedValue({
        ...mockContract,
        status: ContractStatus.ACCEPTED,
      });
      mockPrismaService.contract.update.mockResolvedValue({
        ...mockContract,
        status: ContractStatus.COMPLETED,
      });

      const result = await service.updateContractStatus(
        'clerk-employer',
        'contract-1',
        { status: ContractStatus.COMPLETED },
      );

      expect(result.status).toBe(ContractStatus.COMPLETED);
    });

    it('should throw ForbiddenException if worker tries to complete', async () => {
      mockPrismaService.contract.findUnique.mockResolvedValue({
        ...mockContract,
        status: ContractStatus.ACCEPTED,
      });

      await expect(
        service.updateContractStatus('clerk-worker', 'contract-1', {
          status: ContractStatus.COMPLETED,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});

