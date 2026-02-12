import { Test, TestingModule } from '@nestjs/testing';
import { EarningsController } from './earnings.controller';
import { EarningsService } from './earnings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

describe('EarningsController', () => {
  let controller: EarningsController;
  let service: any;

  const mockSummary: any = {
    totalEarnings: 5000,
    paidAmount: 4000,
    pendingAmount: 1000,
    availableBalance: 900,
    platformFeePercent: 12,
    currency: 'CAD',
  };

  const mockHistoryResponse: any = {
    items: [
      {
        id: 'earning-1',
        missionId: 'mission-1',
        missionTitle: 'Test Mission',
        grossAmount: 100,
        platformFee: 12,
        netAmount: 88,
        status: 'PAID',
        completedAt: new Date(),
      },
    ],
    nextCursor: null,
    hasMore: false,
    total: 1,
  };

  const mockReq = { user: { sub: 'user-1' } };

  beforeEach(async () => {
    const mockService = {
      getSummary: jest.fn(),
      getHistory: jest.fn(),
      getByMission: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EarningsController],
      providers: [{ provide: EarningsService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<EarningsController>(EarningsController);
    service = module.get(EarningsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSummary', () => {
    it('should return earnings summary', async () => {
      service.getSummary.mockResolvedValue(mockSummary);

      const result = await controller.getSummary(mockReq);

      expect(service.getSummary).toHaveBeenCalledWith('user-1');
      expect(result).toBeDefined();
    });
  });

  describe('getHistory', () => {
    it('should return earnings history', async () => {
      service.getHistory.mockResolvedValue(mockHistoryResponse);

      const result = await controller.getHistory(mockReq, {});

      expect(service.getHistory).toHaveBeenCalledWith('user-1', undefined, 20);
      expect(result).toBeDefined();
    });

    it('should pass cursor and limit', async () => {
      service.getHistory.mockResolvedValue(mockHistoryResponse);

      await controller.getHistory(mockReq, { cursor: 'cursor-1', limit: 10 });

      expect(service.getHistory).toHaveBeenCalledWith('user-1', 'cursor-1', 10);
    });
  });

  describe('getByMission', () => {
    it('should return earnings for mission', async () => {
      const missionEarning: any = {
        missionId: 'mission-1',
        missionTitle: 'Test Mission',
        grossAmount: 100,
        platformFee: 12,
        netAmount: 88,
        status: 'PAID',
        completedAt: new Date(),
        paidAt: new Date(),
      };
      service.getByMission.mockResolvedValue(missionEarning);

      const result = await controller.getByMission(mockReq, 'mission-1');

      expect(service.getByMission).toHaveBeenCalledWith('user-1', 'mission-1');
      expect(result).toBeDefined();
    });
  });
});
