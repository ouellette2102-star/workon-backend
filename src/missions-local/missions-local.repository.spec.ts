import { Test, TestingModule } from '@nestjs/testing';
import { MissionsLocalRepository } from './missions-local.repository';
import { PrismaService } from '../prisma/prisma.service';

describe('MissionsLocalRepository', () => {
  let repository: MissionsLocalRepository;
  let prisma: any;

  const mockMission = {
    id: 'lm_123_abc',
    title: 'Test Mission',
    description: 'Test description',
    category: 'plumbing',
    city: 'Montreal',
    address: '123 Main St',
    latitude: 45.5,
    longitude: -73.6,
    priceCents: 10000,
    status: 'open',
    createdByUserId: 'user-1',
    assignedToUserId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockPrisma = {
      $queryRaw: jest.fn(),
      localMission: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MissionsLocalRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get<MissionsLocalRepository>(MissionsLocalRepository);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a mission', async () => {
      const createDto = {
        title: 'New Mission',
        description: 'Description',
        category: 'plumbing',
        city: 'Montreal',
        address: '123 Main St',
        latitude: 45.5,
        longitude: -73.6,
        priceCents: 15000,
      };

      prisma.localMission.create.mockResolvedValue({ ...mockMission, ...createDto });

      const result = await repository.create(createDto as any, 'user-1');

      expect(prisma.localMission.create).toHaveBeenCalled();
      expect(result.title).toBe('New Mission');
    });

    it('should throw error on creation failure', async () => {
      prisma.localMission.create.mockRejectedValue(new Error('DB error'));

      await expect(
        repository.create({ title: 'Test' } as any, 'user-1'),
      ).rejects.toThrow('DB error');
    });
  });

  describe('findById', () => {
    it('should return mission by id', async () => {
      prisma.localMission.findUnique.mockResolvedValue(mockMission as any);

      const result = await repository.findById('lm_123_abc');

      expect(prisma.localMission.findUnique).toHaveBeenCalledWith({
        where: { id: 'lm_123_abc' },
      });
      expect(result?.id).toBe('lm_123_abc');
    });

    it('should return null when not found', async () => {
      prisma.localMission.findUnique.mockResolvedValue(null);

      const result = await repository.findById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('findNearby', () => {
    it('should find nearby missions using Haversine', async () => {
      const nearbyMissions = [
        { ...mockMission, distanceKm: 1.5 },
        { ...mockMission, id: 'lm_456', distanceKm: 3.2 },
      ];
      prisma.$queryRaw.mockResolvedValue(nearbyMissions);

      const result = await repository.findNearby(45.5, -73.6, 10);

      expect(prisma.$queryRaw).toHaveBeenCalled();
      expect(result).toHaveLength(2);
    });

    it('should accept optional options parameter', async () => {
      prisma.$queryRaw.mockResolvedValue([mockMission]);

      const result = await repository.findNearby(45.5, -73.6, 10, { sort: 'date' });

      expect(prisma.$queryRaw).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });
  });

  describe('updateStatus', () => {
    it('should update mission status', async () => {
      prisma.localMission.update.mockResolvedValue({
        ...mockMission,
        status: 'assigned',
        assignedToUserId: 'worker-1',
      } as any);

      const result = await repository.updateStatus('lm_123_abc', 'assigned', 'worker-1');

      expect(prisma.localMission.update).toHaveBeenCalledWith({
        where: { id: 'lm_123_abc' },
        data: {
          status: 'assigned',
          assignedToUserId: 'worker-1',
          updatedAt: expect.any(Date),
        },
      });
      expect(result.status).toBe('assigned');
    });

    it('should clear assignedToUserId when set to null', async () => {
      prisma.localMission.update.mockResolvedValue({
        ...mockMission,
        status: 'cancelled',
        assignedToUserId: null,
      } as any);

      await repository.updateStatus('lm_123_abc', 'cancelled', null);

      expect(prisma.localMission.update).toHaveBeenCalledWith({
        where: { id: 'lm_123_abc' },
        data: {
          status: 'cancelled',
          assignedToUserId: null,
          updatedAt: expect.any(Date),
        },
      });
    });
  });

  describe('findByCreator', () => {
    it('should return missions by creator', async () => {
      prisma.localMission.findMany.mockResolvedValue([mockMission]);

      const result = await repository.findByCreator('user-1');

      expect(prisma.localMission.findMany).toHaveBeenCalledWith({
        where: { createdByUserId: 'user-1' },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('findByWorker', () => {
    it('should return missions by worker', async () => {
      prisma.localMission.findMany.mockResolvedValue([
        { ...mockMission, assignedToUserId: 'worker-1' },
      ]);

      const result = await repository.findByWorker('worker-1');

      expect(prisma.localMission.findMany).toHaveBeenCalledWith({
        where: { assignedToUserId: 'worker-1' },
        orderBy: { updatedAt: 'desc' },
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('findByBbox', () => {
    it('should find missions within bounding box', async () => {
      prisma.localMission.findMany.mockResolvedValue([mockMission] as any);

      const result = await repository.findByBbox(45.55, 45.45, -73.5, -73.7);

      expect(prisma.localMission.findMany).toHaveBeenCalledWith({
        where: {
          latitude: { gte: 45.45, lte: 45.55 },
          longitude: { gte: -73.7, lte: -73.5 },
          status: 'open',
        },
        select: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        take: 200,
      });
      expect(result).toHaveLength(1);
    });

    it('should filter by category', async () => {
      prisma.localMission.findMany.mockResolvedValue([mockMission] as any);

      await repository.findByBbox(45.55, 45.45, -73.5, -73.7, 'open', 'plumbing');

      expect(prisma.localMission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            category: 'plumbing',
          }),
        }),
      );
    });

    it('should respect limit with max 500', async () => {
      prisma.localMission.findMany.mockResolvedValue([]);

      await repository.findByBbox(45.55, 45.45, -73.5, -73.7, 'open', undefined, 1000);

      expect(prisma.localMission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 500,
        }),
      );
    });
  });
});
