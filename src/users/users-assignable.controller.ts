import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AuthGuard } from 'src/auth/guards/auth.guard';
import { UsersService } from './users.service';

/** Top-level path — avoids any collision with `GET /users/:id`. */
@ApiTags('Users')
@ApiBearerAuth()
@Controller('assignable-users')
export class UsersAssignableController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({
    summary: 'List users for task assignment (authenticated)',
  })
  @ApiResponse({ status: 200, description: 'Id, name, email per user' })
  @Get()
  @UseGuards(AuthGuard)
  findAssignable() {
    return this.usersService.findAssignable();
  }
}
