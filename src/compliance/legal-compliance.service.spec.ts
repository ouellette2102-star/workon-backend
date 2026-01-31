import { Test, TestingModule } from '@nestjs/testing';
import { LegalComplianceService } from './legal-compliance.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ComplianceDocumentType, ConsentType } from '@prisma/client';

describe('LegalComplianceService', () => {
  let service: LegalComplianceService;

  const mockPrismaService = {
    termsVersion: {
      findFirst: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    complianceDocument: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    userConsent: {
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
    localUser: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LegalComplianceService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<LegalComplianceService>(LegalComplianceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getCurrentTermsVersion', () => {
    it('should return current active terms', async () => {
      const mockTerms = {
        id: 'terms-1',
        type: ComplianceDocumentType.TERMS,
        version: '1.0',
        isActive: true,
      };
      mockPrismaService.termsVersion.findFirst.mockResolvedValue(mockTerms);

      const result = await service.getCurrentTermsVersion(ComplianceDocumentType.TERMS);

      expect(result).toEqual(mockTerms);
    });

    it('should return null when no terms exist', async () => {
      mockPrismaService.termsVersion.findFirst.mockResolvedValue(null);

      const result = await service.getCurrentTermsVersion(ComplianceDocumentType.PRIVACY);

      expect(result).toBeNull();
    });
  });

  describe('createTermsVersion', () => {
    const createData = {
      type: ComplianceDocumentType.TERMS,
      version: '2.0',
      title: 'Terms of Service v2',
      contentUrl: 'https://example.com/terms-v2',
      effectiveAt: new Date(),
      activateNow: true,
    };

    it('should create new terms version and deactivate old ones when activateNow is true', async () => {
      mockPrismaService.termsVersion.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.termsVersion.create.mockResolvedValue({
        id: 'terms-2',
        ...createData,
        isActive: true,
      });

      const result = await service.createTermsVersion(createData);

      expect(mockPrismaService.termsVersion.updateMany).toHaveBeenCalled();
      expect(result.isActive).toBe(true);
    });

    it('should create terms without activating when activateNow is false', async () => {
      const dataWithoutActivate = { ...createData, activateNow: false };
      mockPrismaService.termsVersion.create.mockResolvedValue({
        id: 'terms-2',
        ...dataWithoutActivate,
        isActive: false,
      });

      const result = await service.createTermsVersion(dataWithoutActivate);

      expect(mockPrismaService.termsVersion.updateMany).not.toHaveBeenCalled();
      expect(result.isActive).toBe(false);
    });
  });

  describe('hasAcceptedCurrentTerms', () => {
    it('should return true when user has accepted current terms', async () => {
      mockPrismaService.termsVersion.findFirst.mockResolvedValue({
        version: '1.0',
      });
      mockPrismaService.complianceDocument.findFirst.mockResolvedValue({
        id: 'doc-1',
      });

      const result = await service.hasAcceptedCurrentTerms(
        'user-1',
        ComplianceDocumentType.TERMS,
      );

      expect(result).toBe(true);
    });

    it('should return false when user has not accepted current terms', async () => {
      mockPrismaService.termsVersion.findFirst.mockResolvedValue({
        version: '1.0',
      });
      mockPrismaService.complianceDocument.findFirst.mockResolvedValue(null);

      const result = await service.hasAcceptedCurrentTerms(
        'user-1',
        ComplianceDocumentType.TERMS,
      );

      expect(result).toBe(false);
    });

    it('should return true when no terms defined', async () => {
      mockPrismaService.termsVersion.findFirst.mockResolvedValue(null);

      const result = await service.hasAcceptedCurrentTerms(
        'user-1',
        ComplianceDocumentType.TERMS,
      );

      expect(result).toBe(true);
    });
  });

  describe('recordTermsAcceptance', () => {
    it('should record new acceptance', async () => {
      mockPrismaService.termsVersion.findFirst.mockResolvedValue({ version: '1.0' });
      mockPrismaService.complianceDocument.findFirst.mockResolvedValue(null);
      mockPrismaService.complianceDocument.create.mockResolvedValue({
        id: 'doc-1',
        userId: 'user-1',
        version: '1.0',
      });

      const result = await service.recordTermsAcceptance(
        'user-1',
        ComplianceDocumentType.TERMS,
        '1.0',
      );

      expect(result.userId).toBe('user-1');
    });

    it('should return existing acceptance if already accepted', async () => {
      mockPrismaService.termsVersion.findFirst.mockResolvedValue({ version: '1.0' });
      const existingDoc = { id: 'existing-doc', userId: 'user-1', version: '1.0' };
      mockPrismaService.complianceDocument.findFirst.mockResolvedValue(existingDoc);

      const result = await service.recordTermsAcceptance(
        'user-1',
        ComplianceDocumentType.TERMS,
        '1.0',
      );

      expect(result).toEqual(existingDoc);
      expect(mockPrismaService.complianceDocument.create).not.toHaveBeenCalled();
    });

    it('should throw if terms version not found', async () => {
      mockPrismaService.termsVersion.findFirst.mockResolvedValue(null);

      await expect(
        service.recordTermsAcceptance(
          'user-1',
          ComplianceDocumentType.TERMS,
          '999.0',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getUserConsents', () => {
    it('should return all consents as a map', async () => {
      mockPrismaService.userConsent.findMany.mockResolvedValue([
        { consentType: ConsentType.MARKETING_EMAIL, granted: true, grantedAt: new Date() },
        { consentType: ConsentType.ANALYTICS, granted: false, revokedAt: new Date() },
      ]);

      const result = await service.getUserConsents('user-1');

      expect(result[ConsentType.MARKETING_EMAIL].granted).toBe(true);
      expect(result[ConsentType.ANALYTICS].granted).toBe(false);
      expect(result[ConsentType.PERSONALIZATION].granted).toBe(false); // Default
    });
  });

  describe('updateConsent', () => {
    it('should upsert consent', async () => {
      const mockConsent = {
        userId: 'user-1',
        consentType: ConsentType.MARKETING_EMAIL,
        granted: true,
      };
      mockPrismaService.userConsent.upsert.mockResolvedValue(mockConsent);

      const result = await service.updateConsent('user-1', ConsentType.MARKETING_EMAIL, true);

      expect(result).toEqual(mockConsent);
    });
  });

  describe('requestDataExport', () => {
    it('should request data export', async () => {
      mockPrismaService.localUser.findUnique.mockResolvedValue({
        id: 'user-1',
        dataExportRequestedAt: null,
        dataExportCompletedAt: null,
      });
      mockPrismaService.localUser.update.mockResolvedValue({});

      const result = await service.requestDataExport('user-1');

      expect(result.requestedAt).toBeInstanceOf(Date);
      expect(result.estimatedCompletion).toBeInstanceOf(Date);
    });

    it('should throw if user not found', async () => {
      mockPrismaService.localUser.findUnique.mockResolvedValue(null);

      await expect(service.requestDataExport('user-999')).rejects.toThrow(NotFoundException);
    });

    it('should throw if export already pending', async () => {
      mockPrismaService.localUser.findUnique.mockResolvedValue({
        id: 'user-1',
        dataExportRequestedAt: new Date(),
        dataExportCompletedAt: null,
      });

      await expect(service.requestDataExport('user-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('requestAccountDeletion', () => {
    it('should request account deletion with grace period', async () => {
      mockPrismaService.localUser.findUnique.mockResolvedValue({
        id: 'user-1',
        deletionRequestedAt: null,
      });
      mockPrismaService.localUser.update.mockResolvedValue({});

      const result = await service.requestAccountDeletion('user-1');

      expect(result.scheduledFor).toBeInstanceOf(Date);
      // Should be 30 days from now
      const daysDiff = Math.round(
        (result.scheduledFor.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      );
      expect(daysDiff).toBe(30);
    });

    it('should throw if deletion already requested', async () => {
      mockPrismaService.localUser.findUnique.mockResolvedValue({
        id: 'user-1',
        deletionRequestedAt: new Date(),
        deletionScheduledFor: new Date(),
      });

      await expect(service.requestAccountDeletion('user-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancelAccountDeletion', () => {
    it('should cancel deletion request', async () => {
      mockPrismaService.localUser.findUnique.mockResolvedValue({
        id: 'user-1',
        deletionRequestedAt: new Date(),
        deletedAt: null,
      });
      mockPrismaService.localUser.update.mockResolvedValue({});

      await expect(service.cancelAccountDeletion('user-1')).resolves.not.toThrow();
    });

    it('should throw if no deletion request exists', async () => {
      mockPrismaService.localUser.findUnique.mockResolvedValue({
        id: 'user-1',
        deletionRequestedAt: null,
      });

      await expect(service.cancelAccountDeletion('user-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw if account already deleted', async () => {
      mockPrismaService.localUser.findUnique.mockResolvedValue({
        id: 'user-1',
        deletionRequestedAt: new Date(),
        deletedAt: new Date(),
      });

      await expect(service.cancelAccountDeletion('user-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('getUsersScheduledForDeletion', () => {
    it('should return users scheduled for deletion', async () => {
      const scheduledFor = new Date();
      mockPrismaService.localUser.findMany.mockResolvedValue([
        { id: 'user-1', email: 'test@example.com', deletionScheduledFor: scheduledFor },
      ]);

      const result = await service.getUsersScheduledForDeletion();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('user-1');
      expect(result[0].scheduledFor).toEqual(scheduledFor);
    });
  });

  describe('recordLocalUserTermsAcceptance', () => {
    it('should record terms acceptance for local user', async () => {
      mockPrismaService.localUser.update.mockResolvedValue({});

      await service.recordLocalUserTermsAcceptance('user-1', '1.0', '1.0');

      expect(mockPrismaService.localUser.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: expect.objectContaining({
          termsVersion: '1.0',
          privacyVersion: '1.0',
        }),
      });
    });
  });

  describe('updateLocalUserMarketingConsent', () => {
    it('should update marketing consent', async () => {
      mockPrismaService.localUser.update.mockResolvedValue({});

      await service.updateLocalUserMarketingConsent('user-1', true);

      expect(mockPrismaService.localUser.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          marketingConsent: true,
          marketingConsentAt: expect.any(Date),
        },
      });
    });
  });
});
