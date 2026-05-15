import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Inject,
  Logger,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto/create-user.dto';
import { AdminCreateUserDto } from './dto/admin-create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

import type { User } from '@generated/prisma';
import { sanitizeUser, hashPassword } from './utils/user.utils';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { MailQueue } from 'src/queues/email/mail.queue';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private mailQueue: MailQueue,
  ) {}

  // Raw user creation method for AuthService only
  async createRaw(
    createUserDto: CreateUserDto | AdminCreateUserDto,
  ): Promise<User> {
    try {
      const hashed = await hashPassword(createUserDto.password);
      // invalidate cached users list
      await this.cacheManager.del('users');
      const user = await this.prisma.user.create({
        data: {
          ...createUserDto,
          password: hashed,
        },
      });

      // Enqueue welcome email
      await this.mailQueue.addWelcomeEmailJob(user.email, user.name);

      return user;
    } catch (error) {
      if (error.code === 'P2002') {
        throw new BadRequestException('User with this email already exists');
      }
      throw error;
    }
  }

  async create(createUserDto: CreateUserDto | AdminCreateUserDto) {
    try {
      const data: any = { ...createUserDto };
      if (data.role) {
        data.role = data.role.toUpperCase();
      }
      const hashed = await hashPassword(data.password);
      const user = await this.prisma.user.create({
        data: {
          ...data,
          password: hashed,
        },
      });

      // Enqueue welcome email
      await this.mailQueue.addWelcomeEmailJob(user.email, user.name);

      // invalidate cached users list
      await this.cacheManager.del('users');
      return sanitizeUser(user);
    } catch (error) {
      if (error.code === 'P2002') {
        throw new BadRequestException('User with this email already exists');
      }
      throw error;
    }
  }

  async findAll() {
    // get users from cache first
    const CacheKey = 'users';

    try {
      const cachedUsers = await this.cacheManager.get<User[]>(CacheKey);
      if (cachedUsers) {
        this.logger.log('Users served from cache.');
        return cachedUsers;
      }
    } catch (err) {
      this.logger.error('Cache GET error:', err);
    }

    // fetched from db
    const users = await this.prisma.user.findMany();

    // sanitze users
    const sanitized = users.map((u: User) => sanitizeUser(u));

    // store in cache for 300 seconds (5 minutes)
    await this.cacheManager.set(CacheKey, sanitized, 300000);

    return sanitized;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    if (!user) throw new NotFoundException(`User with id ${id} not found`);
    return sanitizeUser(user);
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException(`User with id ${id} not found`);

    // Explicitly prevent role updates in regular update method
    const { name, password } = updateUserDto;
    const data: any = {};

    if (name !== undefined) data.name = name;
    if (password) data.password = await hashPassword(password);

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data,
    });
    // invalidate cached users list
    await this.cacheManager.del('users');
    return sanitizeUser(updatedUser);
  }

  // Admin-only update method that can modify all fields including role
  async adminUpdate(id: string, updateUserDto: any) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException(`User with id ${id} not found`);

    const data: any = {};
    const allowedFields = ['name', 'email', 'password', 'role'];

    // Only include allowed fields from the DTO
    for (const field of allowedFields) {
      if (updateUserDto[field] !== undefined) {
        if (field === 'role' && typeof updateUserDto[field] === 'string') {
          data[field] = updateUserDto[field].toUpperCase();
        } else {
          data[field] = updateUserDto[field];
        }
      }
    }

    if (data.password) {
      data.password = await hashPassword(data.password);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data,
    });
    // invalidate cached users list
    await this.cacheManager.del('users');
    return sanitizeUser(updatedUser);
  }

  async remove(id: string) {
    try {
      const user = await this.prisma.user.delete({
        where: { id },
      });
      // invalidate cached users list
      await this.cacheManager.del('users');

      return sanitizeUser(user);
    } catch (error) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
  }

  async incrementFailedAttempts(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { failedLoginAttempts: { increment: 1 } },
    });
  }

  async resetFailedAttempts(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { failedLoginAttempts: 0, lockUntil: null },
    });
  }

  async lockAccount(id: string, lockDurationMinutes: number) {
    const lockUntil = new Date();
    lockUntil.setMinutes(lockUntil.getMinutes() + lockDurationMinutes);
    return this.prisma.user.update({
      where: { id },
      data: { lockUntil },
    });
  }
}
