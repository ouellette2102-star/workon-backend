import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IdentityVerificationService } from './identity-verification.service';
import { ConfirmOtpDto } from './dto/confirm-otp.dto';

@ApiTags('Identity')
@ApiBearerAuth()
@Controller('api/v1/identity')
@UseGuards(JwtAuthGuard)
export class IdentityController {
  constructor(
    private readonly identityService: IdentityVerificationService,
  ) {}

  /**
   * GET /api/v1/identity/status
   * Returns current verification state + trust tier.
   */
  @Get('status')
  @ApiOperation({ summary: 'Get identity verification status' })
  @ApiResponse({ status: 200, description: 'Verification status' })
  async getStatus(@Request() req: { user: { sub: string } }) {
    return this.identityService.getVerificationStatus(req.user.sub);
  }

  /**
   * POST /api/v1/identity/verify/phone
   * Generates an OTP, "sends" it (Twilio when configured, logged otherwise),
   * and returns expiresInSeconds. In DEV, the OTP is included in the response.
   */
  @Post('verify/phone')
  @HttpCode(200)
  @ApiOperation({ summary: 'Start phone OTP verification' })
  @ApiResponse({ status: 200, description: 'OTP sent' })
  async startPhone(@Request() req: { user: { sub: string } }) {
    return this.identityService.startPhoneVerification(req.user.sub);
  }

  /**
   * POST /api/v1/identity/verify/phone/confirm
   * Body: { code: "123456" }. Marks phone verified on success and
   * recomputes trust tier.
   */
  @Post('verify/phone/confirm')
  @HttpCode(200)
  @ApiOperation({ summary: 'Confirm phone OTP' })
  @ApiResponse({ status: 200, description: 'Phone verified' })
  @ApiResponse({ status: 401, description: 'Invalid or expired code' })
  async confirmPhone(
    @Request() req: { user: { sub: string } },
    @Body() dto: ConfirmOtpDto,
  ) {
    return this.identityService.confirmPhoneOtp(req.user.sub, dto.code);
  }

  /**
   * POST /api/v1/identity/verify/id/start
   * Kicks off ID verification. Currently a stub that marks status PENDING;
   * provider (Stripe Identity / Onfido) will be wired in a later phase.
   */
  @Post('verify/id/start')
  @HttpCode(200)
  @ApiOperation({ summary: 'Start ID verification' })
  @ApiResponse({ status: 200, description: 'ID verification started' })
  async startId(@Request() req: { user: { sub: string } }) {
    return this.identityService.startIdVerification(req.user.sub);
  }
}
