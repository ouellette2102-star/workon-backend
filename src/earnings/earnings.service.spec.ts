import { Test, TestingModule } from '@nestjs/testing';
import { EarningsService } from './earnings.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('EarningsService', () => {
  let service: EarningsService;

  const mockPrismaService = {
    localMission: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockMission = {
    id: 'mission-1',
    title: 'Test Mission',
    price: 100,
    status: 'paid',
    paidAt: new Date('2026-01-30T10:00:00Z'),
    updatedAt: new Date('2026-01-30T10:00:00Z'),
    category: 'cleaning',
    city: 'Montreal',
    address: '123 Test St',
    createdByUser: {
      firstName: 'John',
      lastName: 'Doe',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EarningsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<EarningsService>(EarningsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSummary', () => {
    it('should return earnings summary for worker with completed and paid missions', async () => {
      mockPrismaService.localMission.findMany.mockResolvedValue([
        { id: 'mission-1', price: 100, status: 'paid', paidAt: new Date() },
        { id: 'mission-2', price: 50, status: 'completed', paidAt: null },
        { id: 'mission-3', price: 75, status: 'paid', paidAt: new Date() },
      ]);

      const result = await service.getSummary('worker-1');

      expect(result.totalLifetimeGross).toBe(225);
      expect(result.totalLifetimeNet).toBe(191.25); // 225 * 0.85
      expect(result.totalPaid).toBe(148.75); // (100 + 75) * 0.85
      expect(result.totalPending).toBe(50);
      expect(result.totalAvailable).toBe(42.5); // 50 * 0.85
      expect(result.completedMissionsCount).toBe(1);
      expect(result.paidMissionsCount).toBe(2);
      expect(result.commissionRate).toBe(0.15);
      expect(result.currency).toBe('CAD');
    });

    it('should return zero summary when no missions', async () => {
      mockPrismaService.localMission.findMany.mockResolvedValue([]);

      const result = await service.getSummary('worker-1');

      expect(result.totalLifetimeGross).toBe(0);
      expect(result.totalLifetimeNet).toBe(0);
      expect(result.totalPaid).toBe(0);
      expect(result.totalPending).toBe(0);
      expect(result.totalAvailable).toBe(0);
      expect(result.completedMissionsCount).toBe(0);
      expect(result.paidMissionsCount).toBe(0);
    });
  });

  describe('getHistory', () => {
    it('should return paginated earnings history', async () => {
      mockPrismaService.localMission.count.mockResolvedValue(1);
      mockPrismaService.localMission.findMany.mockResolvedValue([mockMission]);

      const result = await service.getHistory('worker-1', undefined, 20);

      expect(result.totalCount).toBe(1);
      expect(result.transactions).toHaveLength(1);
      expect(result.transactions[0].missionTitle).toBe('Test Mission');
      expect(result.transactions[0].grossAmount).toBe(100);
      expect(result.transactions[0].commissionAmount).toBe(15);
      expect(result.transactions[0].netAmount).toBe(85);
      expect(result.transactions[0].status).toBe('paid');
      expect(result.nextCursor).toBeNull();
    });

    it('should handle pagination with cursor', async () => {
      mockPrismaService.localMission.count.mockResolvedValue(30);
      const missions = Array(21).fill(mockMission).map((m, i) => ({
        ...m,
        id: `mission-${i}`,
      }));
      mockPrismaService.localMission.findMany.mockResolvedValue(missions);

      const result = await service.getHistory('worker-1', undefined, 20);

      expect(result.transactions).toHaveLength(20);
      expect(result.nextCursor).toBe('mission-19');
    });

    it('should map completed status to available', async () => {
      mockPrismaService.localMission.count.mockResolvedValue(1);
      mockPrismaService.localMission.findMany.mockResolvedValue([
        { ...mockMission, status: 'completed', paidAt: null },
      ]);

      const result = await service.getHistory('worker-1');

      expect(result.transactions[0].status).toBe('available');
    });
  });

  describe('getByMission', () => {
    it('should return earnings for a specific mission', async () => {
      mockPrismaService.localMission.findFirst.mockResolvedValue(mockMission);

      const result = await service.getByMission('worker-1', 'mission-1');

      expect(result.missionId).toBe('mission-1');
      expect(result.missionTitle).toBe('Test Mission');
      expect(result.clientName).toBe('John Doe');
      expect(result.grossAmount).toBe(100);
      expect(result.commissionAmount).toBe(15);
      expect(result.netAmount).toBe(85);
      expect(result.category).toBe('cleaning');
      expect(result.city).toBe('Montreal');
    });

    it('should throw NotFoundException when mission not found', async () => {
      mockPrismaService.localMission.findFirst.mockResolvedValue(null);

      await expect(service.getByMission('worker-1', 'mission-999')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should handle mission without address', async () => {
      mockPrismaService.localMission.findFirst.mockResolvedValue({
        ...mockMission,
        address: null,
      });

      const result = await service.getByMission('worker-1', 'mission-1');

      expect(result.address).toBeUndefined();
    });
  });
});
