import { Controller, Post, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminAction } from '../auth/decorators/admin-action.decorator';
import { UserRole } from '@prisma/client';

/**
 * Admin Controller
 * PR-04: All endpoints require ADMIN role and are audit-logged
 *
 * Security:
 * - JwtAuthGuard: Requires valid JWT token
 * - RolesGuard: Requires ADMIN role
 * - @AdminAction: Logs action to TrustAuditLog
 */
@ApiTags('Admin')
@ApiBearerAuth()
@Controller('api/v1/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('reconcile-payments')
  @Roles(UserRole.ADMIN)
  @AdminAction({
    action: 'reconcile_payments',
    description: 'Reconcile all pending payment statuses with Stripe',
  })
  @ApiOperation({
    summary: 'Reconcile payment statuses',
    description: 'Admin-only: Sync payment statuses with Stripe for all pending payments.',
  })
  async reconcilePayments(@Request() req: any) {
    return this.adminService.reconcilePayments(req.user.sub);
  }
}

