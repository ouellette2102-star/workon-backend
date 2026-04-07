import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ProsController } from './pros.controller';
import { ProsService } from './pros.service';

describe('ProsController (ghl-signup webhook auth)', () => {
  let controller: ProsController;
  let prosService: { handleGhlSignup: jest.Mock };
  const ORIGINAL_ENV = process.env;

  beforeEach(async () => {
    prosService = {
      handleGhlSignup: jest.fn().mockResolvedValue({ id: 'lu_1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProsController],
      providers: [{ provide: ProsService, useValue: prosService }],
    }).compile();

    controller = module.get<ProsController>(ProsController);
    process.env = { ...ORIGINAL_ENV };
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it('rejects when GHL_WEBHOOK_SECRET is not set', async () => {
    delete process.env.GHL_WEBHOOK_SECRET;

    await expect(
      controller.handleGhlSignup({ email: 'a@b.com' }, 'anything'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prosService.handleGhlSignup).not.toHaveBeenCalled();
  });

  it('rejects when header does not match GHL_WEBHOOK_SECRET', async () => {
    process.env.GHL_WEBHOOK_SECRET = 'expected';

    await expect(
      controller.handleGhlSignup({ email: 'a@b.com' }, 'wrong'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prosService.handleGhlSignup).not.toHaveBeenCalled();
  });

  it('rejects when header is missing', async () => {
    process.env.GHL_WEBHOOK_SECRET = 'expected';

    await expect(
      controller.handleGhlSignup({ email: 'a@b.com' }, undefined),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('accepts when header matches', async () => {
    process.env.GHL_WEBHOOK_SECRET = 'expected';

    const result = await controller.handleGhlSignup(
      { email: 'a@b.com' },
      'expected',
    );

    expect(prosService.handleGhlSignup).toHaveBeenCalledWith({ email: 'a@b.com' });
    expect(result).toEqual({ received: true, proId: 'lu_1' });
  });
});
