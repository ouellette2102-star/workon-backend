import { Test, TestingModule } from '@nestjs/testing';
import { IdentityVerificationService } from './identity-verification.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';
import { IdVerificationStatus, TrustTier } from '@prisma/client';

describe('IdentityVerificationService', () => {
  let service: IdentityVerificationService;

  const mockPrismaService = {
    localUser: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockUser = {
    id: 'user-1',
    phone: '+15141234567',
    phoneVerified: false,
    phoneVerifiedAt: null,
    idVerificationStatus: IdVerificationStatus.NOT_STARTED,
    idVerifiedAt: null,
    idVerificationProvider: null,
    bankVerified: false,
    bankVerifiedAt: null,
    stripeAccountId: null,
    trustTier: TrustTier.BASIC,
    trustTierUpdatedAt: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IdentityVerificationService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<IdentityVerificationService>(IdentityVerificationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getVerificationStatus', () => {
    it('should return verification status for user', async () => {
      mockPrismaService.localUser.findUnique.mockResolvedValue(mockUser);

      const result = await service.getVerificationStatus('user-1');

      expect(result).toEqual({
        phone: { verified: false, verifiedAt: null },
        identity: {
          status: IdVerificationStatus.NOT_STARTED,
          verifiedAt: null,
          provider: null,
        },
        bank: { verified: false, verifiedAt: null, hasStripeAccount: false },
        trustTier: TrustTier.BASIC,
        trustTierUpdatedAt: null,
      });
    });

    it('should throw BadRequestException when user not found', async () => {
      mockPrismaService.localUser.findUnique.mockResolvedValue(null);

      await expect(service.getVerificationStatus('user-999')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('markPhoneVerified', () => {
    it('should mark phone as verified', async () => {
      mockPrismaService.localUser.findUnique
        .mockResolvedValueOnce({ phone: '+15141234567', phoneVerified: false })
        .mockResolvedValueOnce({ ...mockUser, phoneVerified: true, trustTier: TrustTier.BASIC });
      mockPrismaService.localUser.update.mockResolvedValue({});

      await service.markPhoneVerified('user-1');

      expect(mockPrismaService.localUser.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          phoneVerified: true,
          phoneVerifiedAt: expect.any(Date),
        },
      });
    });

    it('should skip if phone already verified', async () => {
      mockPrismaService.localUser.findUnique.mockResolvedValue({
        phone: '+15141234567',
        phoneVerified: true,
      });

      await service.markPhoneVerified('user-1');

      expect(mockPrismaService.localUser.update).not.toHaveBeenCalled();
    });

    it('should throw if user has no phone', async () => {
      mockPrismaService.localUser.findUnique.mockResolvedValue({
        phone: null,
        phoneVerified: false,
      });

      await expect(service.markPhoneVerified('user-1')).rejects.toThrow(
        'User has no phone number',
      );
    });

    it('should throw if user not found', async () => {
      mockPrismaService.localUser.findUnique.mockResolvedValue(null);

      await expect(service.markPhoneVerified('user-999')).rejects.toThrow(
        'User not found',
      );
    });
  });

  describe('updateIdVerificationStatus', () => {
    it('should update ID verification to VERIFIED', async () => {
      mockPrismaService.localUser.update.mockResolvedValue({});
      mockPrismaService.localUser.findUnique.mockResolvedValue({
        ...mockUser,
        idVerificationStatus: IdVerificationStatus.VERIFIED,
      });

      await service.updateIdVerificationStatus(
        'user-1',
        IdVerificationStatus.VERIFIED,
        'stripe',
        'ref-123',
      );

      expect(mockPrismaService.localUser.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          idVerificationStatus: IdVerificationStatus.VERIFIED,
          idVerifiedAt: expect.any(Date),
          idVerificationProvider: 'stripe',
          idVerificationRef: 'ref-123',
        },
      });
    });

    it('should update ID verification to PENDING without date', async () => {
      mockPrismaService.localUser.update.mockResolvedValue({});
      mockPrismaService.localUser.findUnique.mockResolvedValue(mockUser);

      await service.updateIdVerificationStatus('user-1', IdVerificationStatus.PENDING);

      expect(mockPrismaService.localUser.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          idVerificationStatus: IdVerificationStatus.PENDING,
        },
      });
    });
  });

  describe('markBankVerified', () => {
    it('should mark bank as verified with Stripe account ID', async () => {
      mockPrismaService.localUser.update.mockResolvedValue({});
      mockPrismaService.localUser.findUnique.mockResolvedValue({
        ...mockUser,
        bankVerified: true,
      });

      await service.markBankVerified('user-1', 'acct_123');

      expect(mockPrismaService.localUser.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          bankVerified: true,
          bankVerifiedAt: expect.any(Date),
          stripeAccountId: 'acct_123',
        },
      });
    });
  });

  describe('recomputeTrustTier', () => {
    it('should return BASIC when nothing verified', async () => {
      mockPrismaService.localUser.findUnique.mockResolvedValue({
        phoneVerified: false,
        idVerificationStatus: IdVerificationStatus.NOT_STARTED,
        bankVerified: false,
        trustTier: TrustTier.BASIC,
      });

      const result = await service.recomputeTrustTier('user-1');

      expect(result).toBe(TrustTier.BASIC);
    });

    it('should return VERIFIED when phone verified', async () => {
      mockPrismaService.localUser.findUnique.mockResolvedValue({
        phoneVerified: true,
        idVerificationStatus: IdVerificationStatus.NOT_STARTED,
        bankVerified: false,
        trustTier: TrustTier.BASIC,
      });
      mockPrismaService.localUser.update.mockResolvedValue({});

      const result = await service.recomputeTrustTier('user-1');

      expect(result).toBe(TrustTier.VERIFIED);
    });

    it('should return TRUSTED when phone + ID verified', async () => {
      mockPrismaService.localUser.findUnique.mockResolvedValue({
        phoneVerified: true,
        idVerificationStatus: IdVerificationStatus.VERIFIED,
        bankVerified: false,
        trustTier: TrustTier.BASIC,
      });
      mockPrismaService.localUser.update.mockResolvedValue({});

      const result = await service.recomputeTrustTier('user-1');

      expect(result).toBe(TrustTier.TRUSTED);
    });

    it('should return PREMIUM when all verified', async () => {
      mockPrismaService.localUser.findUnique.mockResolvedValue({
        phoneVerified: true,
        idVerificationStatus: IdVerificationStatus.VERIFIED,
        bankVerified: true,
        trustTier: TrustTier.BASIC,
      });
      mockPrismaService.localUser.update.mockResolvedValue({});

      const result = await service.recomputeTrustTier('user-1');

      expect(result).toBe(TrustTier.PREMIUM);
    });

    it('should not update if tier unchanged', async () => {
      mockPrismaService.localUser.findUnique.mockResolvedValue({
        phoneVerified: false,
        idVerificationStatus: IdVerificationStatus.NOT_STARTED,
        bankVerified: false,
        trustTier: TrustTier.BASIC,
      });

      await service.recomputeTrustTier('user-1');

      expect(mockPrismaService.localUser.update).not.toHaveBeenCalled();
    });

    it('should throw if user not found', async () => {
      mockPrismaService.localUser.findUnique.mockResolvedValue(null);

      await expect(service.recomputeTrustTier('user-999')).rejects.toThrow(
        'User not found',
      );
    });
  });

  describe('checkTrustTier', () => {
    it('should return true when user tier meets minimum', async () => {
      mockPrismaService.localUser.findUnique.mockResolvedValue({
        trustTier: TrustTier.TRUSTED,
      });

      const result = await service.checkTrustTier('user-1', TrustTier.VERIFIED);

      expect(result).toBe(true);
    });

    it('should return false when user tier below minimum', async () => {
      mockPrismaService.localUser.findUnique.mockResolvedValue({
        trustTier: TrustTier.BASIC,
      });

      const result = await service.checkTrustTier('user-1', TrustTier.TRUSTED);

      expect(result).toBe(false);
    });

    it('should return false when user not found', async () => {
      mockPrismaService.localUser.findUnique.mockResolvedValue(null);

      const result = await service.checkTrustTier('user-999', TrustTier.BASIC);

      expect(result).toBe(false);
    });
  });

  describe('getRequirementsForTier', () => {
    it('should return requirements for BASIC tier', () => {
      const result = service.getRequirementsForTier(TrustTier.BASIC);
      expect(result).toEqual(['Email verified']);
    });

    it('should return requirements for VERIFIED tier', () => {
      const result = service.getRequirementsForTier(TrustTier.VERIFIED);
      expect(result).toEqual(['Email verified', 'Phone verified']);
    });

    it('should return requirements for TRUSTED tier', () => {
      const result = service.getRequirementsForTier(TrustTier.TRUSTED);
      expect(result).toEqual(['Email verified', 'Phone verified', 'ID verified']);
    });

    it('should return requirements for PREMIUM tier', () => {
      const result = service.getRequirementsForTier(TrustTier.PREMIUM);
      expect(result).toEqual([
        'Email verified',
        'Phone verified',
        'ID verified',
        'Bank verified',
      ]);
    });
  });

  describe('getMissingVerifications', () => {
    it('should return empty for BASIC tier', async () => {
      mockPrismaService.localUser.findUnique.mockResolvedValue(mockUser);

      const result = await service.getMissingVerifications('user-1', TrustTier.BASIC);

      expect(result).toEqual([]);
    });

    it('should return phone verification for VERIFIED tier', async () => {
      mockPrismaService.localUser.findUnique.mockResolvedValue(mockUser);

      const result = await service.getMissingVerifications('user-1', TrustTier.VERIFIED);

      expect(result).toEqual(['Phone verification']);
    });

    it('should return all missing for PREMIUM tier', async () => {
      mockPrismaService.localUser.findUnique.mockResolvedValue(mockUser);

      const result = await service.getMissingVerifications('user-1', TrustTier.PREMIUM);

      expect(result).toEqual([
        'Phone verification',
        'ID verification',
        'Bank verification',
      ]);
    });

    it('should return only missing verifications', async () => {
      mockPrismaService.localUser.findUnique.mockResolvedValue({
        ...mockUser,
        phoneVerified: true,
        phoneVerifiedAt: new Date(),
        idVerificationStatus: IdVerificationStatus.VERIFIED,
        idVerifiedAt: new Date(),
      });

      const result = await service.getMissingVerifications('user-1', TrustTier.PREMIUM);

      expect(result).toEqual(['Bank verification']);
    });
  });
});
