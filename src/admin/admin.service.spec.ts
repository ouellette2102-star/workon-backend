import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from './admin.service';
import { PaymentsService } from '../payments/payments.service';

describe('AdminService', () => {
  let service: AdminService;
  let paymentsService: PaymentsService;

  const mockPaymentsService = {
    reconcilePayments: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PaymentsService, useValue: mockPaymentsService },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    paymentsService = module.get<PaymentsService>(PaymentsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('reconcilePayments', () => {
    it('should call paymentsService.reconcilePayments', async () => {
      const mockResult = { reconciled: 10, errors: 0 };
      mockPaymentsService.reconcilePayments.mockResolvedValue(mockResult);

      const result = await service.reconcilePayments('admin_123');

      expect(result).toEqual(mockResult);
      expect(mockPaymentsService.reconcilePayments).toHaveBeenCalledWith(
        'admin_123',
        undefined,
      );
    });

    it('should pass options to paymentsService', async () => {
      const mockResult = { reconciled: 5, errors: 1 };
      mockPaymentsService.reconcilePayments.mockResolvedValue(mockResult);

      const options = {
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-01-31'),
      };

      const result = await service.reconcilePayments('admin_123', options);

      expect(result).toEqual(mockResult);
      expect(mockPaymentsService.reconcilePayments).toHaveBeenCalledWith(
        'admin_123',
        options,
      );
    });

    it('should handle errors from paymentsService', async () => {
      mockPaymentsService.reconcilePayments.mockRejectedValue(
        new Error('Reconciliation failed'),
      );

      await expect(service.reconcilePayments('admin_123')).rejects.toThrow(
        'Reconciliation failed',
      );
    });
  });
});
