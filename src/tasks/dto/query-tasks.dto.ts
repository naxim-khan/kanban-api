import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TaskPriority, TaskStatus } from '@generated/prisma';
import { TASKS_MAX_LIMIT } from '../tasks.constants';

const TASK_SORT_BY_FIELDS = [
  'updatedAt',
  'createdAt',
  'dueDate',
  'priority',
  'status',
] as const;

type TaskSortBy = (typeof TASK_SORT_BY_FIELDS)[number];
type SortOrder = 'asc' | 'desc';

export class QueryTasksDto {
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @IsOptional()
  @IsUUID('4')
  creatorId?: string;

  @IsOptional()
  @IsUUID('4')
  assigneeId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(TASKS_MAX_LIMIT)
  limit?: number;

  @IsOptional()
  @IsIn(TASK_SORT_BY_FIELDS)
  sortBy?: TaskSortBy;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: SortOrder;
}
