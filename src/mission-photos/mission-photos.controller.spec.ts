import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { MissionPhotosController } from './mission-photos.controller';
import { MissionPhotosService } from './mission-photos.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

// Mock uuid module
jest.mock('uuid', () => ({
  v4: () => 'test-uuid-1234-5678-9abc',
}));

describe('MissionPhotosController', () => {
  let controller: MissionPhotosController;
  let service: any;

  const mockPhoto: any = {
    id: 'photo-1',
    missionId: 'mission-1',
    userId: 'user-1',
    url: '/uploads/photo-1.jpg',
    createdAt: new Date(),
  };

  const mockReq: any = {
    user: { sub: 'user-1' },
    protocol: 'https',
    get: jest.fn().mockReturnValue('api.example.com'),
  };

  beforeEach(async () => {
    const mockService = {
      getPhotos: jest.fn(),
      uploadPhotos: jest.fn(),
      deletePhoto: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MissionPhotosController],
      providers: [{ provide: MissionPhotosService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<MissionPhotosController>(MissionPhotosController);
    service = module.get(MissionPhotosService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getPhotos', () => {
    it('should return photos for mission', async () => {
      service.getPhotos.mockResolvedValue([mockPhoto]);

      const result = await controller.getPhotos('mission-1', mockReq);

      expect(service.getPhotos).toHaveBeenCalledWith('mission-1', 'user-1');
      expect(result).toHaveLength(1);
    });
  });

  describe('uploadPhotos', () => {
    it('should upload photos', async () => {
      const mockFiles: Express.Multer.File[] = [
        {
          fieldname: 'files',
          originalname: 'test.jpg',
          encoding: '7bit',
          mimetype: 'image/jpeg',
          buffer: Buffer.from('test'),
          size: 1024,
        } as Express.Multer.File,
      ];
      service.uploadPhotos.mockResolvedValue([mockPhoto]);

      const result = await controller.uploadPhotos(
        'mission-1',
        mockReq,
        mockFiles,
      );

      expect(service.uploadPhotos).toHaveBeenCalledWith(
        'mission-1',
        'user-1',
        mockFiles,
        'https://api.example.com',
      );
      expect(result.uploaded).toBe(1);
      expect(result.photos).toHaveLength(1);
    });

    it('should throw BadRequestException if no files', async () => {
      await expect(
        controller.uploadPhotos('mission-1', mockReq, []),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid mime type', async () => {
      const mockFiles: Express.Multer.File[] = [
        {
          fieldname: 'files',
          originalname: 'test.pdf',
          encoding: '7bit',
          mimetype: 'application/pdf',
          buffer: Buffer.from('test'),
          size: 1024,
        } as Express.Multer.File,
      ];

      await expect(
        controller.uploadPhotos('mission-1', mockReq, mockFiles),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deletePhoto', () => {
    it('should delete photo', async () => {
      service.deletePhoto.mockResolvedValue({ success: true });

      const result = await controller.deletePhoto(
        'mission-1',
        'photo-1',
        mockReq,
      );

      expect(service.deletePhoto).toHaveBeenCalledWith(
        'mission-1',
        'photo-1',
        'user-1',
      );
      expect(result).toBeDefined();
    });
  });
});
