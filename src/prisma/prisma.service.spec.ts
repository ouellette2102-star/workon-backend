import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  let service: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    service = module.get<PrismaService>(PrismaService);
    
    // Mock connection methods to avoid real DB connection
    jest.spyOn(service, '$connect').mockResolvedValue();
    jest.spyOn(service, '$disconnect').mockResolvedValue();
  });

  afterEach(async () => {
    jest.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have PrismaClient methods', () => {
      expect(service.$connect).toBeDefined();
      expect(service.$disconnect).toBeDefined();
      expect(service.$transaction).toBeDefined();
    });
  });

  describe('onModuleInit', () => {
    it('should call $connect during initialization', async () => {
      await service.onModuleInit();
      expect(service.$connect).toHaveBeenCalled();
    });
  });

  describe('onModuleDestroy', () => {
    it('should call $disconnect during cleanup', async () => {
      await service.onModuleDestroy();
      expect(service.$disconnect).toHaveBeenCalled();
    });
  });

  describe('transaction', () => {
    it('should execute transaction callback', async () => {
      const mockFn = jest.fn().mockResolvedValue('result');
      jest.spyOn(service, '$transaction').mockImplementation(async (fn) => {
        return await fn(service);
      });
      
      const result = await service.transaction(mockFn);
      
      expect(result).toBe('result');
      expect(mockFn).toHaveBeenCalled();
    });
  });
});
