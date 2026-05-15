import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@generated/prisma';
import { TokenBlacklistService } from 'src/auth/token-blacklist.service';
import * as RequestTypes from 'src/common/types/request.types';

@Injectable()
export class AdminAuthMiddleware implements NestMiddleware {
  constructor(
    private jwtService: JwtService,
    private tokenBlacklistService: TokenBlacklistService,
  ) {}

  async use(
    req: RequestTypes.AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Authentication required');
    }

    const token = authHeader.split(' ')[1];

    if (await this.tokenBlacklistService.isBlacklisted(token)) {
      throw new UnauthorizedException('Token has been revoked');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token);
      if (payload.role !== Role.ADMIN) {
        throw new ForbiddenException('Admin access required');
      }
      req.user = payload;
      next();
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
