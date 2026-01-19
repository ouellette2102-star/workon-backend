import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { EarningsService } from './earnings.service';
import { PrismaService } from '../prisma/prisma.service';

describe('EarningsService', () => {
  let service: EarningsService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  const mockCompletedMission = {
    id: 'mission-1',
    title: 'Completed Mission',
    price: 100,
    status: 'completed',
    paidAt: null,
    updatedAt: new Date('2024-01-15'),
    createdByUser: {
      firstName: 'John',
      lastName: 'Doe',
    },
  };

  const mockPaidMission = {
    id: 'mission-2',
    title: 'Paid Mission',
    price: 200,
    status: 'paid',
    paidAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-01-20'),
    createdByUser: {
      firstName: 'Jane',
      lastName: 'Smith',
    },
  };

  const createMockPrisma = () => ({
    localMission: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
    },
  });

  beforeEach(async () => {
    mockPrisma = createMockPrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EarningsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<EarningsService>(EarningsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSummary', () => {
    it('should calculate earnings summary correctly', async () => {
      mockPrisma.localMission.findMany.mockResolvedValue([
        mockCompletedMission,
        mockPaidMission,
      ] as any);

      const result = await service.getSummary('worker-1');

      // Commission rate is 15%
      // Completed: 100 gross -> 85 net (available)
      // Paid: 200 gross -> 170 net (already paid)
      expect(result.totalLifetimeGross).toBe(300); // 100 + 200
      expect(result.totalLifetimeNet).toBe(255); // 300 * 0.85
      expect(result.totalPaid).toBe(170); // 200 * 0.85
      expect(result.totalPending).toBe(100); // only completed mission
      expect(result.totalAvailable).toBe(85); // 100 * 0.85
      expect(result.completedMissionsCount).toBe(1);
      expect(result.paidMissionsCount).toBe(1);
      expect(result.commissionRate).toBe(0.15);
      expect(result.currency).toBe('CAD');
    });

    it('should return zeros for worker with no missions', async () => {
      mockPrisma.localMission.findMany.mockResolvedValue([]);

      const result = await service.getSummary('worker-no-missions');

      expect(result.totalLifetimeGross).toBe(0);
      expect(result.totalLifetimeNet).toBe(0);
      expect(result.totalPaid).toBe(0);
      expect(result.totalPending).toBe(0);
      expect(result.totalAvailable).toBe(0);
      expect(result.completedMissionsCount).toBe(0);
      expect(result.paidMissionsCount).toBe(0);
    });

    it('should query only completed/paid missions', async () => {
      mockPrisma.localMission.findMany.mockResolvedValue([]);

      await service.getSummary('worker-1');

      expect(mockPrisma.localMission.findMany).toHaveBeenCalledWith({
        where: {
          assignedToUserId: 'worker-1',
          status: {
            in: ['completed', 'paid'],
          },
        },
        select: {
          id: true,
          price: true,
          status: true,
          paidAt: true,
        },
      });
    });
  });

  describe('getHistory', () => {
    it('should return paginated earnings history', async () => {
      mockPrisma.localMission.count.mockResolvedValue(2);
      mockPrisma.localMission.findMany.mockResolvedValue([
        mockPaidMission,
        mockCompletedMission,
      ] as any);

      const result = await service.getHistory('worker-1', undefined, 20);

      expect(result.transactions).toHaveLength(2);
      expect(result.totalCount).toBe(2);
      expect(result.nextCursor).toBeNull(); // No more pages
    });

    it('should calculate amounts correctly in history', async () => {
      mockPrisma.localMission.count.mockResolvedValue(1);
      mockPrisma.localMission.findMany.mockResolvedValue([mockPaidMission] as any);

      const result = await service.getHistory('worker-1');

      const tx = result.transactions[0];
      expect(tx.grossAmount).toBe(200);
      expect(tx.commissionAmount).toBe(30); // 200 * 0.15
      expect(tx.netAmount).toBe(170); // 200 * 0.85
      expect(tx.status).toBe('paid');
      expect(tx.currency).toBe('CAD');
      expect(tx.clientName).toBe('Jane Smith');
    });

    it('should return nextCursor when more pages exist', async () => {
      const manyMissions = Array.from({ length: 21 }, (_, i) => ({
        ...mockPaidMission,
        id: `mission-${i}`,
      }));

      mockPrisma.localMission.count.mockResolvedValue(30);
      mockPrisma.localMission.findMany.mockResolvedValue(manyMissions as any);

      const result = await service.getHistory('worker-1', undefined, 20);

      expect(result.transactions).toHaveLength(20);
      expect(result.nextCursor).toBe('mission-19');
    });

    it('should use cursor for pagination', async () => {
      mockPrisma.localMission.count.mockResolvedValue(10);
      mockPrisma.localMission.findMany.mockResolvedValue([]);

      await service.getHistory('worker-1', 'cursor-id', 20);

      expect(mockPrisma.localMission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: { lt: 'cursor-id' },
          }),
        }),
      );
    });

    it('should map completed status to available', async () => {
      mockPrisma.localMission.count.mockResolvedValue(1);
      mockPrisma.localMission.findMany.mockResolvedValue([
        mockCompletedMission,
      ] as any);

      const result = await service.getHistory('worker-1');

      expect(result.transactions[0].status).toBe('available');
    });
  });

  describe('getByMission', () => {
    it('should return earning details for valid mission', async () => {
      const missionWithDetails = {
        ...mockPaidMission,
        category: 'Plumbing',
        city: 'Montreal',
        address: '123 Main St',
      };
      mockPrisma.localMission.findFirst.mockResolvedValue(missionWithDetails as any);

      const result = await service.getByMission('worker-1', 'mission-2');

      expect(result.missionId).toBe('mission-2');
      expect(result.missionTitle).toBe('Paid Mission');
      expect(result.grossAmount).toBe(200);
      expect(result.netAmount).toBe(170);
      expect(result.category).toBe('Plumbing');
      expect(result.city).toBe('Montreal');
      expect(result.address).toBe('123 Main St');
    });

    it('should throw NotFoundException for non-existent mission', async () => {
      mockPrisma.localMission.findFirst.mockResolvedValue(null);

      await expect(
        service.getByMission('worker-1', 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should only return mission if assigned to worker', async () => {
      mockPrisma.localMission.findFirst.mockResolvedValue(null);

      await service.getByMission('wrong-worker', 'mission-2').catch(() => {});

      expect(mockPrisma.localMission.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            assignedToUserId: 'wrong-worker',
          }),
        }),
      );
    });
  });

  describe('edge cases', () => {
    it('should handle decimal prices correctly (rounding)', async () => {
      const missionWithDecimal = {
        ...mockCompletedMission,
        price: 99.99,
      };
      mockPrisma.localMission.findMany.mockResolvedValue([
        missionWithDecimal,
      ] as any);

      const result = await service.getSummary('worker-1');

      // 99.99 * 0.85 = 84.9915, should round to 84.99
      expect(result.totalLifetimeNet).toBe(84.99);
    });

    it('should handle missing client name gracefully', async () => {
      const missionNoName = {
        ...mockPaidMission,
        createdByUser: {
          firstName: '',
          lastName: '',
        },
      };
      mockPrisma.localMission.count.mockResolvedValue(1);
      mockPrisma.localMission.findMany.mockResolvedValue([missionNoName] as any);

      const result = await service.getHistory('worker-1');

      expect(result.transactions[0].clientName).toBe('Client');
    });
  });
});

