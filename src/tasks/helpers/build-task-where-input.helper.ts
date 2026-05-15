import type { Prisma } from '@generated/prisma';
import type { QueryTasksDto } from '../dto/query-tasks.dto';

/**
 * Builds Prisma where input from query filters only (no visibility / auth).
 */
export function buildTaskWhereInput(
  query: QueryTasksDto,
): Prisma.TaskWhereInput {
  const clauses: Prisma.TaskWhereInput[] = [];

  if (query.status !== undefined) {
    clauses.push({ status: query.status });
  }
  if (query.priority !== undefined) {
    clauses.push({ priority: query.priority });
  }
  if (query.creatorId !== undefined) {
    clauses.push({ creatorId: query.creatorId });
  }
  if (query.assigneeId !== undefined) {
    clauses.push({ assigneeId: query.assigneeId });
  }

  if (clauses.length === 0) {
    return {};
  }
  if (clauses.length === 1) {
    return clauses[0];
  }
  return { AND: clauses };
}
