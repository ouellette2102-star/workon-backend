import {
  Controller,
  Get,
  Body,
  Patch,
  Delete,
  Post,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { plainToInstance } from 'class-transformer';

@ApiTags('Users')
@Controller('api/v1/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'Returns current user profile',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMe(@Request() req: any) {
    const user = await this.usersService.findById(req.user.sub);
    return plainToInstance(UserResponseDto, user, {
      excludeExtraneousValues: true,
    });
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateMe(
    @Request() req: any,
    @Body() updateUserDto: UpdateUserProfileDto,
  ) {
    const user = await this.usersService.updateProfile(
      req.user.sub,
      updateUserDto,
    );
    return plainToInstance(UserResponseDto, user, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * POST /api/v1/users/me/picture
   * 
   * Upload a profile picture for the current user.
   * Accepts JPEG, PNG, WebP files up to 5MB.
   * Replaces any existing profile picture.
   */
  @Post('me/picture')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload profile picture',
    description: 'Upload a profile picture. Accepts JPEG, PNG, WebP (max 5MB). Replaces existing picture.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Image file (JPEG, PNG, WebP)',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Profile picture uploaded successfully',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid file (wrong format or too large)' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async uploadPicture(
    @Request() req: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    // Build base URL from request
    const protocol = req.protocol || 'http';
    const host = req.get('host') || 'localhost:3000';
    const baseUrl = `${protocol}://${host}`;

    const user = await this.usersService.uploadPicture(
      req.user.sub,
      file,
      baseUrl,
    );
    return plainToInstance(UserResponseDto, user, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * DELETE /api/v1/users/me
   * 
   * GDPR-compliant account deletion.
   * Anonymizes PII and marks account as deleted.
   * User will be logged out and unable to login again.
   * 
   * This endpoint is idempotent: calling on already-deleted account returns 204.
   */
  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete current user account (GDPR)',
    description:
      'Permanently deletes the current user account. ' +
      'Anonymizes all personal data (email, name, phone) and invalidates all sessions. ' +
      'This action is irreversible.',
  })
  @ApiResponse({
    status: 204,
    description: 'Account deleted successfully (no content)',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid or missing token' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async deleteMe(@Request() req: { user: { sub: string } }): Promise<void> {
    await this.usersService.deleteAccount(req.user.sub);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user by ID (admin or self)' })
  @ApiResponse({
    status: 200,
    description: 'Returns user profile',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(@Param('id') id: string) {
    const user = await this.usersService.findById(id);
    return plainToInstance(UserResponseDto, user, {
      excludeExtraneousValues: true,
    });
  }
}

