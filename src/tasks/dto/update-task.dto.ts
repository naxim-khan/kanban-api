import {
  IntersectionType,
  OmitType,
  PartialType,
} from '@nestjs/mapped-types';
import { IsOptional, IsUUID, ValidateIf } from 'class-validator';
import { CreateTaskDto } from './create-task.dto';

class UpdateTaskAssigneePart {
  /** Pass `null` to unassign; omit to leave unchanged. */
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsUUID('4')
  assigneeId?: string | null;
}

export class UpdateTaskDto extends IntersectionType(
  PartialType(OmitType(CreateTaskDto, ['assigneeId'] as const)),
  UpdateTaskAssigneePart,
) {}
