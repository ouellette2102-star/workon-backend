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

@ApiTags('devices')
@Controller('api/v1/devices')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  /**
   * POST /devices
   * Register or update a device for the current user.
   */
  @Post()
  @ApiOperation({ summary: 'Register or update a device' })
  @ApiResponse({
    status: 200,
    description: 'Device registered/updated successfully',
    type: DeviceResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async registerDevice(
    @Request() req: { user: { userId: string } },
    @Body() dto: RegisterDeviceDto,
  ): Promise<DeviceResponseDto> {
    return this.devicesService.registerDevice(req.user.userId, dto);
  }

  /**
   * GET /devices/me
   * Get all active devices for the current user.
   */
  @Get('me')
  @ApiOperation({ summary: 'Get my devices' })
  @ApiResponse({
    status: 200,
    description: 'List of user devices',
    type: [DeviceResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMyDevices(
    @Request() req: { user: { userId: string } },
  ): Promise<DeviceResponseDto[]> {
    return this.devicesService.getMyDevices(req.user.userId);
  }

  /**
   * DELETE /devices/:id
   * Soft-delete a device (deactivate).
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deactivate a device' })
  @ApiResponse({ status: 204, description: 'Device deactivated' })
  @ApiResponse({ status: 404, description: 'Device not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deleteDevice(
    @Request() req: { user: { userId: string } },
    @Param('id') id: string,
  ): Promise<void> {
    return this.devicesService.deleteDevice(req.user.userId, id);
  }
}
