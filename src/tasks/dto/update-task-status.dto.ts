import { IsEnum } from 'class-validator';
import { TaskStatus } from '@generated/prisma';

export class UpdateTaskStatusDto {
  @IsEnum(TaskStatus)
  status: TaskStatus;
}
