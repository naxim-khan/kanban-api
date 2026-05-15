import type { JwtPayload } from 'src/common/types/request.types';

/** Authenticated user passed from JWT (AuthGuard). */
export type TaskAuthUser = JwtPayload;
