import { Test, TestingModule } from '@nestjs/testing';
import { ContractsController } from './contracts.controller';
import { ContractsService } from './contracts.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ConsentGuard } from '../compliance/guards/consent.guard';
import { ContractStatus } from '@prisma/client';

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
  createdAt: '2026-01-21T00:00:00.000Z',
  updatedAt: '2026-01-21T00:00:00.000Z',
  mission: { id: 'mission-1', title: 'Test Mission' },
};

const mockContractsService = {
  createContract: jest.fn(),
  getContractById: jest.fn(),
  getContractsForUser: jest.fn(),
  updateContractStatus: jest.fn(),
};

describe('ContractsController', () => {
  let controller: ContractsController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContractsController],
      providers: [
        { provide: ContractsService, useValue: mockContractsService },
        { provide: JwtService, useValue: { sign: jest.fn(), verify: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(ConsentGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<ContractsController>(ContractsController);
  });

  describe('createContract', () => {
    it('should create a contract', async () => {
      const mockReq = { user: { sub: 'clerk-employer' } };
      const dto = { missionId: 'mission-1', amount: 500 };

      mockContractsService.createContract.mockResolvedValue(mockContract);

      const result = await controller.createContract(dto as any, mockReq);

      expect(mockContractsService.createContract).toHaveBeenCalledWith(
        'clerk-employer',
        dto,
      );
      expect(result.id).toBe('contract-1');
    });
  });

  describe('getContract', () => {
    it('should return a contract by ID', async () => {
      const mockReq = { user: { sub: 'clerk-employer' } };

      mockContractsService.getContractById.mockResolvedValue(mockContract);

      const result = await controller.getContract('contract-1', mockReq);

      expect(mockContractsService.getContractById).toHaveBeenCalledWith(
        'clerk-employer',
        'contract-1',
      );
      expect(result.id).toBe('contract-1');
    });
  });

  describe('getUserContracts', () => {
    it('should return contracts for current user', async () => {
      const mockReq = { user: { sub: 'clerk-employer' } };

      mockContractsService.getContractsForUser.mockResolvedValue([mockContract]);

      const result = await controller.getUserContracts(mockReq);

      expect(mockContractsService.getContractsForUser).toHaveBeenCalledWith(
        'clerk-employer',
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('updateContractStatus', () => {
    it('should update contract status', async () => {
      const mockReq = { user: { sub: 'clerk-employer' } };
      const dto = { status: ContractStatus.PENDING };

      mockContractsService.updateContractStatus.mockResolvedValue({
        ...mockContract,
        status: ContractStatus.PENDING,
      });

      const result = await controller.updateContractStatus(
        'contract-1',
        dto,
        mockReq,
      );

      expect(mockContractsService.updateContractStatus).toHaveBeenCalledWith(
        'clerk-employer',
        'contract-1',
        dto,
      );
      expect(result.status).toBe(ContractStatus.PENDING);
    });
  });
});

