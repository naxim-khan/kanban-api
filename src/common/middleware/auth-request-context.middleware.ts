import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Response } from 'express';
import * as jwt from 'jsonwebtoken';
import { AuthenticatedRequest } from '../types/request.types';

@Injectable()
export class AuthRequestContextMiddleware implements NestMiddleware {
  use(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const authHeader = req.headers?.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];

    // Attach token for later use in Guard or Logout
    req.accessToken = token;

    try {
      // Decode only (no verify, that's for the Guard)
      const payload = jwt.decode(token) as any;

      if (payload && req.userContext) {
        req.userContext.userId = payload.sub;
        req.userContext.role = payload.role;
      }
    } catch {
      // ignore decoding errors, the AuthGuard will handle verification
    }

    next();
  }
}
