import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ReputationController } from './reputation.controller';
import { ReputationService } from './reputation.service';

describe('ReputationController', () => {
  let controller: ReputationController;
  const mockService = {
    getReputation: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReputationController],
      providers: [{ provide: ReputationService, useValue: mockService }],
    }).compile();
    controller = module.get<ReputationController>(ReputationController);
  });

  afterEach(() => jest.clearAllMocks());

  it('returns the reputation block when the user exists', async () => {
    const block = { id: 'u1', trustScore: 80 };
    mockService.getReputation.mockResolvedValue(block);
    await expect(controller.getUserReputation('u1')).resolves.toBe(block);
  });

  it('throws NotFoundException when the user is missing', async () => {
    mockService.getReputation.mockResolvedValue(null);
    await expect(controller.getUserReputation('ghost')).rejects.toThrow(
      NotFoundException,
    );
  });
});
