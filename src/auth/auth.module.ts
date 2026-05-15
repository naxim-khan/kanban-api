// src/auth/auth.module.ts
import { Module, forwardRef } from '@nestjs/common';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthGuard } from './guards/auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { OwnershipGuard } from './guards/ownership.guard';
import { TokenBlacklistService } from './token-blacklist.service';

import { UsersModule } from 'src/users/users.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    forwardRef(() => UsersModule),

    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.secret') || 'dev_secret',
        signOptions: {
          expiresIn: (config.get<string>('jwt.expiresIn') || '1h') as any,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthGuard,
    RolesGuard,
    OwnershipGuard,
    TokenBlacklistService,
  ],
  exports: [
    AuthService,
    AuthGuard,
    RolesGuard,
    OwnershipGuard,
    TokenBlacklistService,
    JwtModule,
  ],
})
export class AuthModule {}
