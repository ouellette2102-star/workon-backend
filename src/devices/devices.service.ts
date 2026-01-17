import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DevicesService {
  constructor(private readonly prisma: PrismaService) {}

  async registerDevice(userId: string, token: string, platform: string) {
    await this.prisma.localDeviceToken.upsert({
      where: { token },
      update: {
        userId,
        platform,
        updatedAt: new Date(),
      },
      create: {
        id: `dev_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        userId,
        token,
        platform,
      },
    });

    return { success: true };
  }

  async unregisterDevice(userId: string, token: string) {
    const existing = await this.prisma.localDeviceToken.findUnique({
      where: { token },
      select: { id: true, userId: true },
    });

    if (!existing) {
      return { success: true, removed: 0 };
    }

    if (existing.userId !== userId) {
      // Do not delete tokens owned by another user
      return { success: false, removed: 0 };
    }

    await this.prisma.localDeviceToken.delete({
      where: { token },
    });

    return { success: true, removed: 1 };
  }
}

