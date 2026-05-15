import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma, Role, Task } from '@generated/prisma';
import { PrismaService } from 'src/prisma/prisma.service';
import type { JwtPayload } from 'src/common/types/request.types';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';
import { QueryTasksDto } from './dto/query-tasks.dto';
import { buildTaskWhereInput } from './helpers/build-task-where-input.helper';
import {
  TASKS_DEFAULT_LIMIT,
  TASKS_DEFAULT_PAGE,
  TASKS_MAX_LIMIT,
} from './tasks.constants';

const taskInclude = {
  creator: {
    select: { id: true, name: true, email: true },
  },
  assignee: {
    select: { id: true, name: true, email: true },
  },
} as const;

type TaskWithRelations = Prisma.TaskGetPayload<{ include: typeof taskInclude }>;

type TaskAuthFields = Pick<Task, 'creatorId' | 'assigneeId'>;

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  private assertCanViewTask(task: TaskAuthFields, user: JwtPayload): void {
    if (user.role === Role.ADMIN) {
      return;
    }
    if (task.creatorId === user.sub) {
      return;
    }
    if (task.assigneeId === user.sub) {
      return;
    }
    throw new ForbiddenException('You do not have permission to view this task');
  }

  private assertCanEditTask(task: TaskAuthFields, user: JwtPayload): void {
    if (user.role === Role.ADMIN) {
      return;
    }
    if (task.creatorId === user.sub) {
      return;
    }
    throw new ForbiddenException('You do not have permission to edit this task');
  }

  private assertCanChangeTaskStatus(task: TaskAuthFields, user: JwtPayload): void {
    if (user.role === Role.ADMIN) {
      return;
    }
    if (task.creatorId === user.sub) {
      return;
    }
    if (task.assigneeId === user.sub) {
      return;
    }
    throw new ForbiddenException(
      'You do not have permission to change this task status',
    );
  }

  private async ensureAssigneeExists(assigneeId: string): Promise<void> {
    const assignee = await this.prisma.user.findUnique({
      where: { id: assigneeId },
    });
    if (!assignee) {
      throw new BadRequestException('Assignee not found');
    }
  }

  private buildListWhere(
    query: QueryTasksDto,
    user: JwtPayload,
  ): Prisma.TaskWhereInput {
    const filterWhere = buildTaskWhereInput(query);
    const clauses: Prisma.TaskWhereInput[] = [];

    if (Object.keys(filterWhere).length > 0) {
      clauses.push(filterWhere);
    }

    if (user.role !== Role.ADMIN) {
      clauses.push({
        OR: [{ creatorId: user.sub }, { assigneeId: user.sub }],
      });
    }

    if (clauses.length === 0) {
      return {};
    }
    if (clauses.length === 1) {
      return clauses[0];
    }
    return { AND: clauses };
  }

  async create(dto: CreateTaskDto, user: JwtPayload): Promise<TaskWithRelations> {
    if (dto.assigneeId) {
      await this.ensureAssigneeExists(dto.assigneeId);
    }

    return this.prisma.task.create({
      data: {
        title: dto.title,
        description: dto.description,
        status: dto.status,
        priority: dto.priority,
        dueDate: dto.dueDate,
        creatorId: user.sub,
        assigneeId: dto.assigneeId,
      },
      include: taskInclude,
    });
  }

  async findAll(query: QueryTasksDto, user: JwtPayload) {
    const where = this.buildListWhere(query, user);
    const page = query.page ?? TASKS_DEFAULT_PAGE;
    const rawLimit = query.limit ?? TASKS_DEFAULT_LIMIT;
    const limit = Math.min(Math.max(1, rawLimit), TASKS_MAX_LIMIT);
    const skip = (page - 1) * limit;
    const take = limit;

    const sortBy = query.sortBy ?? 'updatedAt';
    const sortOrder = query.sortOrder ?? 'desc';
    const orderBy = { [sortBy]: sortOrder } as Prisma.TaskOrderByWithRelationInput;

    // Avoid `$transaction` here: it waits for a dedicated transaction slot (P2028
    // when the pool is busy). Count + page do not need a single atomic snapshot.
    const [items, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        skip,
        take,
        orderBy,
        include: taskInclude,
      }),
      this.prisma.task.count({ where }),
    ]);

    return { items, total, page, limit, skip, take, sortBy, sortOrder };
  }

  async findOne(id: string, user: JwtPayload): Promise<TaskWithRelations> {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: taskInclude,
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    this.assertCanViewTask(task, user);
    return task;
  }

  async update(
    id: string,
    dto: UpdateTaskDto,
    user: JwtPayload,
  ): Promise<TaskWithRelations> {
    if (dto.status !== undefined) {
      throw new BadRequestException(
        'Status cannot be changed here. Use PATCH /tasks/:id/status instead.',
      );
    }

    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    this.assertCanEditTask(task, user);

    if (dto.assigneeId !== undefined && dto.assigneeId !== null) {
      await this.ensureAssigneeExists(dto.assigneeId);
    }

    const data: Prisma.TaskUncheckedUpdateInput = {};
    if (dto.title !== undefined) {
      data.title = dto.title;
    }
    if (dto.description !== undefined) {
      data.description = dto.description;
    }
    if (dto.priority !== undefined) {
      data.priority = dto.priority;
    }
    if (dto.dueDate !== undefined) {
      data.dueDate = dto.dueDate;
    }
    if (dto.assigneeId !== undefined) {
      data.assigneeId = dto.assigneeId;
    }

    return this.prisma.task.update({
      where: { id },
      data,
      include: taskInclude,
    });
  }

  async updateStatus(
    id: string,
    dto: UpdateTaskStatusDto,
    user: JwtPayload,
  ): Promise<TaskWithRelations> {
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    this.assertCanChangeTaskStatus(task, user);

    return this.prisma.task.update({
      where: { id },
      data: { status: dto.status },
      include: taskInclude,
    });
  }

  async remove(id: string, user: JwtPayload): Promise<TaskWithRelations> {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: taskInclude,
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    this.assertCanEditTask(task, user);

    return this.prisma.task.delete({
      where: { id },
      include: taskInclude,
    });
  }
}
