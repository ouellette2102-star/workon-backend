import { Test } from '@nestjs/testing';
import { ForbiddenException, ExecutionContext } from '@nestjs/common';
import { MissionQuotaGuard } from './mission-quota.guard';
import { SubscriptionsService } from '../subscriptions.service';

function mockCtx(sub?: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => (sub ? { user: { sub } } : {}),
    }),
  } as any;
}

describe('MissionQuotaGuard', () => {
  let guard: MissionQuotaGuard;
  let subs: { hasActiveSubscription: jest.Mock; missionsThisMonth: jest.Mock };

  beforeEach(async () => {
    subs = {
      hasActiveSubscription: jest.fn(),
      missionsThisMonth: jest.fn(),
    };
    const module = await Test.createTestingModule({
      providers: [
        MissionQuotaGuard,
        { provide: SubscriptionsService, useValue: subs },
      ],
    }).compile();
    guard = module.get(MissionQuotaGuard);
  });

  it('lets paid users through unconditionally', async () => {
    subs.hasActiveSubscription.mockResolvedValue(true);
    await expect(guard.canActivate(mockCtx('u1'))).resolves.toBe(true);
    expect(subs.missionsThisMonth).not.toHaveBeenCalled();
  });

  it('allows free user under quota', async () => {
    subs.hasActiveSubscription.mockResolvedValue(false);
    subs.missionsThisMonth.mockResolvedValue(2);
    await expect(guard.canActivate(mockCtx('u1'))).resolves.toBe(true);
  });

  it('blocks free user at quota', async () => {
    subs.hasActiveSubscription.mockResolvedValue(false);
    subs.missionsThisMonth.mockResolvedValue(3);
    await expect(guard.canActivate(mockCtx('u1'))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('blocks free user over quota', async () => {
    subs.hasActiveSubscription.mockResolvedValue(false);
    subs.missionsThisMonth.mockResolvedValue(10);
    await expect(guard.canActivate(mockCtx('u1'))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('passes through when user missing (JwtAuthGuard handles)', async () => {
    await expect(guard.canActivate(mockCtx())).resolves.toBe(true);
  });
});
