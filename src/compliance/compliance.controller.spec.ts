import { Test, TestingModule } from '@nestjs/testing';
import { ComplianceController } from './compliance.controller';
import { ComplianceService } from './compliance.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ACTIVE_LEGAL_VERSIONS } from './compliance.constants';

const mockComplianceService = {
  acceptDocument: jest.fn(),
  getConsentStatus: jest.fn(),
  getActiveVersions: jest.fn(),
};

describe('ComplianceController', () => {
  let controller: ComplianceController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ComplianceController],
      providers: [
        { provide: ComplianceService, useValue: mockComplianceService },
        { provide: JwtService, useValue: { sign: jest.fn(), verify: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<ComplianceController>(ComplianceController);
  });

  describe('acceptDocument', () => {
    it('should accept a document and return result', async () => {
      const mockReq = {
        user: { sub: 'user-123' },
        headers: {
          'x-forwarded-for': '192.168.1.1',
          'user-agent': 'Mozilla/5.0',
        },
        socket: { remoteAddress: '127.0.0.1' },
      };
      const dto = { documentType: 'TERMS', version: ACTIVE_LEGAL_VERSIONS.TERMS };

      mockComplianceService.acceptDocument.mockResolvedValue({
        accepted: true,
        documentType: 'TERMS',
        version: ACTIVE_LEGAL_VERSIONS.TERMS,
        acceptedAt: '2026-01-21T00:00:00.000Z',
        alreadyAccepted: false,
      });

      const result = await controller.acceptDocument(dto as any, mockReq as any);

      expect(mockComplianceService.acceptDocument).toHaveBeenCalledWith(
        'user-123',
        dto,
        '192.168.1.1',
        'Mozilla/5.0',
      );
      expect(result.accepted).toBe(true);
    });

    it('should use socket remoteAddress if x-forwarded-for not present', async () => {
      const mockReq = {
        user: { sub: 'user-123' },
        headers: {
          'user-agent': 'Mozilla/5.0',
        },
        socket: { remoteAddress: '127.0.0.1' },
      };
      const dto = { documentType: 'TERMS', version: ACTIVE_LEGAL_VERSIONS.TERMS };

      mockComplianceService.acceptDocument.mockResolvedValue({
        accepted: true,
        documentType: 'TERMS',
        version: ACTIVE_LEGAL_VERSIONS.TERMS,
        acceptedAt: '2026-01-21T00:00:00.000Z',
        alreadyAccepted: false,
      });

      await controller.acceptDocument(dto as any, mockReq as any);

      expect(mockComplianceService.acceptDocument).toHaveBeenCalledWith(
        'user-123',
        dto,
        '127.0.0.1',
        'Mozilla/5.0',
      );
    });

    it('should handle null IP and userAgent', async () => {
      const mockReq = {
        user: { sub: 'user-123' },
        headers: {},
        socket: {},
      };
      const dto = { documentType: 'PRIVACY', version: ACTIVE_LEGAL_VERSIONS.PRIVACY };

      mockComplianceService.acceptDocument.mockResolvedValue({
        accepted: true,
        documentType: 'PRIVACY',
        version: ACTIVE_LEGAL_VERSIONS.PRIVACY,
        acceptedAt: '2026-01-21T00:00:00.000Z',
        alreadyAccepted: false,
      });

      await controller.acceptDocument(dto as any, mockReq as any);

      expect(mockComplianceService.acceptDocument).toHaveBeenCalledWith(
        'user-123',
        dto,
        null,
        null,
      );
    });

    it('should parse multiple x-forwarded-for addresses', async () => {
      const mockReq = {
        user: { sub: 'user-123' },
        headers: {
          'x-forwarded-for': '203.0.113.1, 198.51.100.2, 192.0.2.3',
          'user-agent': 'Mozilla/5.0',
        },
        socket: {},
      };
      const dto = { documentType: 'TERMS', version: ACTIVE_LEGAL_VERSIONS.TERMS };

      mockComplianceService.acceptDocument.mockResolvedValue({
        accepted: true,
        documentType: 'TERMS',
        version: ACTIVE_LEGAL_VERSIONS.TERMS,
        acceptedAt: '2026-01-21T00:00:00.000Z',
        alreadyAccepted: false,
      });

      await controller.acceptDocument(dto as any, mockReq as any);

      expect(mockComplianceService.acceptDocument).toHaveBeenCalledWith(
        'user-123',
        dto,
        '203.0.113.1', // First IP only
        'Mozilla/5.0',
      );
    });
  });

  describe('getStatus', () => {
    it('should return consent status for user', async () => {
      const mockReq = {
        user: { sub: 'user-123' },
      };

      mockComplianceService.getConsentStatus.mockResolvedValue({
        isComplete: true,
        documents: {
          TERMS: {
            accepted: true,
            version: ACTIVE_LEGAL_VERSIONS.TERMS,
            acceptedAt: '2026-01-21T00:00:00.000Z',
            activeVersion: ACTIVE_LEGAL_VERSIONS.TERMS,
          },
          PRIVACY: {
            accepted: true,
            version: ACTIVE_LEGAL_VERSIONS.PRIVACY,
            acceptedAt: '2026-01-21T00:00:00.000Z',
            activeVersion: ACTIVE_LEGAL_VERSIONS.PRIVACY,
          },
        },
        missing: [],
      });

      const result = await controller.getStatus(mockReq as any);

      expect(mockComplianceService.getConsentStatus).toHaveBeenCalledWith('user-123');
      expect(result.isComplete).toBe(true);
      expect(result.missing).toHaveLength(0);
    });

    it('should return incomplete status when documents missing', async () => {
      const mockReq = {
        user: { sub: 'user-456' },
      };

      mockComplianceService.getConsentStatus.mockResolvedValue({
        isComplete: false,
        documents: {
          TERMS: {
            accepted: false,
            version: null,
            acceptedAt: null,
            activeVersion: ACTIVE_LEGAL_VERSIONS.TERMS,
          },
          PRIVACY: {
            accepted: false,
            version: null,
            acceptedAt: null,
            activeVersion: ACTIVE_LEGAL_VERSIONS.PRIVACY,
          },
        },
        missing: ['TERMS', 'PRIVACY'],
      });

      const result = await controller.getStatus(mockReq as any);

      expect(result.isComplete).toBe(false);
      expect(result.missing).toContain('TERMS');
      expect(result.missing).toContain('PRIVACY');
    });
  });

  describe('getVersions', () => {
    it('should return active versions (public endpoint)', () => {
      mockComplianceService.getActiveVersions.mockReturnValue({
        versions: ACTIVE_LEGAL_VERSIONS,
        updatedAt: '2026-01-15T00:00:00.000Z',
      });

      const result = controller.getVersions();

      expect(mockComplianceService.getActiveVersions).toHaveBeenCalled();
      expect(result.versions).toEqual(ACTIVE_LEGAL_VERSIONS);
    });
  });
});

