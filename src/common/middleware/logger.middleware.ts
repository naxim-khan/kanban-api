// Typical things it can log
// HTTP method(GET, POST, e-t-c.)
// URL (/user/123)
// request body (optional, usually via interceptor or after response)
// Query Parameters
// User Context if (available)
// IP Address
// User Agent

import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { FileLoggerService } from '../services/file-logger.service';
import { Response, NextFunction } from 'express';

import { AuthenticatedRequest } from '../types/request.types';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  constructor(private readonly fileLogger: FileLoggerService) {}

  use(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
    const { method, originalUrl, userContext } = req;

    res.on('finish', () => {
      const { statusCode } = res;
      const duration = Date.now() - userContext.startTime;
      const requestId = userContext.requestId;
      const userIdentifier = userContext.userId
        ? `[User: ${userContext.userId}]`
        : '[Guest]';

      const logMessage = `[${requestId}] ${method} ${originalUrl} ${statusCode} - ${duration}ms ${userIdentifier} - ${userContext.ip}`;

      if (statusCode >= 500) {
        this.logger.error(logMessage);
        this.fileLogger.error(logMessage, undefined, 'HTTP');
      } else if (statusCode >= 400) {
        this.logger.warn(logMessage);
        this.fileLogger.warn(logMessage, 'HTTP');
      } else {
        this.logger.log(logMessage);
      }

      // Log Query parameters for debugging if they exist
      if (Object.keys(req.query).length > 0) {
        this.logger.debug(`[${requestId}] Query: ${JSON.stringify(req.query)}`);
      }
    });

    next();
  }
}
