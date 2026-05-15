import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import * as RequestTypes from 'src/common/types/request.types';
import { AuthGuard } from '../auth/guards/auth.guard';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';
import { QueryTasksDto } from './dto/query-tasks.dto';

@ApiTags('Tasks')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @ApiOperation({ summary: 'Create a task' })
  @ApiResponse({ status: 201, description: 'Task created' })
  @Post()
  create(
    @Body() createTaskDto: CreateTaskDto,
    @Req() req: RequestTypes.AuthenticatedRequest,
  ) {
    return this.tasksService.create(createTaskDto, req.user);
  }

  @ApiOperation({ summary: 'List tasks (filtered, paginated)' })
  @ApiResponse({ status: 200, description: 'Paginated task list' })
  @Get()
  findAll(
    @Query() query: QueryTasksDto,
    @Req() req: RequestTypes.AuthenticatedRequest,
  ) {
    return this.tasksService.findAll(query, req.user);
  }

  @ApiOperation({ summary: 'Get task by id' })
  @ApiResponse({ status: 200, description: 'Task details' })
  @ApiResponse({ status: 404, description: 'Not found' })
  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Req() req: RequestTypes.AuthenticatedRequest,
  ) {
    return this.tasksService.findOne(id, req.user);
  }

  @ApiOperation({ summary: 'Update task status' })
  @ApiResponse({ status: 200, description: 'Status updated' })
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() updateTaskStatusDto: UpdateTaskStatusDto,
    @Req() req: RequestTypes.AuthenticatedRequest,
  ) {
    return this.tasksService.updateStatus(id, updateTaskStatusDto, req.user);
  }

  @ApiOperation({ summary: 'Update task (not status)' })
  @ApiResponse({ status: 200, description: 'Task updated' })
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateTaskDto: UpdateTaskDto,
    @Req() req: RequestTypes.AuthenticatedRequest,
  ) {
    return this.tasksService.update(id, updateTaskDto, req.user);
  }

  @ApiOperation({ summary: 'Delete task' })
  @ApiResponse({ status: 200, description: 'Task deleted' })
  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Req() req: RequestTypes.AuthenticatedRequest,
  ) {
    return this.tasksService.remove(id, req.user);
  }
}
