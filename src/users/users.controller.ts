import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import * as RequestTypes from 'src/common/types/request.types';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { AdminCreateUserDto } from './dto/admin-create-user.dto';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';

import { RolesGuard } from 'src/auth/guards/roles.guard';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { OwnershipGuard } from 'src/auth/guards/ownership.guard';
import { Roles } from 'src/auth/decorators/roles.decorators';
import { User } from 'src/auth/decorators/user.decorator';
import { Role } from '@generated/prisma';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({ summary: 'Create a new user (Admin only)' })
  @ApiResponse({ status: 201, description: 'User successfully created' })
  @ApiResponse({ status: 403, description: 'Forbidden' })

  // Admin-only endpoint to create new users
  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async create(@Body() adminCreateUserDto: AdminCreateUserDto) {
    return this.usersService.create(adminCreateUserDto);
  }

  // Admin-only endpoint to list all users
  @ApiOperation({ summary: 'List all users (Admin only)' })
  @ApiResponse({ status: 200, description: 'List of users' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @Get()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async findAll() {
    return this.usersService.findAll();
  }

  // Users can view their own profile, admins can view any profile
  @ApiOperation({ summary: 'Get a user by ID' })
  @ApiResponse({ status: 200, description: 'User details' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @Get(':id')
  @UseGuards(AuthGuard, OwnershipGuard)
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  // Users can update their own profile, admins can update any profile with all fields
  @ApiOperation({ summary: 'Update a user by ID' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @Put(':id')
  @UseGuards(AuthGuard, OwnershipGuard)
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto | AdminUpdateUserDto,
    @User() user: RequestTypes.JwtPayload,
  ) {
    // If user is admin, allow full update including role
    if (user.role === Role.ADMIN) {
      return this.usersService.adminUpdate(id, updateUserDto);
    }
    // Regular users can only update limited fields (no role)
    return this.usersService.update(id, updateUserDto as UpdateUserDto);
  }

  // Users can delete their own profile, admins can delete any profile
  @ApiOperation({ summary: 'Delete a user by ID' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @Delete(':id')
  @UseGuards(AuthGuard, OwnershipGuard)
  async remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
