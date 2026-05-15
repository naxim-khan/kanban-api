import { Module, NestModule, MiddlewareConsumer, Logger } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { GlobalCacheModule } from './common/global-cache.module';
import { MailModule } from './queues/email/mail.module';
import { BullDashboardModule } from './queues/dashboard/bull-dashboard.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from './common/throttler-storage-redis.service';
import { SentryModule } from '@sentry/nestjs/setup';

import configuration from './config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { TasksModule } from './tasks/tasks.module';
import { HealthModule } from './health/health.module';

// Middleware
import { UserContextMiddleware } from './common/middleware/user-context.middleware';
import { AuthRequestContextMiddleware } from './common/middleware/auth-request-context.middleware';
import { LoggerMiddleware } from './common/middleware/logger.middleware';
import { AdminAuthMiddleware } from './common/middleware/admin-auth.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: configuration,
    }),
    SentryModule.forRoot(),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const logger = new Logger('BullModule');
        const redisOptions = {
          host: config.get('cache.host'),
          port: config.get('cache.port'),
        };
        logger.log(
          `📡 [Bull] Connecting to Redis at ${redisOptions.host}:${redisOptions.port}`,
        );
        return {
          redis: {
            ...redisOptions,
            lazyConnect: true,
            maxRetriesPerRequest: null,
          },
        };
      },
    }),
    GlobalCacheModule,
    MailModule,
    BullDashboardModule,
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [{ ttl: 60000, limit: 100 }], // 100 requests per minute by default
        storage: new ThrottlerStorageRedisService({
          host: config.get('cache.host'),
          port: config.get('cache.port'),
          lazyConnect: true,
          maxRetriesPerRequest: null,
        }),
      }),
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
