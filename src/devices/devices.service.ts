import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { DeviceResponseDto } from './dto/device-response.dto';

@Injectable()
export class DevicesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Registers or updates a device for a user.
   * Uses upsert on (userId, deviceId) unique constraint.
   */
  async registerDevice(
    userId: string,
    dto: RegisterDeviceDto,
  ): Promise<DeviceResponseDto> {
    const device = await this.prisma.device.upsert({
      where: {
        userId_deviceId: {
          userId,
          deviceId: dto.deviceId,
        },
      },
      update: {
        platform: dto.platform,
        pushToken: dto.pushToken,
        appVersion: dto.appVersion,
        lastSeenAt: new Date(),
        active: true,
      },
      create: {
        userId,
        deviceId: dto.deviceId,
        platform: dto.platform,
        pushToken: dto.pushToken,
        appVersion: dto.appVersion,
        lastSeenAt: new Date(),
      },
    });

    return this.mapToResponse(device);
  }

  /**
   * Gets all active devices for a user.
   */
  async getMyDevices(userId: string): Promise<DeviceResponseDto[]> {
    const devices = await this.prisma.device.findMany({
      where: {
        userId,
        active: true,
      },
      orderBy: { lastSeenAt: 'desc' },
    });

    return devices.map((d) => this.mapToResponse(d));
  }

  /**
   * Soft-deletes a device (sets active = false).
   * Only the owner can delete their own device.
   */
  async deleteDevice(userId: string, deviceId: string): Promise<void> {
    const device = await this.prisma.device.findUnique({
      where: { id: deviceId },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    // Security: only owner can delete
    if (device.userId !== userId) {
      throw new NotFoundException('Device not found');
    }

    await this.prisma.device.update({
      where: { id: deviceId },
      data: { active: false },
    });
  }

  /**
   * Updates the push token for an existing device.
   */
  async updatePushToken(
    userId: string,
    deviceId: string,
    pushToken: string,
  ): Promise<DeviceResponseDto> {
    const device = await this.prisma.device.findFirst({
      where: {
        userId,
        deviceId,
        active: true,
      },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    const updated = await this.prisma.device.update({
      where: { id: device.id },
      data: {
        pushToken,
        lastSeenAt: new Date(),
      },
    });

    return this.mapToResponse(updated);
  }

  /**
   * Gets all active push tokens for a user (for notifications).
   */
  async getPushTokensForUser(userId: string): Promise<string[]> {
    const devices = await this.prisma.device.findMany({
      where: {
        userId,
        active: true,
        pushToken: { not: null },
      },
      select: { pushToken: true },
    });

    return devices
      .map((d) => d.pushToken)
      .filter((token): token is string => token !== null);
  }

  private mapToResponse(device: {
    id: string;
    userId: string;
    deviceId: string;
    platform: string;
    pushToken: string | null;
    appVersion: string | null;
    active: boolean;
    lastSeenAt: Date;
    createdAt: Date;
  }): DeviceResponseDto {
    return {
      id: device.id,
      userId: device.userId,
      deviceId: device.deviceId,
      platform: device.platform,
      pushToken: device.pushToken ?? undefined,
      appVersion: device.appVersion ?? undefined,
      active: device.active,
      lastSeenAt: device.lastSeenAt,
      createdAt: device.createdAt,
    };
  }
}
