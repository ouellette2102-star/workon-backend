import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmailOtpService } from './email-otp.service';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { createHmac } from 'crypto';

describe('EmailOtpService', () => {
  let service: EmailOtpService;
  let prismaService: jest.Mocked<PrismaService>;
  let mailService: jest.Mocked<MailService>;

  const TEST_OTP_SECRET = 'test-otp-secret-for-unit-tests';

  const mockPrismaService = {
    localUser: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    emailOtp: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  const mockMailService = {
    sendOtpEmail: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'OTP_SECRET') return TEST_OTP_SECRET;
      if (key === 'NODE_ENV') return 'test';
      return undefined;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailOtpService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: MailService, useValue: mockMailService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<EmailOtpService>(EmailOtpService);
    prismaService = module.get(PrismaService);
    mailService = module.get(MailService);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('requestEmailChangeOtp', () => {
    const userId = 'user-123';
    const newEmail = 'new@example.com';

    it('should create OTP request and send email', async () => {
      mockPrismaService.localUser.findUnique.mockResolvedValue(null);
      mockPrismaService.emailOtp.findFirst.mockResolvedValue(null);
      mockPrismaService.emailOtp.create.mockResolvedValue({
        id: 'request-123',
        userId,
        newEmail,
        codeHash: 'hashed',
        expiresAt: new Date(Date.now() + 600000),
        attempts: 0,
        consumedAt: null,
        createdAt: new Date(),
      });
      mockMailService.sendOtpEmail.mockResolvedValue({ success: true });

      const result = await service.requestEmailChangeOtp(userId, newEmail);

      expect(result.success).toBe(true);
      expect(result.message).toContain('code de vérification');
      expect(mockPrismaService.emailOtp.create).toHaveBeenCalled();
      expect(mockMailService.sendOtpEmail).toHaveBeenCalledWith({
        to: newEmail,
        otp: expect.any(String),
        purpose: 'email-change',
      });
    });

    it('should reject invalid email format', async () => {
      await expect(service.requestEmailChangeOtp(userId, 'invalid-email')).rejects.toThrow(
        "Format d'email invalide",
      );
    });

    it('should enforce rate limit (60 seconds)', async () => {
      mockPrismaService.localUser.findUnique.mockResolvedValue(null);
      mockPrismaService.emailOtp.findFirst.mockResolvedValue({
        id: 'recent-request',
        createdAt: new Date(), // Just created
      });

      await expect(service.requestEmailChangeOtp(userId, newEmail)).rejects.toThrow(
        /Veuillez patienter/,
      );
    });

    it('should return neutral response if email exists (prevent enumeration)', async () => {
      mockPrismaService.localUser.findUnique.mockResolvedValue({
        id: 'other-user',
        email: newEmail,
      });

      const result = await service.requestEmailChangeOtp(userId, newEmail);

      expect(result.success).toBe(true); // Still returns success
      expect(mockPrismaService.emailOtp.create).not.toHaveBeenCalled(); // But no OTP created
    });
  });

  describe('verifyEmailChangeOtp', () => {
    const userId = 'user-123';
    const newEmail = 'new@example.com';
    const validCode = '123456';

    // Helper to create valid hash
    const createHash = (code: string) => {
      return createHmac('sha256', TEST_OTP_SECRET)
        .update(code)
        .digest('hex');
    };

    it('should verify valid OTP', async () => {
      const codeHash = createHash(validCode);
      
      mockPrismaService.emailOtp.findFirst.mockResolvedValue({
        id: 'request-123',
        userId,
        newEmail,
        codeHash,
        expiresAt: new Date(Date.now() + 600000),
        attempts: 0,
        consumedAt: null,
      });
      mockPrismaService.emailOtp.update.mockResolvedValue({});

      const result = await service.verifyEmailChangeOtp(userId, newEmail, validCode);

      expect(result.success).toBe(true);
      expect(result.requestId).toBe('request-123');
    });

    it('should reject invalid OTP', async () => {
      const codeHash = createHash(validCode);
      
      mockPrismaService.emailOtp.findFirst.mockResolvedValue({
        id: 'request-123',
        userId,
        newEmail,
        codeHash,
        expiresAt: new Date(Date.now() + 600000),
        attempts: 0,
        consumedAt: null,
      });
      mockPrismaService.emailOtp.update.mockResolvedValue({});

      const result = await service.verifyEmailChangeOtp(userId, newEmail, 'wrong-code');

      expect(result.success).toBe(false);
      expect(result.reason).toBe('invalid');
    });

    it('should reject expired OTP', async () => {
      const codeHash = createHash(validCode);
      
      mockPrismaService.emailOtp.findFirst.mockResolvedValue({
        id: 'request-123',
        userId,
        newEmail,
        codeHash,
        expiresAt: new Date(Date.now() - 1000), // Expired
        attempts: 0,
        consumedAt: null,
      });

      const result = await service.verifyEmailChangeOtp(userId, newEmail, validCode);

      expect(result.success).toBe(false);
      expect(result.reason).toBe('expired');
    });

    it('should reject after max attempts', async () => {
      const codeHash = createHash(validCode);
      
      mockPrismaService.emailOtp.findFirst.mockResolvedValue({
        id: 'request-123',
        userId,
        newEmail,
        codeHash,
        expiresAt: new Date(Date.now() + 600000),
        attempts: 5, // Max attempts reached
        consumedAt: null,
      });

      const result = await service.verifyEmailChangeOtp(userId, newEmail, validCode);

      expect(result.success).toBe(false);
      expect(result.reason).toBe('max_attempts');
    });

    it('should return not_found if no request exists', async () => {
      mockPrismaService.emailOtp.findFirst.mockResolvedValue(null);

      const result = await service.verifyEmailChangeOtp(userId, newEmail, validCode);

      expect(result.success).toBe(false);
      expect(result.reason).toBe('not_found');
    });
  });

  describe('OTP hashing (HMAC-SHA256)', () => {
    it('should generate deterministic hash', () => {
      const hashOtp = (service as any).hashOtp.bind(service);
      const otp = '123456';
      
      const hash1 = hashOtp(otp);
      const hash2 = hashOtp(otp);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA256 hex = 64 chars
    });

    it('should produce different hashes for different OTPs', () => {
      const hashOtp = (service as any).hashOtp.bind(service);
      
      const hash1 = hashOtp('123456');
      const hash2 = hashOtp('654321');
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('OTP generation', () => {
    it('should generate 6-digit OTP', () => {
      const generateOtp = (service as any).generateOtp.bind(service);
      
      for (let i = 0; i < 100; i++) {
        const otp = generateOtp();
        expect(otp).toMatch(/^\d{6}$/);
        expect(parseInt(otp)).toBeGreaterThanOrEqual(100000);
        expect(parseInt(otp)).toBeLessThan(1000000);
      }
    });
  });

  describe('email masking', () => {
    it('should mask email for logging', () => {
      const maskEmail = (service as any).maskEmail.bind(service);
      
      expect(maskEmail('john.doe@example.com')).toBe('j***e@example.com');
      expect(maskEmail('ab@example.com')).toBe('***@example.com');
      expect(maskEmail('test')).toBe('***');
    });
  });
});

