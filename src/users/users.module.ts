import { Module, forwardRef } from '@nestjs/common';

import { PrismaModule } from 'src/prisma/prisma.module';
import { AuthModule } from 'src/auth/auth.module';
import { UsersService } from './users.service';

import { UsersAssignableController } from './users-assignable.controller';
import { UsersController } from './users.controller';

@Module({
  imports: [PrismaModule, forwardRef(() => AuthModule)],

  providers: [UsersService],

  controllers: [UsersAssignableController, UsersController],
  exports: [UsersService],
})
export class UsersModule {}
