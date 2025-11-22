import { Injectable, CanActivate, ExecutionContext, Logger, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<UserRole[]>('roles', context.getHandler());
    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      this.logger.warn('RolesGuard: No user found in request');
      throw new ForbiddenException('Authentification requise');
    }

    const hasRole = requiredRoles.includes(user.role);
    
    // Debug log temporaire
    this.logger.debug(`RolesGuard check: user.sub=${user.sub}, user.role=${user.role}, requiredRoles=${requiredRoles.join(',')}, decision=${hasRole ? 'ALLOWED' : 'DENIED'}`);

    if (!hasRole) {
      this.logger.warn(`RolesGuard: Access denied for user ${user.sub} with role ${user.role}. Required: ${requiredRoles.join(',')}`);
      
      // Retourner un message clair selon les rôles requis
      const roleNames = requiredRoles.map(r => {
        if (r === UserRole.WORKER) return 'workers';
        if (r === UserRole.EMPLOYER) return 'employers';
        return r.toLowerCase();
      });
      
      throw new ForbiddenException(`Accès réservé aux ${roleNames.join(' et ')} WorkOn`);
    }

    return hasRole;
  }
}

