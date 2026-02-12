import { Test, TestingModule } from '@nestjs/testing';
import { CheckoutController } from './checkout.controller';
import { InvoiceService } from './invoice.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ConsentGuard } from '../compliance/guards/consent.guard';

describe('CheckoutController', () => {
  let controller: CheckoutController;
  let service: any;

  const mockCheckoutResponse: any = {
    checkoutUrl: 'https://checkout.stripe.com/session/123',
    invoiceId: 'inv-1',
    sessionId: 'cs_test_123',
    expiresAt: new Date(Date.now() + 1800000),
  };

  const mockInvoice: any = {
    id: 'inv-1',
    missionId: 'mission-1',
    userId: 'user-1',
    subtotal: 100,
    platformFee: 12,
    total: 112,
    status: 'PENDING',
    createdAt: new Date(),
  };

  const mockReq = { user: { sub: 'user-1', role: 'employer' } };

  beforeEach(async () => {
    const mockService = {
      createCheckoutSession: jest.fn(),
      getInvoice: jest.fn(),
      calculateInvoice: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CheckoutController],
      providers: [{ provide: InvoiceService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(ConsentGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CheckoutController>(CheckoutController);
    service = module.get(InvoiceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createCheckout', () => {
    it('should create checkout session', async () => {
      const dto = { missionId: 'mission-1' };
      service.createCheckoutSession.mockResolvedValue({
        invoiceId: 'inv-1',
        checkoutUrl: 'https://checkout.stripe.com/session/123',
        sessionId: 'cs_test_123',
      });

      const result = await controller.createCheckout(mockReq, dto as any);

      expect(service.createCheckoutSession).toHaveBeenCalledWith(
        'mission-1',
        'user-1',
      );
      expect(result.checkoutUrl).toBeDefined();
    });
  });

  describe('getInvoice', () => {
    it('should return invoice by id', async () => {
      service.getInvoice.mockResolvedValue(mockInvoice);

      const result = await controller.getInvoice(mockReq, 'inv-1');

      expect(service.getInvoice).toHaveBeenCalledWith('inv-1', 'user-1');
      expect(result).toBeDefined();
    });
  });

  describe('previewInvoice', () => {
    it('should return invoice preview', async () => {
      service.calculateInvoice.mockReturnValue({
        subtotalCents: 10000,
        platformFeeCents: 1200,
        taxesCents: 0,
        totalCents: 11200,
        currency: 'CAD',
      });

      const result = controller.previewInvoice('10000');

      expect(service.calculateInvoice).toHaveBeenCalledWith(10000, 'Preview');
      expect(result.total).toBe(112);
    });
  });
});
