import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { SchedulingCronController } from './scheduling-cron.controller';
import { SchedulingService } from './scheduling.service';

describe('SchedulingCronController', () => {
  let controller: SchedulingCronController;
  let schedulingService: { generateAllRecurring: jest.Mock };
  const ORIGINAL_ENV = process.env;

  beforeEach(async () => {
    schedulingService = {
      generateAllRecurring: jest.fn().mockResolvedValue({
        processed: 0,
        generated: 0,
        errors: 0,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SchedulingCronController],
      providers: [
        { provide: SchedulingService, useValue: schedulingService },
      ],
    }).compile();

    controller = module.get<SchedulingCronController>(SchedulingCronController);
    process.env = { ...ORIGINAL_ENV };
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it('rejects when CRON_SECRET env is not configured', async () => {
    delete process.env.CRON_SECRET;

    await expect(controller.generateRecurring('anything')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(schedulingService.generateAllRecurring).not.toHaveBeenCalled();
  });

  it('rejects when provided header does not match CRON_SECRET', async () => {
    process.env.CRON_SECRET = 'correct-secret';

    await expect(controller.generateRecurring('wrong-secret')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(schedulingService.generateAllRecurring).not.toHaveBeenCalled();
  });

  it('accepts and runs generation when header matches CRON_SECRET', async () => {
    process.env.CRON_SECRET = 'correct-secret';

    const result = await controller.generateRecurring('correct-secret');

    expect(schedulingService.generateAllRecurring).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ processed: 0, generated: 0, errors: 0 });
  });
});
