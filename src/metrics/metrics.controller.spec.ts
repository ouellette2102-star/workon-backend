import { Test, TestingModule } from '@nestjs/testing';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';

describe('MetricsController', () => {
  let controller: MetricsController;
  let service: any;

  beforeEach(async () => {
    const mockService = {
      getPrometheusMetrics: jest.fn(),
      calculateRatio: jest.fn(),
      getAvailableRegions: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MetricsController],
      providers: [{ provide: MetricsService, useValue: mockService }],
    }).compile();

    controller = module.get<MetricsController>(MetricsController);
    service = module.get(MetricsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getPrometheusMetrics', () => {
    it('should return prometheus metrics', async () => {
      const mockMetrics = '# HELP workon_users_total Total users\nworkon_users_total 100';
      service.getPrometheusMetrics.mockResolvedValue(mockMetrics);

      const mockRes = { send: jest.fn() };
      await controller.getPrometheusMetrics(mockRes as any);

      expect(service.getPrometheusMetrics).toHaveBeenCalled();
      expect(mockRes.send).toHaveBeenCalledWith(mockMetrics);
    });
  });

  describe('getRatio', () => {
    it('should return worker/employer ratio', async () => {
      const ratioResponse: any = {
        workerCount: 50,
        employerCount: 20,
        ratio: 2.5,
        region: null,
      };
      service.calculateRatio.mockResolvedValue(ratioResponse);

      const result = await controller.getRatio();

      expect(service.calculateRatio).toHaveBeenCalledWith(undefined);
      expect(result).toBeDefined();
    });

    it('should filter by region', async () => {
      const ratioResponse: any = {
        workerCount: 30,
        employerCount: 10,
        ratio: 3.0,
        region: 'Montréal',
      };
      service.calculateRatio.mockResolvedValue(ratioResponse);

      const result = await controller.getRatio('Montréal');

      expect(service.calculateRatio).toHaveBeenCalledWith('Montréal');
      expect(result).toBeDefined();
    });
  });

  describe('getRegions', () => {
    it('should return available regions', async () => {
      const regions = ['Montréal', 'Laval', 'Québec'];
      service.getAvailableRegions.mockResolvedValue(regions);

      const result = await controller.getRegions();

      expect(service.getAvailableRegions).toHaveBeenCalled();
      expect(result).toEqual(regions);
    });
  });
});
