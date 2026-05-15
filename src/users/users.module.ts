import { Module, forwardRef } from '@nestjs/common';

import { PrismaModule } from 'src/prisma/prisma.module';
import { AuthModule } from 'src/auth/auth.module';
import { UsersService } from './users.service';

import { UsersController } from './users.controller';

@Module({
  imports: [PrismaModule, forwardRef(() => AuthModule)],

  providers: [UsersService],

  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
