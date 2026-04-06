import { Test, TestingModule } from '@nestjs/testing';
import { SchedulingController } from './scheduling.controller';
import { SchedulingService } from './scheduling.service';
import { APP_GUARD } from '@nestjs/core';

describe('SchedulingController', () => {
  let controller: SchedulingController;
  let service: any;

  beforeEach(async () => {
    service = {
      createRecurringTemplate: jest.fn().mockResolvedValue({ id: 'tpl_1', title: 'Weekly Cleaning' }),
      getWorkerTemplates: jest.fn().mockResolvedValue([]),
      deactivateTemplate: jest.fn().mockResolvedValue(undefined),
      generateMissionsFromTemplate: jest.fn().mockResolvedValue({ templateId: 'tpl_1', generated: 4, missionIds: ['lm_1', 'lm_2', 'lm_3', 'lm_4'] }),
      setAvailability: jest.fn().mockResolvedValue({ count: 5 }),
      getWorkerAvailability: jest.fn().mockResolvedValue([]),
      blockTimeOff: jest.fn().mockResolvedValue({ id: 'slot_1' }),
      createBooking: jest.fn().mockResolvedValue({ id: 'bk_1', status: 'PENDING' }),
      confirmBooking: jest.fn().mockResolvedValue(undefined),
      cancelBooking: jest.fn().mockResolvedValue(undefined),
      completeBooking: jest.fn().mockResolvedValue(undefined),
      getClientBookings: jest.fn().mockResolvedValue([]),
      getWorkerBookings: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SchedulingController],
      providers: [
        { provide: SchedulingService, useValue: service },
      ],
    })
      .overrideGuard(require('../auth/guards/jwt-auth.guard').JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<SchedulingController>(SchedulingController);
  });

  const mockReq = { user: { sub: 'worker_1' } };

  describe('templates', () => {
    it('should create a recurring template', async () => {
      const dto = {
        title: 'Weekly Cleaning',
        description: 'House cleaning',
        categoryId: 'cat_1',
        priceType: 'fixed',
        price: 150,
        duration: 120,
        recurrenceRule: 'WEEKLY' as any,
      };

      const result = await controller.createTemplate(mockReq, dto);

      expect(service.createRecurringTemplate).toHaveBeenCalledWith(
        expect.objectContaining({ workerId: 'worker_1', title: 'Weekly Cleaning' }),
      );
      expect(result.id).toBe('tpl_1');
    });

    it('should generate missions from template', async () => {
      const result = await controller.generateFromTemplate(mockReq, 'tpl_1', '4');

      expect(service.generateMissionsFromTemplate).toHaveBeenCalledWith('tpl_1', 'worker_1', { count: 4 });
      expect(result.generated).toBe(4);
      expect(result.missionIds).toHaveLength(4);
    });

    it('should get worker templates', async () => {
      await controller.getTemplates(mockReq);
      expect(service.getWorkerTemplates).toHaveBeenCalledWith('worker_1');
    });

    it('should deactivate a template', async () => {
      await controller.deactivateTemplate(mockReq, 'tpl_1');
      expect(service.deactivateTemplate).toHaveBeenCalledWith('tpl_1', 'worker_1');
    });
  });

  describe('bookings', () => {
    it('should create a booking', async () => {
      const dto = {
        workerId: 'worker_2',
        title: 'Plumbing repair',
        scheduledAt: '2026-04-15T09:00:00Z',
        duration: 60,
        price: 100,
        priceType: 'fixed',
      };

      const result = await controller.createBooking(mockReq, dto);

      expect(service.createBooking).toHaveBeenCalledWith(
        expect.objectContaining({ clientId: 'worker_1', workerId: 'worker_2' }),
      );
      expect(result.status).toBe('PENDING');
    });

    it('should confirm a booking', async () => {
      await controller.confirmBooking(mockReq, 'bk_1');
      expect(service.confirmBooking).toHaveBeenCalledWith('bk_1', 'worker_1');
    });

    it('should cancel a booking with reason', async () => {
      await controller.cancelBooking(mockReq, 'bk_1', { reason: 'Schedule conflict' });
      expect(service.cancelBooking).toHaveBeenCalledWith('bk_1', 'worker_1', 'Schedule conflict');
    });

    it('should complete a booking', async () => {
      await controller.completeBooking(mockReq, 'bk_1');
      expect(service.completeBooking).toHaveBeenCalledWith('bk_1', 'worker_1');
    });

    it('should get client bookings', async () => {
      await controller.getMyBookings(mockReq, undefined, 'true');
      expect(service.getClientBookings).toHaveBeenCalledWith('worker_1', { status: undefined, upcoming: true });
    });

    it('should get worker bookings', async () => {
      await controller.getWorkerBookings(mockReq, 'CONFIRMED' as any, undefined);
      expect(service.getWorkerBookings).toHaveBeenCalledWith('worker_1', { status: 'CONFIRMED', upcoming: false });
    });
  });

  describe('availability', () => {
    it('should set availability', async () => {
      const dto = { slots: [{ dayOfWeek: 1, startTime: '09:00', endTime: '17:00' }] };
      await controller.setAvailability(mockReq, dto);
      expect(service.setAvailability).toHaveBeenCalledWith(
        expect.objectContaining({ workerId: 'worker_1' }),
      );
    });

    it('should get availability', async () => {
      await controller.getAvailability(mockReq);
      expect(service.getWorkerAvailability).toHaveBeenCalledWith('worker_1');
    });

    it('should block time off', async () => {
      const dto = { specificDate: '2026-04-20', startTime: '09:00', endTime: '17:00' };
      await controller.blockTimeOff(mockReq, dto);
      expect(service.blockTimeOff).toHaveBeenCalledWith(
        expect.objectContaining({ workerId: 'worker_1' }),
      );
    });
  });
});
