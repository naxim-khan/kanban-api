import { Reflector } from '@nestjs/core';
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Role } from '@generated/prisma';
import { ROLES_KEY } from '../decorators/roles.decorators';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest();

    // Admin bypass: Admins can access everything
    if (user?.role === Role.ADMIN) {
      return true;
    }

    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true;
    }

    const hasRole = requiredRoles.some((role) => user?.role === role);

    if (!hasRole) {
      // Changing from Unauthorized (401) to Forbidden (403)
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
