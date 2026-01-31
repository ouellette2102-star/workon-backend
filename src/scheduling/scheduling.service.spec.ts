import { Test, TestingModule } from '@nestjs/testing';
import { SchedulingService } from './scheduling.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { BookingStatus, RecurrenceRule } from '@prisma/client';

describe('SchedulingService', () => {
  let service: SchedulingService;
  let prisma: PrismaService;

  const mockPrisma = {
    workerProfile: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    category: {
      findUnique: jest.fn(),
    },
    recurringMissionTemplate: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    availabilitySlot: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      deleteMany: jest.fn(),
    },
    booking: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockWorker = {
    id: 'worker_1',
    userId: 'user_1',
  };

  const mockCategory = {
    id: 'cat_1',
    name: 'Cleaning',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchedulingService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<SchedulingService>(SchedulingService);
    prisma = module.get<PrismaService>(PrismaService);

    // Silence logger
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createRecurringTemplate', () => {
    it('should create a recurring template', async () => {
      mockPrisma.workerProfile.findUnique.mockResolvedValue(mockWorker);
      mockPrisma.category.findUnique.mockResolvedValue(mockCategory);
      mockPrisma.recurringMissionTemplate.create.mockResolvedValue({
        id: 'template_1',
        workerId: 'worker_1',
        title: 'Weekly Cleaning',
      });

      const result = await service.createRecurringTemplate({
        workerId: 'worker_1',
        title: 'Weekly Cleaning',
        description: 'Weekly house cleaning',
        categoryId: 'cat_1',
        priceType: 'FIXED',
        price: 50,
        duration: 120,
        recurrenceRule: RecurrenceRule.WEEKLY,
      });

      expect(result.id).toBe('template_1');
    });

    it('should throw NotFoundException when worker not found', async () => {
      mockPrisma.workerProfile.findUnique.mockResolvedValue(null);

      await expect(
        service.createRecurringTemplate({
          workerId: 'nonexistent',
          title: 'Test',
          description: 'Test',
          categoryId: 'cat_1',
          priceType: 'FIXED',
          price: 50,
          duration: 60,
          recurrenceRule: RecurrenceRule.WEEKLY,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when category not found', async () => {
      mockPrisma.workerProfile.findUnique.mockResolvedValue(mockWorker);
      mockPrisma.category.findUnique.mockResolvedValue(null);

      await expect(
        service.createRecurringTemplate({
          workerId: 'worker_1',
          title: 'Test',
          description: 'Test',
          categoryId: 'nonexistent',
          priceType: 'FIXED',
          price: 50,
          duration: 60,
          recurrenceRule: RecurrenceRule.WEEKLY,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getWorkerTemplates', () => {
    it('should return active templates', async () => {
      mockPrisma.recurringMissionTemplate.findMany.mockResolvedValue([
        { id: 'template_1', title: 'Template 1' },
      ]);

      const result = await service.getWorkerTemplates('worker_1');

      expect(result).toHaveLength(1);
    });
  });

  describe('deactivateTemplate', () => {
    it('should deactivate template', async () => {
      mockPrisma.recurringMissionTemplate.findFirst.mockResolvedValue({
        id: 'template_1',
        workerId: 'worker_1',
      });
      mockPrisma.recurringMissionTemplate.update.mockResolvedValue({});

      await service.deactivateTemplate('template_1', 'worker_1');

      expect(mockPrisma.recurringMissionTemplate.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException when template not found', async () => {
      mockPrisma.recurringMissionTemplate.findFirst.mockResolvedValue(null);

      await expect(
        service.deactivateTemplate('nonexistent', 'worker_1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('setAvailability', () => {
    it('should set availability slots', async () => {
      mockPrisma.workerProfile.findUnique.mockResolvedValue(mockWorker);
      mockPrisma.$transaction.mockResolvedValue([]);
      mockPrisma.availabilitySlot.findMany.mockResolvedValue([]);

      const result = await service.setAvailability({
        workerId: 'worker_1',
        slots: [
          { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' },
        ],
      });

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should throw NotFoundException when worker not found', async () => {
      mockPrisma.workerProfile.findUnique.mockResolvedValue(null);

      await expect(
        service.setAvailability({
          workerId: 'nonexistent',
          slots: [],
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for invalid time format', async () => {
      mockPrisma.workerProfile.findUnique.mockResolvedValue(mockWorker);

      await expect(
        service.setAvailability({
          workerId: 'worker_1',
          slots: [{ dayOfWeek: 1, startTime: 'invalid', endTime: '17:00' }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid dayOfWeek', async () => {
      mockPrisma.workerProfile.findUnique.mockResolvedValue(mockWorker);

      await expect(
        service.setAvailability({
          workerId: 'worker_1',
          slots: [{ dayOfWeek: 7, startTime: '09:00', endTime: '17:00' }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when startTime >= endTime', async () => {
      mockPrisma.workerProfile.findUnique.mockResolvedValue(mockWorker);

      await expect(
        service.setAvailability({
          workerId: 'worker_1',
          slots: [{ dayOfWeek: 1, startTime: '17:00', endTime: '09:00' }],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('blockTimeOff', () => {
    it('should create blocked time slot', async () => {
      mockPrisma.availabilitySlot.create.mockResolvedValue({
        id: 'slot_1',
        isBlocked: true,
      });

      const result = await service.blockTimeOff({
        workerId: 'worker_1',
        date: new Date(),
        startTime: '09:00',
        endTime: '12:00',
      });

      expect(result.isBlocked).toBe(true);
    });
  });

  describe('getWorkerAvailability', () => {
    it('should return grouped availability', async () => {
      mockPrisma.availabilitySlot.findMany.mockResolvedValue([
        { isRecurring: true, isBlocked: false },
        { isRecurring: false, isBlocked: true },
      ]);

      const result = await service.getWorkerAvailability('worker_1');

      expect(result.recurring).toHaveLength(1);
      expect(result.blocked).toHaveLength(1);
    });
  });

  describe('isWorkerAvailable', () => {
    it('should return false when time is blocked', async () => {
      mockPrisma.availabilitySlot.findFirst.mockResolvedValue({ isBlocked: true });

      const result = await service.isWorkerAvailable(
        'worker_1',
        new Date(),
        60,
      );

      expect(result).toBe(false);
    });

    it('should return false when booking exists', async () => {
      mockPrisma.availabilitySlot.findFirst.mockResolvedValue(null);
      mockPrisma.booking.findFirst.mockResolvedValue({ id: 'booking_1' });

      const result = await service.isWorkerAvailable(
        'worker_1',
        new Date(),
        60,
      );

      expect(result).toBe(false);
    });
  });

  describe('createBooking', () => {
    it('should throw BadRequestException when worker not available', async () => {
      mockPrisma.availabilitySlot.findFirst.mockResolvedValue({ isBlocked: true });

      await expect(
        service.createBooking({
          clientId: 'client_1',
          workerId: 'worker_1',
          title: 'Test Booking',
          scheduledAt: new Date(),
          duration: 60,
          price: 50,
          priceType: 'FIXED',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('confirmBooking', () => {
    it('should confirm pending booking', async () => {
      mockPrisma.booking.findFirst.mockResolvedValue({
        id: 'booking_1',
        status: BookingStatus.PENDING,
      });
      mockPrisma.booking.update.mockResolvedValue({});

      await service.confirmBooking('booking_1', 'worker_1');

      expect(mockPrisma.booking.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException when booking not found', async () => {
      mockPrisma.booking.findFirst.mockResolvedValue(null);

      await expect(
        service.confirmBooking('nonexistent', 'worker_1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for non-pending booking', async () => {
      mockPrisma.booking.findFirst.mockResolvedValue({
        id: 'booking_1',
        status: BookingStatus.CONFIRMED,
      });

      await expect(
        service.confirmBooking('booking_1', 'worker_1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancelBooking', () => {
    it('should throw NotFoundException when booking not found', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue(null);

      await expect(
        service.cancelBooking('nonexistent', 'user_1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for completed booking', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue({
        id: 'booking_1',
        status: BookingStatus.COMPLETED,
      });

      await expect(
        service.cancelBooking('booking_1', 'user_1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getClientBookings', () => {
    it('should return client bookings', async () => {
      mockPrisma.booking.findMany.mockResolvedValue([{ id: 'booking_1' }]);

      const result = await service.getClientBookings('client_1');

      expect(result).toHaveLength(1);
    });

    it('should filter by status', async () => {
      mockPrisma.booking.findMany.mockResolvedValue([]);

      await service.getClientBookings('client_1', { status: BookingStatus.CONFIRMED });

      expect(mockPrisma.booking.findMany).toHaveBeenCalled();
    });
  });

  describe('getWorkerBookings', () => {
    it('should return worker bookings', async () => {
      mockPrisma.booking.findMany.mockResolvedValue([{ id: 'booking_1' }]);

      const result = await service.getWorkerBookings('worker_1');

      expect(result).toHaveLength(1);
    });
  });

  describe('completeBooking', () => {
    it('should complete confirmed booking', async () => {
      mockPrisma.booking.findFirst.mockResolvedValue({
        id: 'booking_1',
        status: BookingStatus.CONFIRMED,
      });
      mockPrisma.booking.update.mockResolvedValue({});

      await service.completeBooking('booking_1', 'worker_1');

      expect(mockPrisma.booking.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException when booking not found', async () => {
      mockPrisma.booking.findFirst.mockResolvedValue(null);

      await expect(
        service.completeBooking('nonexistent', 'worker_1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for pending booking', async () => {
      mockPrisma.booking.findFirst.mockResolvedValue({
        id: 'booking_1',
        status: BookingStatus.PENDING,
      });

      await expect(
        service.completeBooking('booking_1', 'worker_1'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
