import { Test, TestingModule } from '@nestjs/testing';
import { MissionsMapService } from './missions-map.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('MissionsMapService', () => {
  let service: MissionsMapService;

  const mockPrismaService = {
    localMission: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockMission = {
    id: 'mission-1',
    title: 'Test Mission',
    description: 'Test Description',
    category: 'cleaning',
    price: 100,
    latitude: 45.5,
    longitude: -73.6,
    city: 'Montreal',
    address: '123 Test St',
    status: 'open',
    createdAt: new Date('2026-01-30T10:00:00Z'),
    updatedAt: new Date('2026-01-30T10:00:00Z'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MissionsMapService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<MissionsMapService>(MissionsMapService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getMissions', () => {
    it('should return missions for map', async () => {
      mockPrismaService.localMission.findMany.mockResolvedValue([mockMission]);

      const result = await service.getMissions({});

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('mission-1');
      expect(result[0].title).toBe('Test Mission');
    });

    it('should filter by status', async () => {
      mockPrismaService.localMission.findMany.mockResolvedValue([mockMission]);

      await service.getMissions({ status: 'open' });

      expect(mockPrismaService.localMission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'open' }),
        }),
      );
    });

    it('should filter by category', async () => {
      mockPrismaService.localMission.findMany.mockResolvedValue([mockMission]);

      await service.getMissions({ category: 'cleaning' });

      expect(mockPrismaService.localMission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ category: 'cleaning' }),
        }),
      );
    });

    it('should filter by city', async () => {
      mockPrismaService.localMission.findMany.mockResolvedValue([mockMission]);

      await service.getMissions({ city: 'Montreal' });

      expect(mockPrismaService.localMission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            city: { contains: 'Montreal', mode: 'insensitive' },
          }),
        }),
      );
    });

    it('should filter by geo location with radius', async () => {
      mockPrismaService.localMission.findMany.mockResolvedValue([mockMission]);

      await service.getMissions({
        lat: 45.5,
        lng: -73.6,
        radiusKm: 10,
      });

      expect(mockPrismaService.localMission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            latitude: expect.any(Object),
            longitude: expect.any(Object),
          }),
        }),
      );
    });

    it('should respect limit parameter', async () => {
      mockPrismaService.localMission.findMany.mockResolvedValue([mockMission]);

      await service.getMissions({ limit: 50 });

      expect(mockPrismaService.localMission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 50 }),
      );
    });

    it('should use default limit of 100', async () => {
      mockPrismaService.localMission.findMany.mockResolvedValue([mockMission]);

      await service.getMissions({});

      expect(mockPrismaService.localMission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100 }),
      );
    });
  });

  describe('getMissionById', () => {
    it('should return mission by ID', async () => {
      mockPrismaService.localMission.findUnique.mockResolvedValue(mockMission);

      const result = await service.getMissionById('mission-1');

      expect(result.id).toBe('mission-1');
      expect(result.title).toBe('Test Mission');
      expect(result.description).toBe('Test Description');
    });

    it('should throw NotFoundException when mission not found', async () => {
      mockPrismaService.localMission.findUnique.mockResolvedValue(null);

      await expect(service.getMissionById('mission-999')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getHealth', () => {
    it('should return health status', async () => {
      mockPrismaService.localMission.count
        .mockResolvedValueOnce(100) // totalMissions
        .mockResolvedValueOnce(50); // openMissions

      const result = await service.getHealth();

      expect(result.totalMissions).toBe(100);
      expect(result.openMissions).toBe(50);
      expect(result.timestamp).toBeDefined();
    });
  });
});
