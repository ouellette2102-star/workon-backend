import { SetMetadata, applyDecorators, UseInterceptors } from '@nestjs/common';
import { ADMIN_ACTION_KEY, AdminActionMetadata, AdminActionInterceptor } from '../interceptors/admin-action.interceptor';

/**
 * @AdminAction decorator - Marks an endpoint as an admin action and enables audit logging
 * PR-04: Permissions & RBAC
 *
 * Usage:
 * @AdminAction({ action: 'reconcile_payments', description: 'Reconcile pending payments' })
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Roles(UserRole.ADMIN)
 * async myAdminEndpoint() { ... }
 *
 * Features:
 * - Automatically logs action to TrustAuditLog
 * - Records success/failure status
 * - Captures request context
 * - Flags failed actions for review
 */
export function AdminAction(metadata: AdminActionMetadata) {
  return applyDecorators(
    SetMetadata(ADMIN_ACTION_KEY, metadata),
    UseInterceptors(AdminActionInterceptor),
  );
}

