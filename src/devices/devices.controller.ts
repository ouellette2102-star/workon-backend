import {
  Body,
  Controller,
  Delete,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DevicesService } from './devices.service';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { UnregisterDeviceDto } from './dto/unregister-device.dto';

@ApiTags('Devices')
@ApiBearerAuth()
@Controller('api/v1/devices')
@UseGuards(JwtAuthGuard)
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register device token for push notifications' })
  @ApiResponse({ status: 200, description: 'Device registered' })
  register(@Body() dto: RegisterDeviceDto, @Request() req: any) {
    const userId = req.user.userId || req.user.sub;
    return this.devicesService.registerDevice(userId, dto.token, dto.platform);
  }

  @Delete('unregister')
  @ApiOperation({ summary: 'Unregister device token' })
  @ApiResponse({ status: 200, description: 'Device unregistered' })
  unregister(@Body() dto: UnregisterDeviceDto, @Request() req: any) {
    const userId = req.user.userId || req.user.sub;
    return this.devicesService.unregisterDevice(userId, dto.token);
  }
}

