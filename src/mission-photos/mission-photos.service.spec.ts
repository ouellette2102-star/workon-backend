import { Test, TestingModule } from '@nestjs/testing';
import { MissionPhotosService } from './mission-photos.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import * as fs from 'fs/promises';

jest.mock('fs/promises');
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid'),
}));

describe('MissionPhotosService', () => {
  let service: MissionPhotosService;
  let prisma: PrismaService;

  const mockPrisma = {
    mission: {
      findUnique: jest.fn(),
    },
    missionPhoto: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockMission = {
    id: 'mission_1',
    authorClientId: 'client_1',
    assigneeWorkerId: 'worker_1',
    authorClient: { clerkId: 'clerk_client' },
    assigneeWorker: { clerkId: 'clerk_worker' },
  };

  const mockPhoto = {
    id: 'photo_1',
    missionId: 'mission_1',
    userId: 'clerk_client',
    url: 'http://localhost/uploads/missions/mission_1/photo.jpg',
    createdAt: new Date(),
    mission: {
      authorClient: { clerkId: 'clerk_client' },
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MissionPhotosService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<MissionPhotosService>(MissionPhotosService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getPhotos', () => {
    it('should return photos for authorized user (author)', async () => {
      mockPrisma.mission.findUnique.mockResolvedValue(mockMission);
      mockPrisma.missionPhoto.findMany.mockResolvedValue([mockPhoto]);

      const result = await service.getPhotos('mission_1', 'clerk_client');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('photo_1');
    });

    it('should return photos for authorized user (worker)', async () => {
      mockPrisma.mission.findUnique.mockResolvedValue(mockMission);
      mockPrisma.missionPhoto.findMany.mockResolvedValue([mockPhoto]);

      const result = await service.getPhotos('mission_1', 'clerk_worker');

      expect(result).toHaveLength(1);
    });

    it('should throw ForbiddenException for unauthorized user', async () => {
      mockPrisma.mission.findUnique.mockResolvedValue(mockMission);

      await expect(
        service.getPhotos('mission_1', 'other_user'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when mission not found', async () => {
      mockPrisma.mission.findUnique.mockResolvedValue(null);

      await expect(
        service.getPhotos('nonexistent', 'clerk_client'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('uploadPhotos', () => {
    const mockFile: Express.Multer.File = {
      fieldname: 'photos',
      originalname: 'test.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      buffer: Buffer.from('test'),
      size: 4,
      stream: null as any,
      destination: '',
      filename: '',
      path: '',
    };

    it('should upload photos for authorized user', async () => {
      mockPrisma.mission.findUnique.mockResolvedValue(mockMission);
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
      mockPrisma.missionPhoto.create.mockResolvedValue({
        ...mockPhoto,
        createdAt: new Date(),
      });

      const result = await service.uploadPhotos(
        'mission_1',
        'clerk_client',
        [mockFile],
        'http://localhost',
      );

      expect(result).toHaveLength(1);
      expect(fs.mkdir).toHaveBeenCalled();
      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('should throw ForbiddenException for unauthorized user', async () => {
      mockPrisma.mission.findUnique.mockResolvedValue(mockMission);

      await expect(
        service.uploadPhotos('mission_1', 'other_user', [mockFile], 'http://localhost'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('uploadPhoto', () => {
    const mockFile: Express.Multer.File = {
      fieldname: 'photo',
      originalname: 'test.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      buffer: Buffer.from('test'),
      size: 4,
      stream: null as any,
      destination: '',
      filename: '',
      path: '',
    };

    it('should upload single photo (legacy)', async () => {
      mockPrisma.mission.findUnique.mockResolvedValue(mockMission);
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
      mockPrisma.missionPhoto.create.mockResolvedValue({
        ...mockPhoto,
        createdAt: new Date(),
      });

      const result = await service.uploadPhoto(
        'mission_1',
        'clerk_client',
        mockFile,
        'http://localhost',
      );

      expect(result.id).toBe('photo_1');
    });
  });

  describe('deletePhoto', () => {
    it('should delete photo for uploader', async () => {
      mockPrisma.missionPhoto.findUnique.mockResolvedValue(mockPhoto);
      (fs.unlink as jest.Mock).mockResolvedValue(undefined);
      mockPrisma.missionPhoto.delete.mockResolvedValue({});

      await service.deletePhoto('mission_1', 'photo_1', 'clerk_client');

      expect(mockPrisma.missionPhoto.delete).toHaveBeenCalled();
    });

    it('should delete photo for mission author', async () => {
      mockPrisma.missionPhoto.findUnique.mockResolvedValue({
        ...mockPhoto,
        userId: 'other_user', // Uploaded by someone else
      });
      (fs.unlink as jest.Mock).mockResolvedValue(undefined);
      mockPrisma.missionPhoto.delete.mockResolvedValue({});

      // clerk_client is the author
      await service.deletePhoto('mission_1', 'photo_1', 'clerk_client');

      expect(mockPrisma.missionPhoto.delete).toHaveBeenCalled();
    });

    it('should throw NotFoundException when photo not found', async () => {
      mockPrisma.missionPhoto.findUnique.mockResolvedValue(null);

      await expect(
        service.deletePhoto('mission_1', 'nonexistent', 'clerk_client'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when photo belongs to different mission', async () => {
      mockPrisma.missionPhoto.findUnique.mockResolvedValue({
        ...mockPhoto,
        missionId: 'other_mission',
      });

      await expect(
        service.deletePhoto('mission_1', 'photo_1', 'clerk_client'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for unauthorized user', async () => {
      mockPrisma.missionPhoto.findUnique.mockResolvedValue({
        ...mockPhoto,
        userId: 'other_uploader',
        mission: { authorClient: { clerkId: 'other_author' } },
      });

      await expect(
        service.deletePhoto('mission_1', 'photo_1', 'unauthorized_user'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should continue even if file not found on disk', async () => {
      mockPrisma.missionPhoto.findUnique.mockResolvedValue(mockPhoto);
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      (fs.unlink as jest.Mock).mockRejectedValue(new Error('File not found'));
      mockPrisma.missionPhoto.delete.mockResolvedValue({});

      // Should not throw
      await service.deletePhoto('mission_1', 'photo_1', 'clerk_client');

      expect(mockPrisma.missionPhoto.delete).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
