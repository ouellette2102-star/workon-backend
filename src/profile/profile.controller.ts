import {
  Body,
  Controller,
  Get,
  Patch,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ProfileService } from './profile.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateProfileDto } from './dto/update-profile-role.dto';
import { ProfileResponseDto } from './dto/profile-response.dto';

/**
 * Profile Controller - Gestion du profil utilisateur
 *
 * Endpoints pour consulter et mettre à jour le profil
 * de l'utilisateur connecté.
 */
@ApiTags('Profiles')
@Controller('api/v1/profile')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  /**
   * GET /api/v1/profile/me
   * Récupérer le profil de l'utilisateur connecté
   */
  @Get('me')
  @ApiOperation({
    summary: 'Get current user profile',
    description:
      'Returns the complete profile of the authenticated user, ' +
      'including name, email, role, and optional fields like bio and skills.',
  })
  @ApiResponse({
    status: 200,
    description: 'Profile retrieved successfully',
    type: ProfileResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid or missing JWT token' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getMe(@Request() req: any): Promise<ProfileResponseDto> {
    return this.profileService.getProfile(req.user.sub);
  }

  /**
   * PATCH /api/v1/profile/me
   * Mettre à jour le profil de l'utilisateur connecté
   */
  @Patch('me')
  @ApiOperation({
    summary: 'Update current user profile',
    description:
      'Updates the profile of the authenticated user. ' +
      'Only provided fields will be updated (partial update). ' +
      'Cannot change email or role via this endpoint.',
  })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
    type: ProfileResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid or missing JWT token' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateProfile(
    @Request() req: any,
    @Body() dto: UpdateProfileDto,
  ): Promise<ProfileResponseDto> {
    return this.profileService.updateProfile(req.user.sub, dto);
  }
}