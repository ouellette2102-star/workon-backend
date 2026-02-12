import { Test, TestingModule } from '@nestjs/testing';
import { OffersController } from './offers.controller';
import { OffersService } from './offers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ConsentGuard } from '../compliance/guards/consent.guard';
import { OfferStatus } from '@prisma/client';

describe('OffersController', () => {
  let controller: OffersController;
  let service: any;

  const mockOffer: any = {
    id: 'offer-1',
    missionId: 'mission-1',
    workerId: 'worker-1',
    proposedPrice: 100,
    message: 'I can do this job',
    status: OfferStatus.PENDING,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockReq = { user: { sub: 'user-1' } };

  beforeEach(async () => {
    const mockService = {
      create: jest.fn(),
      findByMission: jest.fn(),
      findByWorker: jest.fn(),
      findById: jest.fn(),
      accept: jest.fn(),
      reject: jest.fn(),
      withdraw: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OffersController],
      providers: [{ provide: OffersService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(ConsentGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<OffersController>(OffersController);
    service = module.get(OffersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create an offer', async () => {
      const createDto = { missionId: 'mission-1', proposedPrice: 100 };
      service.create.mockResolvedValue(mockOffer);

      const result = await controller.create(mockReq, createDto as any);

      expect(service.create).toHaveBeenCalledWith('user-1', createDto);
      expect(result.id).toBe('offer-1');
    });
  });

  describe('findWithQuery', () => {
    it('should return offers for mission', async () => {
      service.findByMission.mockResolvedValue([mockOffer]);

      const result = await controller.findWithQuery(mockReq, 'mission-1');

      expect(service.findByMission).toHaveBeenCalledWith('mission-1', 'user-1');
      expect(result).toHaveLength(1);
    });

    it('should return user offers when no missionId', async () => {
      service.findByWorker.mockResolvedValue([mockOffer]);

      const result = await controller.findWithQuery(mockReq);

      expect(service.findByWorker).toHaveBeenCalledWith('user-1');
      expect(result).toHaveLength(1);
    });
  });

  describe('findMine', () => {
    it('should return current user offers', async () => {
      service.findByWorker.mockResolvedValue([mockOffer]);

      const result = await controller.findMine(mockReq);

      expect(service.findByWorker).toHaveBeenCalledWith('user-1');
      expect(result).toHaveLength(1);
    });
  });

  describe('findByMission', () => {
    it('should return offers for specific mission', async () => {
      service.findByMission.mockResolvedValue([mockOffer]);

      const result = await controller.findByMission(mockReq, 'mission-1');

      expect(service.findByMission).toHaveBeenCalledWith('mission-1', 'user-1');
      expect(result).toHaveLength(1);
    });
  });

  describe('findById', () => {
    it('should return single offer', async () => {
      service.findById.mockResolvedValue(mockOffer);

      const result = await controller.findById('offer-1');

      expect(service.findById).toHaveBeenCalledWith('offer-1');
      expect(result.id).toBe('offer-1');
    });
  });

  describe('accept', () => {
    it('should accept an offer', async () => {
      service.accept.mockResolvedValue({ ...mockOffer, status: OfferStatus.ACCEPTED });

      const result = await controller.accept(mockReq, 'offer-1');

      expect(service.accept).toHaveBeenCalledWith('offer-1', 'user-1');
      expect(result.status).toBe(OfferStatus.ACCEPTED);
    });
  });

  describe('reject', () => {
    it('should reject an offer', async () => {
      service.reject.mockResolvedValue({ ...mockOffer, status: OfferStatus.DECLINED });

      const result = await controller.reject(mockReq, 'offer-1');

      expect(service.reject).toHaveBeenCalledWith('offer-1', 'user-1');
      expect(result.status).toBe(OfferStatus.DECLINED);
    });
  });
});
