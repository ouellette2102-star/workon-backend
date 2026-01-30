import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { DeviceResponseDto } from './dto/device-response.dto';

@Injectable()
export class DevicesService {
  private readonly logger = new Logger(DevicesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Check if userId is a LocalUser (starts with "local_")
   */
  private isLocalUser(userId: string): boolean {
    return userId.startsWith('local_');
  }

  /**
   * Registers or updates a device for a user.
   * Uses upsert on (userId, deviceId) unique constraint.
   * Automatically routes to LocalDevice for local users.
   */
  async registerDevice(
    userId: string,
    dto: RegisterDeviceDto,
  ): Promise<DeviceResponseDto> {
    // Route to LocalDevice for local auth users
    if (this.isLocalUser(userId)) {
      return this.registerLocalDevice(userId, dto);
    }

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
   * Register device for LocalUser (mobile app users)
   */
  private async registerLocalDevice(
    userId: string,
    dto: RegisterDeviceDto,
  ): Promise<DeviceResponseDto> {
    this.logger.log(`Registering local device for user: ${userId}`);

    const device = await this.prisma.localDevice.upsert({
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
    // Route to LocalDevice for local auth users
    if (this.isLocalUser(userId)) {
      const devices = await this.prisma.localDevice.findMany({
        where: {
          userId,
          active: true,
        },
        orderBy: { lastSeenAt: 'desc' },
      });
      return devices.map((d) => this.mapToResponse(d));
    }

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
    // Route to LocalDevice for local auth users
    if (this.isLocalUser(userId)) {
      const device = await this.prisma.localDevice.findUnique({
        where: { id: deviceId },
      });

      if (!device || device.userId !== userId) {
        throw new NotFoundException('Device not found');
      }

      await this.prisma.localDevice.update({
        where: { id: deviceId },
        data: { active: false },
      });
      return;
    }

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
    // Route to LocalDevice for local auth users
    if (this.isLocalUser(userId)) {
      const device = await this.prisma.localDevice.findFirst({
        where: {
          userId,
          deviceId,
          active: true,
        },
      });

      if (!device) {
        throw new NotFoundException('Device not found');
      }

      const updated = await this.prisma.localDevice.update({
        where: { id: device.id },
        data: {
          pushToken,
          lastSeenAt: new Date(),
        },
      });

      return this.mapToResponse(updated);
    }

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
    // Route to LocalDevice for local auth users
    if (this.isLocalUser(userId)) {
      const devices = await this.prisma.localDevice.findMany({
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
