import { Test, TestingModule } from '@nestjs/testing';
import { MissionEventsController } from './mission-events.controller';
import { MissionEventsService } from './mission-events.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

describe('MissionEventsController', () => {
  let controller: MissionEventsController;
  let service: any;

  const mockEvent: any = {
    id: 'event-1',
    missionId: 'mission-1',
    type: 'MISSION_CREATED',
    actorUserId: 'user-1',
    targetUserId: null,
    payload: {},
    createdAt: new Date(),
  };

  const mockReq = { user: { sub: 'user-1' } };

  beforeEach(async () => {
    const mockService = {
      listMissionEvents: jest.fn(),
      listMyEvents: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MissionEventsController],
      providers: [{ provide: MissionEventsService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<MissionEventsController>(MissionEventsController);
    service = module.get(MissionEventsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getMissionEvents', () => {
    it('should return events for mission', async () => {
      const response = {
        events: [mockEvent],
        total: 1,
        hasMore: false,
      };
      service.listMissionEvents.mockResolvedValue(response);

      const result = await controller.getMissionEvents(
        'mission-1',
        {} as any,
        mockReq,
      );

      expect(service.listMissionEvents).toHaveBeenCalledWith(
        'mission-1',
        'user-1',
        { limit: undefined, cursor: undefined },
      );
      expect(result.events).toHaveLength(1);
    });

    it('should pass query parameters', async () => {
      const query = { limit: 10, cursor: 'cursor-1' };
      service.listMissionEvents.mockResolvedValue({
        events: [],
        total: 0,
        hasMore: false,
      });

      await controller.getMissionEvents('mission-1', query as any, mockReq);

      expect(service.listMissionEvents).toHaveBeenCalledWith(
        'mission-1',
        'user-1',
        { limit: 10, cursor: 'cursor-1' },
      );
    });
  });

  describe('getMyEvents', () => {
    it('should return user events', async () => {
      const response = {
        events: [mockEvent],
        total: 1,
        hasMore: false,
      };
      service.listMyEvents.mockResolvedValue(response);

      const result = await controller.getMyEvents({} as any, mockReq);

      expect(service.listMyEvents).toHaveBeenCalledWith('user-1', {
        limit: undefined,
        cursor: undefined,
      });
      expect(result.events).toHaveLength(1);
    });
  });
});
