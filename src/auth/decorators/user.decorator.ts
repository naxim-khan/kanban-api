import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Custom decorator to extract the authenticated user from the request
 * Usage: @User() user: { sub: string, email: string, role: string }
 *
 * This decorator retrieves the user payload that was attached to the request
 * by the AuthGuard after JWT verification.
 */
export const User = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
