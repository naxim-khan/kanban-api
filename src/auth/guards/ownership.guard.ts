import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Role } from '@generated/prisma';

/**
 * OwnershipGuard ensures that users can only access their own resources
 * while admins can access any resource.
 *
 * This guard should be used on routes that include an :id parameter
 * to ensure users can only modify their own data.
 */
@Injectable()
export class OwnershipGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user; // Set by AuthGuard
    const resourceId = request.params.id; // User ID from URL params

    // If user is admin, allow access to any resource
    if (user?.role === Role.ADMIN) {
      return true;
    }

    // If user is not admin, they can only access their own resource
    if (user?.sub !== resourceId) {
      throw new ForbiddenException(
        'You do not have permission to access this resource',
      );
    }

    return true;
  }
}
