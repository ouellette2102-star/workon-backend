import { Test, TestingModule } from '@nestjs/testing';
import { MissionsMapController } from './missions-map.controller';
import { MissionsMapService } from './missions-map.service';

describe('MissionsMapController', () => {
  let controller: MissionsMapController;
  let service: any;

  const mockMissionPin: any = {
    id: 'lm_123_abc',
    title: 'Test Mission',
    category: 'cleaning',
    latitude: 45.5,
    longitude: -73.6,
    price: 100,
    status: 'open',
    city: 'Montreal',
  };

  beforeEach(async () => {
    const mockService = {
      getMissions: jest.fn(),
      getHealth: jest.fn(),
      getMissionById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MissionsMapController],
      providers: [{ provide: MissionsMapService, useValue: mockService }],
    }).compile();

    controller = module.get<MissionsMapController>(MissionsMapController);
    service = module.get(MissionsMapService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getMissions', () => {
    it('should return mission pins', async () => {
      service.getMissions.mockResolvedValue([mockMissionPin]);

      const result = await controller.getMissions({});

      expect(service.getMissions).toHaveBeenCalledWith({});
      expect(result).toHaveLength(1);
    });

    it('should pass query parameters', async () => {
      const query = { lat: 45.5, lng: -73.6, radius: 10, status: 'open' };
      service.getMissions.mockResolvedValue([]);

      await controller.getMissions(query as any);

      expect(service.getMissions).toHaveBeenCalledWith(query);
    });
  });

  describe('getHealth', () => {
    it('should return health status', async () => {
      const health: any = {
        totalMissions: 100,
        openMissions: 50,
        assignedMissions: 30,
        completedMissions: 20,
        timestamp: new Date().toISOString(),
      };
      service.getHealth.mockResolvedValue(health);

      const result = await controller.getHealth();

      expect(service.getHealth).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('getMissionById', () => {
    it('should return mission details', async () => {
      const missionDetail: any = {
        ...mockMissionPin,
        description: 'Full description',
        address: '123 Main St',
        createdAt: new Date(),
      };
      service.getMissionById.mockResolvedValue(missionDetail);

      const result = await controller.getMissionById('lm_123_abc');

      expect(service.getMissionById).toHaveBeenCalledWith('lm_123_abc');
      expect(result).toBeDefined();
    });
  });
});
