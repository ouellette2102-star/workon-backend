import { Test, TestingModule } from '@nestjs/testing';
import { MetricsService } from './metrics.service';
import { PrismaService } from '../prisma/prisma.service';

describe('MetricsService', () => {
  let service: MetricsService;
  let prisma: jest.Mocked<PrismaService>;

  const mockPrismaService = {
    localUser: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetricsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<MetricsService>(MetricsService);
    prisma = module.get(PrismaService);
  });

  describe('calculateRatio', () => {
    it('should calculate global ratio when no region is provided', async () => {
      mockPrismaService.localUser.count
        .mockResolvedValueOnce(100) // workers
        .mockResolvedValueOnce(50)  // employers
        .mockResolvedValueOnce(25); // residentialClients

      const result = await service.calculateRatio();

      expect(result).toEqual({
        region: null,
        workers: 100,
        employers: 50,
        residentialClients: 25,
        workerToEmployerRatio: 2,
      });
      expect(mockPrismaService.localUser.count).toHaveBeenCalledTimes(3);
    });

    it('should calculate ratio for specific region', async () => {
      mockPrismaService.localUser.count
        .mockResolvedValueOnce(30) // workers
        .mockResolvedValueOnce(10) // employers
        .mockResolvedValueOnce(5); // residentialClients

      const result = await service.calculateRatio('Montreal');

      expect(result).toEqual({
        region: 'Montreal',
        workers: 30,
        employers: 10,
        residentialClients: 5,
        workerToEmployerRatio: 3,
      });
      expect(mockPrismaService.localUser.count).toHaveBeenCalledWith({
        where: { city: 'Montreal', role: 'worker', active: true },
      });
    });

    it('should handle zero employers (avoid division by zero)', async () => {
      mockPrismaService.localUser.count
        .mockResolvedValueOnce(50) // workers
        .mockResolvedValueOnce(0)  // employers
        .mockResolvedValueOnce(10); // residentialClients

      const result = await service.calculateRatio();

      expect(result).toEqual({
        region: null,
        workers: 50,
        employers: 0,
        residentialClients: 10,
        workerToEmployerRatio: 50, // Returns workers count when employers is 0
      });
    });

    it('should return ratio with 2 decimal places', async () => {
      mockPrismaService.localUser.count
        .mockResolvedValueOnce(100) // workers
        .mockResolvedValueOnce(33)  // employers
        .mockResolvedValueOnce(20); // residentialClients

      const result = await service.calculateRatio();

      expect(result.workerToEmployerRatio).toBe(3.03); // 100/33 ≈ 3.03
    });
  });

  describe('getAvailableRegions', () => {
    it('should return list of unique regions', async () => {
      mockPrismaService.localUser.findMany.mockResolvedValue([
        { city: 'Montreal' },
        { city: 'Quebec' },
        { city: 'Laval' },
      ]);

      const result = await service.getAvailableRegions();

      expect(result).toEqual(['Montreal', 'Quebec', 'Laval']);
      expect(mockPrismaService.localUser.findMany).toHaveBeenCalledWith({
        where: {
          city: { not: null },
          active: true,
        },
        select: { city: true },
        distinct: ['city'],
      });
    });

    it('should filter out null cities', async () => {
      mockPrismaService.localUser.findMany.mockResolvedValue([
        { city: 'Montreal' },
        { city: null },
        { city: 'Quebec' },
      ]);

      const result = await service.getAvailableRegions();

      expect(result).toEqual(['Montreal', 'Quebec']);
    });

    it('should return empty array when no regions', async () => {
      mockPrismaService.localUser.findMany.mockResolvedValue([]);

      const result = await service.getAvailableRegions();

      expect(result).toEqual([]);
    });
  });
});
