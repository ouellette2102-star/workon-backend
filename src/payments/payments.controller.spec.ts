import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ConsentGuard } from '../compliance/guards/consent.guard';

describe('PaymentsController', () => {
  let controller: PaymentsController;
  let service: any;

  const mockPaymentIntent: any = {
    clientSecret: 'pi_test_secret_123',
    paymentIntentId: 'pi_test_123',
    amount: 100,
    currency: 'CAD',
    status: 'requires_payment_method',
  };

  const mockReq = { user: { sub: 'user-1', userId: 'user-1', role: 'employer' } };

  beforeEach(async () => {
    const mockService = {
      createPaymentIntent: jest.fn(),
      capturePaymentIntent: jest.fn(),
      cancelPaymentIntent: jest.fn(),
      getPaymentStatus: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [{ provide: PaymentsService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(ConsentGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PaymentsController>(PaymentsController);
    service = module.get(PaymentsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createPaymentIntent', () => {
    it('should create payment intent', async () => {
      const dto = { missionId: 'mission-1', amount: 100 };
      service.createPaymentIntent.mockResolvedValue(mockPaymentIntent);

      const result = await controller.createPaymentIntent(
        mockReq,
        'mission-1',
        dto as any,
      );

      expect(service.createPaymentIntent).toHaveBeenCalledWith('user-1', {
        ...dto,
        missionId: 'mission-1',
      });
      expect(result).toBeDefined();
    });
  });

  describe('capturePayment', () => {
    it('should capture payment', async () => {
      service.capturePaymentIntent.mockResolvedValue({
        status: 'captured',
        amountCaptured: 100,
      });

      const result = await controller.capturePayment(mockReq, 'mission-1');

      expect(service.capturePaymentIntent).toHaveBeenCalledWith(
        'user-1',
        'mission-1',
      );
      expect(result.status).toBe('captured');
    });
  });

  describe('cancelPayment', () => {
    it('should cancel payment', async () => {
      service.cancelPaymentIntent.mockResolvedValue({ status: 'cancelled' });

      const result = await controller.cancelPayment(mockReq, 'mission-1');

      expect(service.cancelPaymentIntent).toHaveBeenCalledWith(
        'user-1',
        'mission-1',
      );
      expect(result.status).toBe('cancelled');
    });
  });

  describe('getPaymentStatus', () => {
    it('should return payment status', async () => {
      service.getPaymentStatus.mockResolvedValue({
        status: 'authorized',
        amount: 100,
      });

      const result = await controller.getPaymentStatus('mission-1');

      expect(service.getPaymentStatus).toHaveBeenCalledWith('mission-1');
      expect(result.status).toBe('authorized');
    });
  });
});
