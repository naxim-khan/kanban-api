import { Request } from 'express';

export interface UserContext {
  userId?: string;
  role?: string;
  requestId: string;
  ip: string;
  userAgent: string;
  path: string;
  startTime: number;
  locale: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest extends Request {
  userContext: UserContext;
  accessToken?: string;
  user: JwtPayload;
}
