import { Test, TestingModule } from '@nestjs/testing';
import { StripeController } from './stripe.controller';
import { StripeService } from './stripe.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PaymentStatus } from '@prisma/client';

const mockStripeService = {
  createConnectOnboardingLink: jest.fn(),
  checkOnboardingStatus: jest.fn(),
  createPaymentIntent: jest.fn(),
  getWorkerPayments: jest.fn(),
  handleWebhook: jest.fn(),
};

describe('StripeController', () => {
  let controller: StripeController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StripeController],
      providers: [
        { provide: StripeService, useValue: mockStripeService },
        { provide: JwtService, useValue: { sign: jest.fn(), verify: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<StripeController>(StripeController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createOnboardingLink', () => {
    it('should return onboarding URL', async () => {
      const mockReq = { user: { sub: 'worker-1' } };
      const expectedUrl = 'https://connect.stripe.com/setup/...';

      mockStripeService.createConnectOnboardingLink.mockResolvedValue(expectedUrl);

      const result = await controller.createOnboardingLink(mockReq);

      expect(result.url).toBe(expectedUrl);
      expect(mockStripeService.createConnectOnboardingLink).toHaveBeenCalledWith(
        'worker-1',
      );
    });

    it('should use userId if available over sub', async () => {
      const mockReq = { user: { userId: 'worker-1', sub: 'clerk-id' } };

      mockStripeService.createConnectOnboardingLink.mockResolvedValue('url');

      await controller.createOnboardingLink(mockReq);

      expect(mockStripeService.createConnectOnboardingLink).toHaveBeenCalledWith(
        'worker-1',
      );
    });
  });

  describe('getOnboardingStatus', () => {
    it('should return onboarding status', async () => {
      const mockReq = { user: { sub: 'worker-1' } };
      const expectedStatus = {
        onboarded: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        requirementsNeeded: [],
      };

      mockStripeService.checkOnboardingStatus.mockResolvedValue(expectedStatus);

      const result = await controller.getOnboardingStatus(mockReq);

      expect(result).toEqual(expectedStatus);
      expect(mockStripeService.checkOnboardingStatus).toHaveBeenCalledWith(
        'worker-1',
      );
    });
  });

  describe('createPaymentIntent', () => {
    it('should create payment intent', async () => {
      const mockReq = { user: { sub: 'employer-1' } };
      const dto = { missionId: 'mission-1', amount: 100 };
      const expectedResult = {
        clientSecret: 'pi_test_secret',
        paymentIntentId: 'pi_test_123',
      };

      mockStripeService.createPaymentIntent.mockResolvedValue(expectedResult);

      const result = await controller.createPaymentIntent(mockReq, dto);

      expect(result).toEqual(expectedResult);
      expect(mockStripeService.createPaymentIntent).toHaveBeenCalledWith(
        'employer-1',
        'mission-1',
        100,
      );
    });
  });

  describe('getWorkerPayments', () => {
    it('should return worker payment history', async () => {
      const mockReq = { user: { sub: 'worker-1' } };
      const expectedPayments = [
        {
          id: 'pay-1',
          missionId: 'mission-1',
          amount: 100,
          status: PaymentStatus.SUCCEEDED,
        },
      ];

      mockStripeService.getWorkerPayments.mockResolvedValue(expectedPayments);

      const result = await controller.getWorkerPayments(mockReq);

      expect(result).toEqual(expectedPayments);
      expect(mockStripeService.getWorkerPayments).toHaveBeenCalledWith('worker-1');
    });
  });

  describe('handleWebhook', () => {
    it('should process webhook and return received', async () => {
      const mockReq = {
        rawBody: Buffer.from('webhook_payload'),
      };
      const signature = 'stripe_signature';

      mockStripeService.handleWebhook.mockResolvedValue({
        type: 'payment_intent.succeeded',
      });

      const result = await controller.handleWebhook(mockReq as any, signature);

      expect(result).toEqual({ received: true });
      expect(mockStripeService.handleWebhook).toHaveBeenCalledWith(
        mockReq.rawBody,
        signature,
      );
    });

    it('should throw if rawBody is missing', async () => {
      const mockReq = { rawBody: undefined };

      await expect(
        controller.handleWebhook(mockReq as any, 'sig'),
      ).rejects.toThrow('Raw body manquant');
    });
  });
});

