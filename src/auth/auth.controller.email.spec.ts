import { AuthController } from './auth.controller';
import { LocalAuthService } from './local-auth.service';
import { EmailOtpService } from '../email-change/email-otp.service';

/**
 * Unit tests for AuthController email change endpoints
 * Tests the controller logic without full NestJS module resolution
 */
describe('AuthController - Email Change Endpoints', () => {
  let controller: AuthController;
  let validateUser: jest.Mock;
  let requestEmailChangeOtp: jest.Mock;
  let verifyEmailChangeOtp: jest.Mock;
  let applyEmailChange: jest.Mock;

  const mockRequest = {
    user: { sub: 'user-123' },
  };

  const mockExpressRequest = {
    ip: '127.0.0.1',
    headers: {
      'user-agent': 'Jest Test',
    },
  } as any;

  beforeEach(() => {
    validateUser = jest.fn();
    requestEmailChangeOtp = jest.fn();
    verifyEmailChangeOtp = jest.fn();
    applyEmailChange = jest.fn();

    const mockLocalAuthService = { validateUser } as any;
    const mockEmailOtpService = {
      requestEmailChangeOtp,
      verifyEmailChangeOtp,
      applyEmailChange,
    } as any;

    // Create controller with mocked dependencies
    controller = new AuthController(mockLocalAuthService, mockEmailOtpService);

    jest.clearAllMocks();
  });

  describe('POST /auth/change-email', () => {
    const newEmail = 'newemail@example.com';

    it('should send OTP when email is different', async () => {
      validateUser.mockResolvedValue({
        id: 'user-123',
        email: 'oldemail@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'worker',
        active: true,
      });

      requestEmailChangeOtp.mockResolvedValue({
        success: true,
        message: 'Un code de vérification a été envoyé.',
      });

      const result = await controller.changeEmail(
        { newEmail },
        mockRequest,
        mockExpressRequest,
      );

      expect(result.ok).toBe(true);
      expect(requestEmailChangeOtp).toHaveBeenCalledWith(
        'user-123',
        newEmail,
        { ip: '127.0.0.1', userAgent: 'Jest Test' },
      );
    });

    it('should return no-op when email is the same', async () => {
      validateUser.mockResolvedValue({
        id: 'user-123',
        email: newEmail,
      });

      const result = await controller.changeEmail(
        { newEmail },
        mockRequest,
        mockExpressRequest,
      );

      expect(result.ok).toBe(true);
      expect(result.message).toContain('déjà à jour');
      expect(requestEmailChangeOtp).not.toHaveBeenCalled();
    });

    it('should return RATE_LIMITED error', async () => {
      validateUser.mockResolvedValue({
        id: 'user-123',
        email: 'oldemail@example.com',
      });

      requestEmailChangeOtp.mockRejectedValue(
        new Error('Veuillez patienter 30 secondes'),
      );

      const result = await controller.changeEmail(
        { newEmail },
        mockRequest,
        mockExpressRequest,
      );

      expect(result.ok).toBe(false);
      expect(result.errorCode).toBe('RATE_LIMITED');
    });

    it('should return INVALID_EMAIL for bad format', async () => {
      validateUser.mockResolvedValue({
        id: 'user-123',
        email: 'oldemail@example.com',
      });

      requestEmailChangeOtp.mockRejectedValue(
        new Error("Format d'email invalide"),
      );

      const result = await controller.changeEmail(
        { newEmail: 'bad-email' },
        mockRequest,
        mockExpressRequest,
      );

      expect(result.ok).toBe(false);
      expect(result.errorCode).toBe('INVALID_EMAIL');
    });
  });

  describe('POST /auth/verify-email-otp', () => {
    const newEmail = 'newemail@example.com';
    const code = '123456';

    it('should verify OTP and update email', async () => {
      verifyEmailChangeOtp.mockResolvedValue({
        success: true,
        message: 'Code vérifié.',
        requestId: 'request-123',
      });

      applyEmailChange.mockResolvedValue({
        success: true,
        newEmail,
      });

      const result = await controller.verifyEmailOtp(
        { newEmail, code },
        mockRequest,
      );

      expect(result.ok).toBe(true);
      expect(result.message).toContain('mise à jour');
      expect(applyEmailChange).toHaveBeenCalledWith(
        'user-123',
        'request-123',
      );
    });

    it('should return OTP_INVALID for wrong code', async () => {
      verifyEmailChangeOtp.mockResolvedValue({
        success: false,
        reason: 'invalid',
        message: 'Code incorrect. 4 tentative(s) restante(s).',
      });

      const result = await controller.verifyEmailOtp(
        { newEmail, code: 'wrong' },
        mockRequest,
      );

      expect(result.ok).toBe(false);
      expect(result.errorCode).toBe('OTP_INVALID');
    });

    it('should return OTP_EXPIRED for expired code', async () => {
      verifyEmailChangeOtp.mockResolvedValue({
        success: false,
        reason: 'expired',
        message: 'Le code a expiré.',
      });

      const result = await controller.verifyEmailOtp(
        { newEmail, code },
        mockRequest,
      );

      expect(result.ok).toBe(false);
      expect(result.errorCode).toBe('OTP_EXPIRED');
    });

    it('should return OTP_LOCKED for max attempts', async () => {
      verifyEmailChangeOtp.mockResolvedValue({
        success: false,
        reason: 'max_attempts',
        message: 'Nombre maximum de tentatives atteint.',
      });

      const result = await controller.verifyEmailOtp(
        { newEmail, code },
        mockRequest,
      );

      expect(result.ok).toBe(false);
      expect(result.errorCode).toBe('OTP_LOCKED');
    });

    it('should return OTP_NOT_FOUND when no request exists', async () => {
      verifyEmailChangeOtp.mockResolvedValue({
        success: false,
        reason: 'not_found',
        message: 'Aucune demande en cours.',
      });

      const result = await controller.verifyEmailOtp(
        { newEmail, code },
        mockRequest,
      );

      expect(result.ok).toBe(false);
      expect(result.errorCode).toBe('OTP_NOT_FOUND');
    });

    it('should return EMAIL_IN_USE on conflict during apply', async () => {
      verifyEmailChangeOtp.mockResolvedValue({
        success: true,
        message: 'Code vérifié.',
        requestId: 'request-123',
      });

      applyEmailChange.mockRejectedValue(
        new Error('Cette adresse email est déjà utilisée.'),
      );

      const result = await controller.verifyEmailOtp(
        { newEmail, code },
        mockRequest,
      );

      expect(result.ok).toBe(false);
      expect(result.errorCode).toBe('EMAIL_IN_USE');
    });
  });
});
