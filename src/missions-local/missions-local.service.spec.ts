import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { MissionsLocalService } from './missions-local.service';
import { MissionsLocalRepository } from './missions-local.repository';

describe('MissionsLocalService', () => {
  let service: MissionsLocalService;
  let repository: jest.Mocked<MissionsLocalRepository>;

  const mockMissionOpen = {
    id: 'mission-1',
    title: 'Test Mission',
    description: 'Test description',
    category: 'plumbing',
    city: 'Montreal',
    address: '123 Main St',
    latitude: 45.5,
    longitude: -73.6,
    price: 100,
    status: 'open' as const,
    createdByUserId: 'user-employer-1',
    assignedToUserId: null,
    paidAt: null,
    stripePaymentIntentId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockMissionAssigned = {
    ...mockMissionOpen,
    id: 'mission-2',
    status: 'assigned' as const,
    assignedToUserId: 'user-worker-1',
  };

  const mockMissionInProgress = {
    ...mockMissionOpen,
    id: 'mission-3',
    status: 'in_progress' as const,
    assignedToUserId: 'user-worker-1',
  };

  const mockMissionCompleted = {
    ...mockMissionOpen,
    id: 'mission-4',
    status: 'completed' as const,
    assignedToUserId: 'user-worker-1',
  };

  const mockMissionCancelled = {
    ...mockMissionOpen,
    id: 'mission-5',
    status: 'cancelled' as const,
  };

  const createMockRepository = () => ({
    create: jest.fn(),
    findById: jest.fn(),
    findNearby: jest.fn(),
    findByBbox: jest.fn(),
    findByCreator: jest.fn(),
    findByWorker: jest.fn(),
    updateStatus: jest.fn(),
  });

  beforeEach(async () => {
    const mockRepo = createMockRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MissionsLocalService,
        { provide: MissionsLocalRepository, useValue: mockRepo },
      ],
    }).compile();

    service = module.get<MissionsLocalService>(MissionsLocalService);
    repository = module.get(MissionsLocalRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================
  // CREATE
  // ===========================================
  describe('create', () => {
    const createDto = {
      title: 'New Mission',
      description: 'Description',
      category: 'plumbing',
      city: 'Montreal',
      address: '123 Main St',
      latitude: 45.5,
      longitude: -73.6,
      price: 150,
    };

    it('should create mission for employer', async () => {
      repository.create.mockResolvedValue({
        ...mockMissionOpen,
        ...createDto,
        id: 'new-mission-1',
      });

      const result = await service.create(
        createDto as any,
        'user-employer-1',
        'employer',
      );

      expect(result.title).toBe('New Mission');
      expect(repository.create).toHaveBeenCalledWith(createDto, 'user-employer-1');
    });

    it('should create mission for residential_client', async () => {
      repository.create.mockResolvedValue({
        ...mockMissionOpen,
        id: 'new-mission-2',
      });

      const result = await service.create(
        createDto as any,
        'user-client-1',
        'residential_client',
      );

      expect(result).toBeDefined();
      expect(repository.create).toHaveBeenCalled();
    });

    it('should throw ForbiddenException for worker trying to create', async () => {
      await expect(
        service.create(createDto as any, 'user-worker-1', 'worker'),
      ).rejects.toThrow(ForbiddenException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException for unknown role', async () => {
      await expect(
        service.create(createDto as any, 'user-1', 'unknown'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ===========================================
  // FIND BY ID
  // ===========================================
  describe('findById', () => {
    it('should return mission when found', async () => {
      repository.findById.mockResolvedValue(mockMissionOpen);

      const result = await service.findById('mission-1');

      expect(result.id).toBe('mission-1');
      expect(result.title).toBe('Test Mission');
    });

    it('should throw NotFoundException when mission not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findById('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ===========================================
  // FIND NEARBY
  // ===========================================
  describe('findNearby', () => {
    const nearbyQuery = {
      latitude: 45.5,
      longitude: -73.6,
      radiusKm: 10,
    };

    it('should return nearby missions for worker', async () => {
      repository.findNearby.mockResolvedValue([mockMissionOpen]);

      const result = await service.findNearby(nearbyQuery, 'worker');

      expect(result).toHaveLength(1);
      expect(repository.findNearby).toHaveBeenCalledWith(45.5, -73.6, 10, {
        sort: undefined,
        category: undefined,
        query: undefined,
      });
    });

    it('should use default radius when not provided', async () => {
      repository.findNearby.mockResolvedValue([]);

      await service.findNearby(
        { latitude: 45.5, longitude: -73.6 } as any,
        'worker',
      );

      expect(repository.findNearby).toHaveBeenCalledWith(45.5, -73.6, 10, {
        sort: undefined,
        category: undefined,
        query: undefined,
      });
    });

    it('should pass sort/filter options to repository', async () => {
      repository.findNearby.mockResolvedValue([]);

      await service.findNearby(
        {
          latitude: 45.5,
          longitude: -73.6,
          radiusKm: 20,
          sort: 'date',
          category: 'Entretien',
          query: 'plomberie',
        },
        'worker',
      );

      expect(repository.findNearby).toHaveBeenCalledWith(45.5, -73.6, 20, {
        sort: 'date',
        category: 'Entretien',
        query: 'plomberie',
      });
    });

    it('should throw ForbiddenException for employer', async () => {
      await expect(
        service.findNearby(nearbyQuery, 'employer'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException for residential_client', async () => {
      await expect(
        service.findNearby(nearbyQuery, 'residential_client'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ===========================================
  // ACCEPT
  // ===========================================
  describe('accept', () => {
    it('should accept open mission for worker', async () => {
      repository.findById.mockResolvedValue(mockMissionOpen);
      repository.updateStatus.mockResolvedValue({
        ...mockMissionOpen,
        status: 'assigned',
        assignedToUserId: 'user-worker-1',
      });

      const result = await service.accept(
        'mission-1',
        'user-worker-1',
        'worker',
      );

      expect(result.status).toBe('assigned');
      expect(result.assignedToUserId).toBe('user-worker-1');
      expect(repository.updateStatus).toHaveBeenCalledWith(
        'mission-1',
        'assigned',
        'user-worker-1',
      );
    });

    it('should throw ForbiddenException for employer', async () => {
      await expect(
        service.accept('mission-1', 'user-employer-1', 'employer'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException for non-existent mission', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(
        service.accept('non-existent', 'user-worker-1', 'worker'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for already assigned mission', async () => {
      repository.findById.mockResolvedValue(mockMissionAssigned);

      await expect(
        service.accept('mission-2', 'user-worker-2', 'worker'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for non-open status', async () => {
      repository.findById.mockResolvedValue(mockMissionInProgress);

      await expect(
        service.accept('mission-3', 'user-worker-2', 'worker'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ===========================================
  // START
  // ===========================================
  describe('start', () => {
    it('should start assigned mission for assigned worker', async () => {
      repository.findById.mockResolvedValue(mockMissionAssigned);
      repository.updateStatus.mockResolvedValue({
        ...mockMissionAssigned,
        status: 'in_progress',
      });

      const result = await service.start(
        'mission-2',
        'user-worker-1',
        'worker',
      );

      expect(result.status).toBe('in_progress');
      expect(repository.updateStatus).toHaveBeenCalledWith(
        'mission-2',
        'in_progress',
      );
    });

    it('should throw ForbiddenException for employer', async () => {
      await expect(
        service.start('mission-2', 'user-employer-1', 'employer'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException for non-existent mission', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(
        service.start('non-existent', 'user-worker-1', 'worker'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if not assigned worker', async () => {
      repository.findById.mockResolvedValue(mockMissionAssigned);

      await expect(
        service.start('mission-2', 'user-worker-2', 'worker'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException for non-assigned status (no worker assigned)', async () => {
      repository.findById.mockResolvedValue(mockMissionOpen);

      // Mission open has no assignedToUserId, so worker can't start it
      await expect(
        service.start('mission-1', 'user-worker-1', 'worker'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ===========================================
  // COMPLETE
  // ===========================================
  describe('complete', () => {
    it('should complete mission for assigned worker', async () => {
      repository.findById.mockResolvedValue(mockMissionInProgress);
      repository.updateStatus.mockResolvedValue({
        ...mockMissionInProgress,
        status: 'completed',
      });

      const result = await service.complete(
        'mission-3',
        'user-worker-1',
        'worker',
      );

      expect(result.status).toBe('completed');
    });

    it('should complete mission for creator', async () => {
      repository.findById.mockResolvedValue(mockMissionInProgress);
      repository.updateStatus.mockResolvedValue({
        ...mockMissionInProgress,
        status: 'completed',
      });

      const result = await service.complete(
        'mission-3',
        'user-employer-1', // createdByUserId
        'employer',
      );

      expect(result.status).toBe('completed');
    });

    it('should throw NotFoundException for non-existent mission', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(
        service.complete('non-existent', 'user-worker-1', 'worker'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for unauthorized user', async () => {
      repository.findById.mockResolvedValue(mockMissionInProgress);

      await expect(
        service.complete('mission-3', 'random-user', 'worker'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if already completed', async () => {
      repository.findById.mockResolvedValue(mockMissionCompleted);

      await expect(
        service.complete('mission-4', 'user-worker-1', 'worker'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for cancelled mission', async () => {
      repository.findById.mockResolvedValue(mockMissionCancelled);

      await expect(
        service.complete('mission-5', 'user-employer-1', 'employer'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ===========================================
  // CANCEL
  // ===========================================
  describe('cancel', () => {
    it('should cancel mission for creator', async () => {
      repository.findById.mockResolvedValue(mockMissionOpen);
      repository.updateStatus.mockResolvedValue({
        ...mockMissionOpen,
        status: 'cancelled',
      });

      const result = await service.cancel(
        'mission-1',
        'user-employer-1',
        'employer',
      );

      expect(result.status).toBe('cancelled');
      expect(repository.updateStatus).toHaveBeenCalledWith(
        'mission-1',
        'cancelled',
        null,
      );
    });

    it('should cancel mission for admin', async () => {
      repository.findById.mockResolvedValue(mockMissionOpen);
      repository.updateStatus.mockResolvedValue({
        ...mockMissionOpen,
        status: 'cancelled',
      });

      const result = await service.cancel('mission-1', 'admin-user', 'admin');

      expect(result.status).toBe('cancelled');
    });

    it('should throw NotFoundException for non-existent mission', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(
        service.cancel('non-existent', 'user-employer-1', 'employer'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for non-creator/non-admin', async () => {
      repository.findById.mockResolvedValue(mockMissionOpen);

      await expect(
        service.cancel('mission-1', 'user-worker-1', 'worker'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException for completed mission', async () => {
      repository.findById.mockResolvedValue(mockMissionCompleted);

      await expect(
        service.cancel('mission-4', 'user-employer-1', 'employer'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if already cancelled', async () => {
      repository.findById.mockResolvedValue(mockMissionCancelled);

      await expect(
        service.cancel('mission-5', 'user-employer-1', 'employer'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ===========================================
  // FIND MY MISSIONS
  // ===========================================
  describe('findMyMissions', () => {
    it('should return missions created by user', async () => {
      repository.findByCreator.mockResolvedValue([
        mockMissionOpen,
        mockMissionAssigned,
      ]);

      const result = await service.findMyMissions('user-employer-1');

      expect(result).toHaveLength(2);
      expect(repository.findByCreator).toHaveBeenCalledWith('user-employer-1');
    });

    it('should return empty array when no missions', async () => {
      repository.findByCreator.mockResolvedValue([]);

      const result = await service.findMyMissions('user-no-missions');

      expect(result).toEqual([]);
    });
  });

  // ===========================================
  // FIND MY ASSIGNMENTS
  // ===========================================
  describe('findMyAssignments', () => {
    it('should return missions assigned to worker', async () => {
      repository.findByWorker.mockResolvedValue([mockMissionAssigned]);

      const result = await service.findMyAssignments('user-worker-1');

      expect(result).toHaveLength(1);
      expect(repository.findByWorker).toHaveBeenCalledWith('user-worker-1');
    });

    it('should return empty array when no assignments', async () => {
      repository.findByWorker.mockResolvedValue([]);

      const result = await service.findMyAssignments('user-no-assignments');

      expect(result).toEqual([]);
    });
  });

  // ===========================================
  // FIND BY BBOX (Map endpoint)
  // ===========================================
  describe('findByBbox', () => {
    const bboxQuery = {
      north: 45.55,
      south: 45.45,
      east: -73.5,
      west: -73.7,
      status: 'open',
      limit: 200,
    };

    it('should return missions within bbox', async () => {
      repository.findByBbox.mockResolvedValue([mockMissionOpen]);

      const result = await service.findByBbox(bboxQuery);

      expect(result.missions).toHaveLength(1);
      expect(result.count).toBe(1);
      expect(result.bbox).toEqual({
        north: 45.55,
        south: 45.45,
        east: -73.5,
        west: -73.7,
      });
    });

    it('should throw BadRequestException for invalid bbox (north <= south)', async () => {
      const invalidQuery = { ...bboxQuery, north: 45.4, south: 45.5 };

      await expect(service.findByBbox(invalidQuery)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for invalid bbox (east <= west)', async () => {
      const invalidQuery = { ...bboxQuery, east: -73.8, west: -73.5 };

      await expect(service.findByBbox(invalidQuery)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should use default status and limit', async () => {
      repository.findByBbox.mockResolvedValue([]);

      await service.findByBbox({
        north: 45.55,
        south: 45.45,
        east: -73.5,
        west: -73.7,
      } as any);

      expect(repository.findByBbox).toHaveBeenCalledWith(
        45.55,
        45.45,
        -73.5,
        -73.7,
        'open',
        undefined,
        200,
      );
    });
  });
});

