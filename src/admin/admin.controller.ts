import { Controller, Post, UseGuards, Request, Headers, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminAction } from '../auth/decorators/admin-action.decorator';
import { UserRole } from '@prisma/client';
import { CatalogService } from '../catalog/catalog.service';
import { ConfigService } from '@nestjs/config';

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
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly catalogService: CatalogService,
    private readonly configService: ConfigService,
  ) {}

  @Post('reconcile-payments')
  @UseGuards(JwtAuthGuard, RolesGuard)
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

  /**
   * Seed catalog endpoint
   * Can be called via:
   * 1. Admin JWT token (requires ADMIN role)
   * 2. Secret header X-Admin-Secret (for CI/CD automation)
   */
  @Post('seed-catalog')
  @ApiOperation({
    summary: 'Seed catalog data',
    description: 
      'Seeds categories and skills from JSON files. Idempotent (safe to run multiple times). ' +
      'Requires either: Admin JWT token OR X-Admin-Secret header matching ADMIN_SECRET env var.',
  })
  @ApiHeader({
    name: 'X-Admin-Secret',
    description: 'Admin secret for CI/CD automation (alternative to JWT)',
    required: false,
  })
  async seedCatalog(
    @Headers('x-admin-secret') adminSecret?: string,
    @Request() req?: any,
  ) {
    // Allow access via admin secret (for CI/CD) OR via admin JWT
    const expectedSecret = this.configService.get<string>('ADMIN_SECRET');
    
    if (adminSecret && expectedSecret && adminSecret === expectedSecret) {
      // Valid admin secret - proceed
      return this.catalogService.seedCatalog();
    }

    // Otherwise, require JWT + ADMIN role
    if (!req?.user) {
      throw new UnauthorizedException('Authentication required');
    }

    // Check if user has admin role (LocalUser uses 'admin', User uses 'ADMIN')
    const userRole = req.user.role || req.user.roles?.[0];
    if (userRole !== 'admin' && userRole !== 'ADMIN' && userRole !== UserRole.ADMIN) {
      throw new UnauthorizedException('Admin role required');
    }

    return this.catalogService.seedCatalog();
  }
}

