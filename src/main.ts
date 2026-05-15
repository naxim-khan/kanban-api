import * as Sentry from '@sentry/nestjs';
import {
  Logger,
  type INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { getQueueToken } from '@nestjs/bull';
import compression from 'compression';
import helmet from 'helmet';

import { isRedisCacheConfigured } from './config/cache.config';
import { AppModule } from './app.module';
import { HttpErrorFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { BullDashboardModule } from './queues/dashboard/bull-dashboard.module';

/** Used by Vercel `api/index.ts`; local server only runs when this file is the Node entrypoint. */
export async function createConfiguredApp(): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  Sentry.init({
    dsn: configService.get('sentry.dsn'),
    environment: configService.get('sentry.environment'),
    debug: configService.get('sentry.debug'),
    sampleRate: configService.get('sentry.sampleRate'),
    tracesSampleRate: configService.get('sentry.tracesSampleRate'),
  });

  app.use(helmet());

  const allowedOrigins =
    configService.get<string>('CORS_ORIGINS')?.split(',') || '*';
  app.enableCors({
    origin: allowedOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });
  app.use(compression());

  app.setGlobalPrefix('api');

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new HttpErrorFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  const config = new DocumentBuilder()
    .setTitle('Task Management API')
    .setDescription('The API documentation for the Task Management App.')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  if (isRedisCacheConfigured()) {
    const mailQueue = app.get(getQueueToken('mail'));
    BullDashboardModule.setupDashboard(app, [mailQueue]);
  }

  return app;
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await createConfiguredApp();
  const configService = app.get(ConfigService);
  const port = configService.getOrThrow('app.port');
  await app.listen(port);
  logger.log(`🚀 Application is running on: http://localhost:${port}/api`);
  logger.log(
    `📝 Swagger documentation available at: http://localhost:${port}/api/docs`,
  );
}

if (typeof require !== 'undefined' && require.main === module) {
  void bootstrap();
}
