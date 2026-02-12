import { Test, TestingModule } from '@nestjs/testing';
import { StorageService } from './storage.service';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import * as fs from 'fs/promises';

jest.mock('fs/promises');

describe('StorageService', () => {
  let service: StorageService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        SIGNED_URL_SECRET: 'test-secret',
        SIGNED_URL_TTL_SECONDS: '300',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<StorageService>(StorageService);
    configService = module.get<ConfigService>(ConfigService);

    // Silence logger
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSignedReadUrl', () => {
    const mockSubject = {
      userId: 'user_1',
      missionId: 'mission_1',
      photoId: 'photo_1',
      path: '/test/path',
    };

    it('should generate signed URL with default TTL', () => {
      const result = service.getSignedReadUrl('http://localhost', {
        subject: mockSubject,
      });

      expect(result.url).toContain('http://localhost');
      expect(result.url).toContain('token=');
      expect(result.expiresAt).toBeDefined();
    });

    it('should generate signed URL with custom TTL', () => {
      const result = service.getSignedReadUrl('http://localhost', {
        subject: mockSubject,
        expiresInSeconds: 600,
      });

      expect(result.url).toBeDefined();
      expect(result.expiresAt).toBeDefined();
    });
  });

  describe('verifyToken', () => {
    const mockSubject = {
      userId: 'user_1',
      missionId: 'mission_1',
      photoId: 'photo_1',
      path: '/test/path',
    };

    it('should verify valid token', () => {
      // Generate a token first
      const { url } = service.getSignedReadUrl('http://localhost', {
        subject: mockSubject,
      });

      const token = new URL(url).searchParams.get('token')!;
      const payload = service.verifyToken(token);

      expect(payload.userId).toBe('user_1');
      expect(payload.path).toBe('/test/path');
    });

    it('should throw for invalid token', () => {
      expect(() => service.verifyToken('invalid-token')).toThrow();
    });
  });

  describe('getFile', () => {
    it('should return file contents', async () => {
      const mockBuffer = Buffer.from('test content');
      (fs.readFile as jest.Mock).mockResolvedValue(mockBuffer);
      (fs.stat as jest.Mock).mockResolvedValue({ size: mockBuffer.length });

      const result = await service.getFile('/uploads/missions/test/photo.jpg');

      expect(result).not.toBeNull();
      expect(result?.buffer).toEqual(mockBuffer);
      expect(result?.mimeType).toBe('image/jpeg');
    });

    it('should return null for non-existent file', async () => {
      (fs.readFile as jest.Mock).mockRejectedValue({ code: 'ENOENT' });

      const result = await service.getFile('/uploads/missions/test/missing.jpg');

      expect(result).toBeNull();
    });

    it('should handle different mime types', async () => {
      const mockBuffer = Buffer.from('test');
      (fs.readFile as jest.Mock).mockResolvedValue(mockBuffer);
      (fs.stat as jest.Mock).mockResolvedValue({ size: 4 });

      // PNG
      let result = await service.getFile('/test/photo.png');
      expect(result?.mimeType).toBe('image/png');

      // WEBP
      result = await service.getFile('/test/photo.webp');
      expect(result?.mimeType).toBe('image/webp');

      // GIF
      result = await service.getFile('/test/photo.gif');
      expect(result?.mimeType).toBe('image/gif');

      // Unknown
      result = await service.getFile('/test/file.xyz');
      expect(result?.mimeType).toBe('application/octet-stream');
    });

    it('should throw for other errors', async () => {
      (fs.readFile as jest.Mock).mockRejectedValue(new Error('Permission denied'));

      await expect(service.getFile('/test/photo.jpg')).rejects.toThrow();
    });

    it('should prevent directory traversal attacks', async () => {
      const result = await service.getFile('/../../../etc/passwd');

      expect(result).toBeNull();
    });
  });
});
