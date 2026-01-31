import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsLocalController } from './payments-local.controller';
import { PaymentsLocalService } from './payments-local.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

describe('PaymentsLocalController', () => {
  let controller: PaymentsLocalController;
  let service: any;

  const mockPaymentIntent: any = {
    clientSecret: 'pi_test_secret_123',
    paymentIntentId: 'pi_test_123',
    amount: 100,
    currency: 'CAD',
    status: 'requires_payment_method',
  };

  const mockReq = { user: { sub: 'user-1', role: 'employer' } };

  beforeEach(async () => {
    const mockService = {
      createPaymentIntent: jest.fn(),
      handleWebhook: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsLocalController],
      providers: [{ provide: PaymentsLocalService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PaymentsLocalController>(PaymentsLocalController);
    service = module.get(PaymentsLocalService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createPaymentIntent', () => {
    it('should create a payment intent', async () => {
      const dto = { missionId: 'mission-1' };
      service.createPaymentIntent.mockResolvedValue(mockPaymentIntent);

      const result = await controller.createPaymentIntent(dto as any, mockReq);

      expect(service.createPaymentIntent).toHaveBeenCalledWith(
        'mission-1',
        'user-1',
        'employer',
      );
      expect(result).toBeDefined();
    });
  });

  describe('handleWebhook', () => {
    it('should handle webhook with valid signature', async () => {
      const mockWebhookReq: any = {
        rawBody: Buffer.from('{}'),
      };
      service.handleWebhook.mockResolvedValue({ received: true });

      const result = await controller.handleWebhook(mockWebhookReq, 'stripe-sig');

      expect(service.handleWebhook).toHaveBeenCalledWith(
        mockWebhookReq.rawBody,
        'stripe-sig',
      );
      expect(result).toEqual({ received: true });
    });

    it('should throw if raw body not available', async () => {
      const mockWebhookReq: any = { rawBody: null };

      await expect(
        controller.handleWebhook(mockWebhookReq, 'stripe-sig'),
      ).rejects.toThrow('Raw body not available');
    });
  });
});
