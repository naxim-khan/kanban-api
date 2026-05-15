import { Module, NestModule, MiddlewareConsumer, Logger } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { GlobalCacheModule } from './common/global-cache.module';
import { BullDashboardModule } from './queues/dashboard/bull-dashboard.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from './common/throttler-storage-redis.service';
import { SentryModule } from '@sentry/nestjs/setup';

import configuration from './config';
import {
  getRedisConnectionOptions,
  isRedisCacheConfigured,
} from './config/redis-options';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { TasksModule } from './tasks/tasks.module';
import { HealthModule } from './health/health.module';
import { MailModule } from './queues/email/mail.module';

import { UserContextMiddleware } from './common/middleware/user-context.middleware';
import { AuthRequestContextMiddleware } from './common/middleware/auth-request-context.middleware';
import { LoggerMiddleware } from './common/middleware/logger.middleware';
import { AdminAuthMiddleware } from './common/middleware/admin-auth.middleware';

const redisImports = isRedisCacheConfigured()
  ? [
      BullModule.forRootAsync({
        inject: [ConfigService],
        useFactory: (config: ConfigService) => {
          const logger = new Logger('BullModule');
          const redis = getRedisConnectionOptions(config);
          logger.log(
            `[Bull] Redis queue enabled (${typeof redis === 'string' ? 'REDIS_URL' : `${redis.host}:${redis.port}`})`,
          );
          return { redis };
        },
      }),
      BullDashboardModule,
    ]
  : [];

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: configuration,
    }),
    SentryModule.forRoot(),
    ...redisImports,
    GlobalCacheModule,
    MailModule.register(),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const throttlers = [{ ttl: 60000, limit: 100 }];
        if (!isRedisCacheConfigured()) {
          return { throttlers };
        }
        return {
          throttlers,
          storage: new ThrottlerStorageRedisService(
            getRedisConnectionOptions(config),
          ),
        };
      },
    }),
    UsersModule,
    AuthModule,
    PrismaModule,
    CommonModule,
    TasksModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(
        UserContextMiddleware,
        AuthRequestContextMiddleware,
        LoggerMiddleware,
      )
      .forRoutes('*');

    consumer.apply(AdminAuthMiddleware).forRoutes('/admin/queues');
  }
}
