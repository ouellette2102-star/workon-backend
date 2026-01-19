import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DevicesService } from './devices.service';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { DeviceResponseDto } from './dto/device-response.dto';

/**
 * Devices Controller - Gestion des appareils pour push notifications
 *
 * Endpoints pour enregistrer, lister et supprimer les appareils
 * de l'utilisateur (FCM/APNs tokens).
 */
@ApiTags('Devices')
@Controller('api/v1/devices')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  /**
   * POST /api/v1/devices
   * Register or update a device for the current user.
   */
  @Post()
  @ApiOperation({
    summary: 'Register or update a device',
    description:
      'Registers a new device or updates an existing one for push notifications. ' +
      'If a device with the same deviceId exists, it will be updated with the new pushToken. ' +
      'Use this endpoint when the app starts or when the push token changes.',
  })
  @ApiResponse({
    status: 200,
    description: 'Device registered/updated successfully',
    type: DeviceResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid device data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid or missing JWT token' })
  async registerDevice(
    @Request() req: { user: { userId: string } },
    @Body() dto: RegisterDeviceDto,
  ): Promise<DeviceResponseDto> {
    return this.devicesService.registerDevice(req.user.userId, dto);
  }

  /**
   * GET /api/v1/devices/me
   * Get all active devices for the current user.
   */
  @Get('me')
  @ApiOperation({
    summary: 'Get my registered devices',
    description:
      'Returns all active devices registered by the authenticated user. ' +
      'Inactive (deleted) devices are not included.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of active user devices',
    type: [DeviceResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid or missing JWT token' })
  async getMyDevices(
    @Request() req: { user: { userId: string } },
  ): Promise<DeviceResponseDto[]> {
    return this.devicesService.getMyDevices(req.user.userId);
  }

  /**
   * DELETE /api/v1/devices/:id
   * Soft-delete a device (deactivate).
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Deactivate a device',
    description:
      'Soft-deletes a device by marking it as inactive. ' +
      'The device will no longer receive push notifications. ' +
      'Use this when the user logs out or uninstalls the app.',
  })
  @ApiResponse({ status: 204, description: 'Device deactivated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid or missing JWT token' })
  @ApiResponse({ status: 404, description: 'Device not found or not owned by user' })
  async deleteDevice(
    @Request() req: { user: { userId: string } },
    @Param('id') id: string,
  ): Promise<void> {
    return this.devicesService.deleteDevice(req.user.userId, id);
  }
}
