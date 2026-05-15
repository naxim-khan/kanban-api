import { Injectable, NestMiddleware } from '@nestjs/common';
import { Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { AuthenticatedRequest } from '../types/request.types';

@Injectable()
export class UserContextMiddleware implements NestMiddleware {
  use(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const requestId = (req.headers['x-request-id'] as string) || randomUUID();

    // Set the ID in response headers for traceability
    res.setHeader('x-request-id', requestId);

    // Initialize the userContext object with basic metadata
    req.userContext = {
      requestId,
      ip: (req.ip ||
        req.headers['x-forwarded-for'] ||
        req.socket.remoteAddress) as string,
      userAgent: req.get('user-agent') || 'unknown',
      path: req.originalUrl,
      startTime: Date.now(),
      locale: (req.get('accept-language') || 'en-US').split(',')[0],
    };

    next();
  }
}
