import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ComplianceService } from './compliance.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLoggerService } from '../common/audit/audit-logger.service';
import { ACTIVE_LEGAL_VERSIONS } from './compliance.constants';
import { ComplianceDocumentType } from '@prisma/client';

/**
 * Unit Tests for ComplianceService
 * PR-T1: Critical compliance logic validation
 *
 * Test coverage:
 * 1. acceptDocument() - version validation, idempotency, record creation
 * 2. getConsentStatus() - status calculation, missing documents
 * 3. hasValidConsent() - boolean consent check
 * 4. requireValidConsent() - fail-closed enforcement
 * 5. Edge cases - missing userId, invalid version, unknown state
 */
describe('ComplianceService', () => {
  let service: ComplianceService;
  let prisma: jest.Mocked<PrismaService>;

  // Mock consent record
  const mockConsentRecord = {
    id: 'consent_terms_user123_1234567890',
    userId: 'user123',
    type: 'TERMS' as ComplianceDocumentType,
    version: ACTIVE_LEGAL_VERSIONS.TERMS,
    acceptedAt: new Date('2026-01-15T12:00:00.000Z'),
    createdAt: new Date('2026-01-15T12:00:00.000Z'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComplianceService,
        {
          provide: PrismaService,
          useValue: {
            complianceDocument: {
              findFirst: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
            },
          },
        },
        {
          provide: AuditLoggerService,
          useValue: {
            logBusinessEvent: jest.fn(),
            logBusinessError: jest.fn(),
            logBusinessWarning: jest.fn(),
            maskId: jest.fn((id) => id?.substring(0, 8) + '...'),
          },
        },
      ],
    }).compile();

    service = module.get<ComplianceService>(ComplianceService);
    prisma = module.get(PrismaService);
  });

  // ═══════════════════════════════════════════════════════════════
  // acceptDocument() Tests
  // ═══════════════════════════════════════════════════════════════
  describe('acceptDocument', () => {
    it('should create consent record with valid version', async () => {
      (prisma.complianceDocument.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.complianceDocument.create as jest.Mock).mockResolvedValue(mockConsentRecord);

      const result = await service.acceptDocument(
        'user123',
        { documentType: 'TERMS', version: ACTIVE_LEGAL_VERSIONS.TERMS },
        '192.168.1.1',
        'Mozilla/5.0',
      );

      expect(result.accepted).toBe(true);
      expect(result.documentType).toBe('TERMS');
      expect(result.version).toBe(ACTIVE_LEGAL_VERSIONS.TERMS);
      expect(result.alreadyAccepted).toBe(false);
      expect(prisma.complianceDocument.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user123',
          type: 'TERMS',
          version: ACTIVE_LEGAL_VERSIONS.TERMS,
        }),
      });
    });

    it('should throw BadRequestException for invalid version', async () => {
      await expect(
        service.acceptDocument(
          'user123',
          { documentType: 'TERMS', version: '0.0' },
          null,
          null,
        ),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.complianceDocument.findFirst).not.toHaveBeenCalled();
      expect(prisma.complianceDocument.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException with VERSION_MISMATCH error code', async () => {
      try {
        await service.acceptDocument(
          'user123',
          { documentType: 'TERMS', version: '999.0' },
          null,
          null,
        );
        fail('Expected BadRequestException');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        const response = (error as BadRequestException).getResponse();
        expect(response).toMatchObject({
          error: 'VERSION_MISMATCH',
          activeVersion: ACTIVE_LEGAL_VERSIONS.TERMS,
          providedVersion: '999.0',
        });
      }
    });

    it('should be idempotent - return success for already accepted', async () => {
      (prisma.complianceDocument.findFirst as jest.Mock).mockResolvedValue(mockConsentRecord);

      const result = await service.acceptDocument(
        'user123',
        { documentType: 'TERMS', version: ACTIVE_LEGAL_VERSIONS.TERMS },
        null,
        null,
      );

      expect(result.accepted).toBe(true);
      expect(result.alreadyAccepted).toBe(true);
      expect(result.acceptedAt).toBe(mockConsentRecord.acceptedAt.toISOString());
      expect(prisma.complianceDocument.create).not.toHaveBeenCalled();
    });

    it('should accept PRIVACY document type', async () => {
      const privacyRecord = {
        ...mockConsentRecord,
        id: 'consent_privacy_user123_1234567890',
        type: 'PRIVACY' as ComplianceDocumentType,
        version: ACTIVE_LEGAL_VERSIONS.PRIVACY,
      };
      (prisma.complianceDocument.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.complianceDocument.create as jest.Mock).mockResolvedValue(privacyRecord);

      const result = await service.acceptDocument(
        'user123',
        { documentType: 'PRIVACY', version: ACTIVE_LEGAL_VERSIONS.PRIVACY },
        null,
        null,
      );

      expect(result.accepted).toBe(true);
      expect(result.documentType).toBe('PRIVACY');
    });

    it('should work with null IP and userAgent', async () => {
      (prisma.complianceDocument.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.complianceDocument.create as jest.Mock).mockResolvedValue(mockConsentRecord);

      const result = await service.acceptDocument(
        'user123',
        { documentType: 'TERMS', version: ACTIVE_LEGAL_VERSIONS.TERMS },
        null,
        null,
      );

      expect(result.accepted).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getConsentStatus() Tests
  // ═══════════════════════════════════════════════════════════════
  describe('getConsentStatus', () => {
    it('should return isComplete=true when all documents accepted', async () => {
      const consents = [
        { ...mockConsentRecord, type: 'TERMS', version: ACTIVE_LEGAL_VERSIONS.TERMS },
        { ...mockConsentRecord, type: 'PRIVACY', version: ACTIVE_LEGAL_VERSIONS.PRIVACY },
      ];
      (prisma.complianceDocument.findMany as jest.Mock).mockResolvedValue(consents);

      const result = await service.getConsentStatus('user123');

      expect(result.isComplete).toBe(true);
      expect(result.missing).toEqual([]);
      expect(result.documents.TERMS.accepted).toBe(true);
      expect(result.documents.PRIVACY.accepted).toBe(true);
    });

    it('should return isComplete=false when TERMS missing', async () => {
      const consents = [
        { ...mockConsentRecord, type: 'PRIVACY', version: ACTIVE_LEGAL_VERSIONS.PRIVACY },
      ];
      (prisma.complianceDocument.findMany as jest.Mock).mockResolvedValue(consents);

      const result = await service.getConsentStatus('user123');

      expect(result.isComplete).toBe(false);
      expect(result.missing).toContain('TERMS');
      expect(result.documents.TERMS.accepted).toBe(false);
      expect(result.documents.PRIVACY.accepted).toBe(true);
    });

    it('should return isComplete=false when PRIVACY missing', async () => {
      const consents = [
        { ...mockConsentRecord, type: 'TERMS', version: ACTIVE_LEGAL_VERSIONS.TERMS },
      ];
      (prisma.complianceDocument.findMany as jest.Mock).mockResolvedValue(consents);

      const result = await service.getConsentStatus('user123');

      expect(result.isComplete).toBe(false);
      expect(result.missing).toContain('PRIVACY');
    });

    it('should return isComplete=false when both missing (no consents)', async () => {
      (prisma.complianceDocument.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getConsentStatus('user123');

      expect(result.isComplete).toBe(false);
      expect(result.missing).toEqual(['TERMS', 'PRIVACY']);
      expect(result.documents.TERMS.accepted).toBe(false);
      expect(result.documents.PRIVACY.accepted).toBe(false);
    });

    it('should treat outdated version as NOT accepted (fail-closed)', async () => {
      const consents = [
        { ...mockConsentRecord, type: 'TERMS', version: '0.9' }, // Old version
        { ...mockConsentRecord, type: 'PRIVACY', version: ACTIVE_LEGAL_VERSIONS.PRIVACY },
      ];
      (prisma.complianceDocument.findMany as jest.Mock).mockResolvedValue(consents);

      const result = await service.getConsentStatus('user123');

      expect(result.isComplete).toBe(false);
      expect(result.missing).toContain('TERMS');
      expect(result.documents.TERMS.accepted).toBe(false);
      expect(result.documents.TERMS.activeVersion).toBe(ACTIVE_LEGAL_VERSIONS.TERMS);
    });

    it('should include activeVersion in response', async () => {
      (prisma.complianceDocument.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getConsentStatus('user123');

      expect(result.documents.TERMS.activeVersion).toBe(ACTIVE_LEGAL_VERSIONS.TERMS);
      expect(result.documents.PRIVACY.activeVersion).toBe(ACTIVE_LEGAL_VERSIONS.PRIVACY);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // hasValidConsent() Tests
  // ═══════════════════════════════════════════════════════════════
  describe('hasValidConsent', () => {
    it('should return true when all consents valid', async () => {
      const consents = [
        { ...mockConsentRecord, type: 'TERMS', version: ACTIVE_LEGAL_VERSIONS.TERMS },
        { ...mockConsentRecord, type: 'PRIVACY', version: ACTIVE_LEGAL_VERSIONS.PRIVACY },
      ];
      (prisma.complianceDocument.findMany as jest.Mock).mockResolvedValue(consents);

      const result = await service.hasValidConsent('user123');

      expect(result).toBe(true);
    });

    it('should return false when consent missing', async () => {
      (prisma.complianceDocument.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.hasValidConsent('user123');

      expect(result).toBe(false);
    });

    it('should return false when version outdated', async () => {
      const consents = [
        { ...mockConsentRecord, type: 'TERMS', version: '0.1' },
        { ...mockConsentRecord, type: 'PRIVACY', version: '0.1' },
      ];
      (prisma.complianceDocument.findMany as jest.Mock).mockResolvedValue(consents);

      const result = await service.hasValidConsent('user123');

      expect(result).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // requireValidConsent() Tests - FAIL-CLOSED
  // ═══════════════════════════════════════════════════════════════
  describe('requireValidConsent', () => {
    it('should not throw when consent is complete', async () => {
      const consents = [
        { ...mockConsentRecord, type: 'TERMS', version: ACTIVE_LEGAL_VERSIONS.TERMS },
        { ...mockConsentRecord, type: 'PRIVACY', version: ACTIVE_LEGAL_VERSIONS.PRIVACY },
      ];
      (prisma.complianceDocument.findMany as jest.Mock).mockResolvedValue(consents);

      await expect(service.requireValidConsent('user123')).resolves.toBeUndefined();
    });

    it('should throw ForbiddenException when consent missing', async () => {
      (prisma.complianceDocument.findMany as jest.Mock).mockResolvedValue([]);

      await expect(service.requireValidConsent('user123')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw with CONSENT_REQUIRED error code', async () => {
      (prisma.complianceDocument.findMany as jest.Mock).mockResolvedValue([]);

      try {
        await service.requireValidConsent('user123');
        fail('Expected ForbiddenException');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        const response = (error as ForbiddenException).getResponse();
        expect(response).toMatchObject({
          error: 'CONSENT_REQUIRED',
          missing: expect.arrayContaining(['TERMS', 'PRIVACY']),
          activeVersions: ACTIVE_LEGAL_VERSIONS,
        });
      }
    });

    it('should throw when only partial consent (TERMS only)', async () => {
      const consents = [
        { ...mockConsentRecord, type: 'TERMS', version: ACTIVE_LEGAL_VERSIONS.TERMS },
      ];
      (prisma.complianceDocument.findMany as jest.Mock).mockResolvedValue(consents);

      await expect(service.requireValidConsent('user123')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw when only partial consent (PRIVACY only)', async () => {
      const consents = [
        { ...mockConsentRecord, type: 'PRIVACY', version: ACTIVE_LEGAL_VERSIONS.PRIVACY },
      ];
      (prisma.complianceDocument.findMany as jest.Mock).mockResolvedValue(consents);

      await expect(service.requireValidConsent('user123')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw when version is outdated (fail-closed)', async () => {
      const consents = [
        { ...mockConsentRecord, type: 'TERMS', version: '0.5' },
        { ...mockConsentRecord, type: 'PRIVACY', version: '0.5' },
      ];
      (prisma.complianceDocument.findMany as jest.Mock).mockResolvedValue(consents);

      await expect(service.requireValidConsent('user123')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getActiveVersions() Tests
  // ═══════════════════════════════════════════════════════════════
  describe('getActiveVersions', () => {
    it('should return active versions', () => {
      const result = service.getActiveVersions();

      expect(result.versions).toEqual(ACTIVE_LEGAL_VERSIONS);
      expect(result.updatedAt).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Edge Cases - Fail-Closed Assumptions
  // ═══════════════════════════════════════════════════════════════
  describe('Edge Cases - Fail-Closed', () => {
    it('should treat empty userId as having no consent', async () => {
      (prisma.complianceDocument.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getConsentStatus('');

      expect(result.isComplete).toBe(false);
      expect(result.missing).toHaveLength(2);
    });

    it('should handle database returning empty array gracefully', async () => {
      (prisma.complianceDocument.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.hasValidConsent('user123');

      expect(result).toBe(false);
    });

    it('should handle consent with null acceptedAt date', async () => {
      const consentWithNullDate = {
        ...mockConsentRecord,
        acceptedAt: null,
      };
      (prisma.complianceDocument.findMany as jest.Mock).mockResolvedValue([
        consentWithNullDate,
      ]);

      const result = await service.getConsentStatus('user123');

      // Should still work, treating as accepted if version matches
      expect(result.documents.TERMS.acceptedAt).toBeNull();
    });

    it('should select most recent consent when multiple exist', async () => {
      const oldConsent = {
        ...mockConsentRecord,
        acceptedAt: new Date('2025-01-01T00:00:00.000Z'),
      };
      const newConsent = {
        ...mockConsentRecord,
        acceptedAt: new Date('2026-01-15T12:00:00.000Z'),
      };
      // Prisma returns ordered by acceptedAt desc
      (prisma.complianceDocument.findMany as jest.Mock).mockResolvedValue([
        newConsent,
        oldConsent,
      ]);

      const result = await service.getConsentStatus('user123');

      // Should use the first match (most recent due to orderBy)
      expect(result.documents.TERMS.acceptedAt).toBe(
        newConsent.acceptedAt.toISOString(),
      );
    });
  });
});

