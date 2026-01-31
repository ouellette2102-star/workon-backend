import { Test, TestingModule } from '@nestjs/testing';
import { MediaService } from './media.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import {
  NotFoundException,
  ForbiddenException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';

describe('MediaService', () => {
  let service: MediaService;
  let prisma: PrismaService;
  let storageService: StorageService;

  const mockPrisma = {
    mission: {
      findUnique: jest.fn(),
    },
    missionPhoto: {
      findUnique: jest.fn(),
    },
  };

  const mockStorageService = {
    getSignedReadUrl: jest.fn(),
    verifyToken: jest.fn(),
    getFile: jest.fn(),
  };

  const mockMission = {
    id: 'mission_123',
    authorClient: { clerkId: 'clerk_author' },
    assigneeWorker: { clerkId: 'clerk_worker' },
  };

  const mockPhoto = {
    id: 'photo_123',
    missionId: 'mission_123',
    path: '/uploads/missions/mission_123/photo.jpg',
    url: 'http://localhost/uploads/missions/mission_123/photo.jpg',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: StorageService, useValue: mockStorageService },
      ],
    }).compile();

    service = module.get<MediaService>(MediaService);
    prisma = module.get<PrismaService>(PrismaService);
    storageService = module.get<StorageService>(StorageService);

    // Silence logger
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSignedPhotoUrl', () => {
    it('should return signed URL for mission author', async () => {
      mockPrisma.mission.findUnique.mockResolvedValue(mockMission);
      mockPrisma.missionPhoto.findUnique.mockResolvedValue(mockPhoto);
      mockStorageService.getSignedReadUrl.mockResolvedValue({
        url: 'http://signed-url.com',
        expiresAt: '2026-01-31T00:00:00.000Z',
      });

      const result = await service.getSignedPhotoUrl(
        'mission_123',
        'photo_123',
        'clerk_author',
        'http://localhost',
      );

      expect(result.url).toBe('http://signed-url.com');
      expect(mockStorageService.getSignedReadUrl).toHaveBeenCalled();
    });

    it('should return signed URL for assigned worker', async () => {
      mockPrisma.mission.findUnique.mockResolvedValue(mockMission);
      mockPrisma.missionPhoto.findUnique.mockResolvedValue(mockPhoto);
      mockStorageService.getSignedReadUrl.mockResolvedValue({
        url: 'http://signed-url.com',
        expiresAt: '2026-01-31T00:00:00.000Z',
      });

      const result = await service.getSignedPhotoUrl(
        'mission_123',
        'photo_123',
        'clerk_worker',
        'http://localhost',
      );

      expect(result.url).toBe('http://signed-url.com');
    });

    it('should throw ForbiddenException for unauthorized user', async () => {
      mockPrisma.mission.findUnique.mockResolvedValue(mockMission);

      await expect(
        service.getSignedPhotoUrl(
          'mission_123',
          'photo_123',
          'other_user',
          'http://localhost',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when mission not found', async () => {
      mockPrisma.mission.findUnique.mockResolvedValue(null);

      await expect(
        service.getSignedPhotoUrl(
          'nonexistent',
          'photo_123',
          'clerk_author',
          'http://localhost',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when photo not found', async () => {
      mockPrisma.mission.findUnique.mockResolvedValue(mockMission);
      mockPrisma.missionPhoto.findUnique.mockResolvedValue(null);

      await expect(
        service.getSignedPhotoUrl(
          'mission_123',
          'nonexistent',
          'clerk_author',
          'http://localhost',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when photo belongs to different mission', async () => {
      mockPrisma.mission.findUnique.mockResolvedValue(mockMission);
      mockPrisma.missionPhoto.findUnique.mockResolvedValue({
        ...mockPhoto,
        missionId: 'other_mission',
      });

      await expect(
        service.getSignedPhotoUrl(
          'mission_123',
          'photo_123',
          'clerk_author',
          'http://localhost',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should extract path from URL when path is null', async () => {
      mockPrisma.mission.findUnique.mockResolvedValue(mockMission);
      mockPrisma.missionPhoto.findUnique.mockResolvedValue({
        ...mockPhoto,
        path: null,
      });
      mockStorageService.getSignedReadUrl.mockResolvedValue({
        url: 'http://signed-url.com',
        expiresAt: '2026-01-31T00:00:00.000Z',
      });

      const result = await service.getSignedPhotoUrl(
        'mission_123',
        'photo_123',
        'clerk_author',
        'http://localhost',
      );

      expect(result.url).toBe('http://signed-url.com');
    });

    it('should throw NotFoundException when no path available', async () => {
      mockPrisma.mission.findUnique.mockResolvedValue(mockMission);
      mockPrisma.missionPhoto.findUnique.mockResolvedValue({
        ...mockPhoto,
        path: null,
        url: null,
      });

      await expect(
        service.getSignedPhotoUrl(
          'mission_123',
          'photo_123',
          'clerk_author',
          'http://localhost',
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getPhotoByToken', () => {
    it('should return file for valid token', async () => {
      const mockPayload = {
        photoId: 'photo_123',
        path: '/uploads/missions/mission_123/photo.jpg',
      };
      mockStorageService.verifyToken.mockReturnValue(mockPayload);
      mockStorageService.getFile.mockResolvedValue({
        buffer: Buffer.from('photo data'),
        mimeType: 'image/jpeg',
      });

      const result = await service.getPhotoByToken('photo_123', 'valid-token');

      expect(result.mimeType).toBe('image/jpeg');
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      mockStorageService.verifyToken.mockImplementation(() => {
        throw new Error('Token invalide');
      });

      await expect(
        service.getPhotoByToken('photo_123', 'invalid-token'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw ForbiddenException for expired token', async () => {
      mockStorageService.verifyToken.mockImplementation(() => {
        throw new Error('Token expiré');
      });

      await expect(
        service.getPhotoByToken('photo_123', 'expired-token'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when photoId mismatch', async () => {
      mockStorageService.verifyToken.mockReturnValue({
        photoId: 'different_photo',
        path: '/path',
      });

      await expect(
        service.getPhotoByToken('photo_123', 'valid-token'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when file not found in storage', async () => {
      mockStorageService.verifyToken.mockReturnValue({
        photoId: 'photo_123',
        path: '/missing/path',
      });
      mockStorageService.getFile.mockResolvedValue(null);

      await expect(
        service.getPhotoByToken('photo_123', 'valid-token'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
