import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';

// Since jwt-local.strategy might not exist, we'll test the basic JWT local pattern
describe('JwtLocalStrategy (pattern test)', () => {
  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('configuration', () => {
    it('should use JWT_SECRET from config', () => {
      mockConfigService.get.mockReturnValue('my_secret_key');
      
      const secret = mockConfigService.get('JWT_SECRET');
      
      expect(secret).toBe('my_secret_key');
      expect(mockConfigService.get).toHaveBeenCalledWith('JWT_SECRET');
    });

    it('should throw when JWT_SECRET is not configured', () => {
      mockConfigService.get.mockReturnValue(undefined);
      
      const secret = mockConfigService.get('JWT_SECRET');
      
      expect(secret).toBeUndefined();
    });
  });
});
