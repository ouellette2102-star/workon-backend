import {
  Body,
  Controller,
  Get,
  Patch,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProfileService } from './profile.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateProfileDto } from './dto/update-profile-role.dto';
import { ProfileResponseDto } from './dto/profile-response.dto';

@ApiTags('Profiles')
@ApiBearerAuth()
@Controller('api/v1/profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  /**
   * GET /api/v1/profile
   * Alias for /api/v1/profile/me - returns current user's profile
   */
  @Get()
  @ApiOperation({ summary: 'Get current user profile (alias for /me)' })
  async getProfile(@Request() req: any): Promise<ProfileResponseDto> {
    return this.profileService.getProfile(req.user.sub);
  }

  /**
   * GET /api/v1/profile/me
   * Returns current user's profile
   */
  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  async getMe(@Request() req: any): Promise<ProfileResponseDto> {
    return this.profileService.getProfile(req.user.sub);
  }

  /**
   * PATCH /api/v1/profile/me
   * Update current user's profile
   */
  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  async updateProfile(
    @Request() req: any,
    @Body() dto: UpdateProfileDto,
  ): Promise<ProfileResponseDto> {
    return this.profileService.updateProfile(req.user.sub, dto);
  }
}