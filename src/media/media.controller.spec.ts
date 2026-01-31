import { Test, TestingModule } from '@nestjs/testing';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

describe('MediaController', () => {
  let controller: MediaController;
  let service: any;

  const mockReq: any = {
    user: { sub: 'user-1' },
    protocol: 'https',
    get: jest.fn().mockReturnValue('api.example.com'),
  };

  beforeEach(async () => {
    const mockService = {
      getSignedPhotoUrl: jest.fn(),
      getPhotoByToken: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MediaController],
      providers: [{ provide: MediaService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<MediaController>(MediaController);
    service = module.get(MediaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSignedUrl', () => {
    it('should return signed URL for photo', async () => {
      const signedUrlResponse = {
        url: 'https://api.example.com/media/photos/photo-1/stream?token=abc',
        expiresAt: new Date(Date.now() + 300000).toISOString(),
      };
      service.getSignedPhotoUrl.mockResolvedValue(signedUrlResponse);

      const result = await controller.getSignedUrl('mission-1', 'photo-1', mockReq);

      expect(service.getSignedPhotoUrl).toHaveBeenCalledWith(
        'mission-1',
        'photo-1',
        'user-1',
        'https://api.example.com',
      );
      expect(result.url).toContain('token=');
    });
  });

  describe('streamPhoto', () => {
    it('should return photo file with valid token', async () => {
      const mockRes: any = {
        set: jest.fn(),
        send: jest.fn(),
      };
      const photoResult = {
        buffer: Buffer.from('test'),
        mimeType: 'image/jpeg',
        size: 4,
      };
      service.getPhotoByToken.mockResolvedValue(photoResult);

      await controller.streamPhoto('photo-1', 'valid-token', mockRes);

      expect(service.getPhotoByToken).toHaveBeenCalledWith('photo-1', 'valid-token');
      expect(mockRes.set).toHaveBeenCalled();
      expect(mockRes.send).toHaveBeenCalledWith(photoResult.buffer);
    });
  });
});
