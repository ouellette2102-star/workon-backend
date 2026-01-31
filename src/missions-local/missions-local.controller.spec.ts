import { Test, TestingModule } from '@nestjs/testing';
import { MissionsLocalController } from './missions-local.controller';
import { MissionsLocalService } from './missions-local.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LocalMissionStatus } from '@prisma/client';

describe('MissionsLocalController', () => {
  let controller: MissionsLocalController;
  let service: any; // Use any for easier mock typing

  const mockMission = {
    id: 'mission-1',
    title: 'Test Mission',
    description: 'Test description',
    category: 'plumbing',
    city: 'Montreal',
    address: '123 Main St',
    latitude: 45.5,
    longitude: -73.6,
    price: 100,
    status: LocalMissionStatus.open,
    createdByUserId: 'user-1',
    assignedToUserId: null,
    paidAt: null,
    stripePaymentIntentId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockReq = {
    user: {
      sub: 'user-1',
      role: 'employer',
    },
  };

  const mockWorkerReq = {
    user: {
      sub: 'worker-1',
      role: 'worker',
    },
  };

  beforeEach(async () => {
    const mockService = {
      create: jest.fn(),
      findById: jest.fn(),
      findNearby: jest.fn(),
      findByBbox: jest.fn(),
      findMyMissions: jest.fn(),
      findMyAssignments: jest.fn(),
      accept: jest.fn(),
      start: jest.fn(),
      complete: jest.fn(),
      cancel: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MissionsLocalController],
      providers: [
        { provide: MissionsLocalService, useValue: mockService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<MissionsLocalController>(MissionsLocalController);
    service = module.get(MissionsLocalService);
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
        latitude: 45.5,
        longitude: -73.6,
        price: 150,
      };

      service.create.mockResolvedValue({ ...mockMission, ...createDto });

      const result = await controller.create(createDto as any, mockReq);

      expect(service.create).toHaveBeenCalledWith(createDto, 'user-1', 'employer');
      expect(result).toBeDefined();
    });
  });

  describe('findByMap', () => {
    it('should return missions within bbox', async () => {
      const query = {
        north: 45.55,
        south: 45.45,
        east: -73.5,
        west: -73.7,
      };

      service.findByBbox.mockResolvedValue({
        missions: [mockMission],
        count: 1,
        bbox: query,
      });

      const result = await controller.findByMap(query as any);

      expect(service.findByBbox).toHaveBeenCalledWith(query);
      expect(result.count).toBe(1);
    });
  });

  describe('findNearby', () => {
    it('should return nearby missions for worker', async () => {
      const query = {
        latitude: 45.5,
        longitude: -73.6,
        radiusKm: 10,
      };

      service.findNearby.mockResolvedValue([mockMission]);

      const result = await controller.findNearby(query as any, mockWorkerReq);

      expect(service.findNearby).toHaveBeenCalledWith(query, 'worker');
      expect(result).toHaveLength(1);
    });
  });

  describe('accept', () => {
    it('should accept a mission', async () => {
      service.accept.mockResolvedValue({
        ...mockMission,
        status: LocalMissionStatus.assigned,
        assignedToUserId: 'worker-1',
      });

      const result = await controller.accept('mission-1', mockWorkerReq);

      expect(service.accept).toHaveBeenCalledWith('mission-1', 'worker-1', 'worker');
      expect(result).toBeDefined();
    });
  });

  describe('start', () => {
    it('should start a mission', async () => {
      service.start.mockResolvedValue({
        ...mockMission,
        status: LocalMissionStatus.in_progress,
        assignedToUserId: 'worker-1',
      });

      const result = await controller.start('mission-1', mockWorkerReq);

      expect(service.start).toHaveBeenCalledWith('mission-1', 'worker-1', 'worker');
      expect(result).toBeDefined();
    });
  });

  describe('complete', () => {
    it('should complete a mission', async () => {
      service.complete.mockResolvedValue({
        ...mockMission,
        status: LocalMissionStatus.completed,
      });

      const result = await controller.complete('mission-1', mockReq);

      expect(service.complete).toHaveBeenCalledWith('mission-1', 'user-1', 'employer');
      expect(result).toBeDefined();
    });
  });

  describe('cancel', () => {
    it('should cancel a mission', async () => {
      service.cancel.mockResolvedValue({
        ...mockMission,
        status: LocalMissionStatus.cancelled,
      });

      const result = await controller.cancel('mission-1', mockReq);

      expect(service.cancel).toHaveBeenCalledWith('mission-1', 'user-1', 'employer');
      expect(result).toBeDefined();
    });
  });

  describe('findMyMissions', () => {
    it('should return user created missions', async () => {
      service.findMyMissions.mockResolvedValue([mockMission]);

      const result = await controller.findMyMissions(mockReq);

      expect(service.findMyMissions).toHaveBeenCalledWith('user-1');
      expect(result).toHaveLength(1);
    });
  });

  describe('findMyAssignments', () => {
    it('should return worker assignments', async () => {
      service.findMyAssignments.mockResolvedValue([mockMission]);

      const result = await controller.findMyAssignments(mockWorkerReq);

      expect(service.findMyAssignments).toHaveBeenCalledWith('worker-1');
      expect(result).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('should return a mission by id', async () => {
      service.findById.mockResolvedValue(mockMission);

      const result = await controller.findOne('mission-1');

      expect(service.findById).toHaveBeenCalledWith('mission-1');
      expect(result).toBeDefined();
    });
  });
});
