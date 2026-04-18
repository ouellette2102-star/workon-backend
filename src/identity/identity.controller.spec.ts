import { Test, TestingModule } from '@nestjs/testing';
import { IdentityController } from './identity.controller';
import { IdentityVerificationService } from './identity-verification.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IdVerificationStatus, TrustTier } from '@prisma/client';

describe('IdentityController', () => {
  let controller: IdentityController;
  let service: jest.Mocked<IdentityVerificationService>;

  beforeEach(async () => {
    const mockService = {
      getVerificationStatus: jest.fn(),
      startPhoneVerification: jest.fn(),
      confirmPhoneOtp: jest.fn(),
      startIdVerification: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [IdentityController],
      providers: [{ provide: IdentityVerificationService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(IdentityController);
    service = module.get(IdentityVerificationService);
  });

  const req = { user: { sub: 'user-1' } };

  it('GET /status delegates to service', async () => {
    service.getVerificationStatus.mockResolvedValue({
      phone: { verified: false, verifiedAt: null },
      identity: { status: IdVerificationStatus.NOT_STARTED, verifiedAt: null, provider: null },
      bank: { verified: false, verifiedAt: null, hasStripeAccount: false },
      trustTier: TrustTier.BASIC,
      trustTierUpdatedAt: null,
    } as any);

    const result = await controller.getStatus(req);
    expect(service.getVerificationStatus).toHaveBeenCalledWith('user-1');
    expect(result.trustTier).toBe(TrustTier.BASIC);
  });

  it('POST /verify/phone delegates to service', async () => {
    service.startPhoneVerification.mockResolvedValue({
      sent: true,
      expiresInSeconds: 600,
      devOtp: '123456',
    });

    const result = await controller.startPhone(req);
    expect(service.startPhoneVerification).toHaveBeenCalledWith('user-1');
    expect(result.sent).toBe(true);
  });

  it('POST /verify/phone/confirm delegates with code', async () => {
    service.confirmPhoneOtp.mockResolvedValue({
      verified: true,
      trustTier: TrustTier.VERIFIED,
    });

    const result = await controller.confirmPhone(req, { code: '123456' });
    expect(service.confirmPhoneOtp).toHaveBeenCalledWith('user-1', '123456');
    expect(result.verified).toBe(true);
    expect(result.trustTier).toBe(TrustTier.VERIFIED);
  });

  it('POST /verify/id/start delegates to service', async () => {
    service.startIdVerification.mockResolvedValue({
      status: IdVerificationStatus.PENDING,
      provider: null,
      sessionUrl: null,
      message: 'Vérification en attente.',
    });

    const result = await controller.startId(req);
    expect(service.startIdVerification).toHaveBeenCalledWith('user-1');
    expect(result.status).toBe(IdVerificationStatus.PENDING);
  });
});
