// src/config/index.ts
import { registerAs } from '@nestjs/config';
import databaseConfig from './database.config';
import jwtConfig from './jwt.config';
import cacheConfig from './cache.config';
import mailConfig from './mail.config';
import sentryConfig from './sentry.config';

export const appConfig = registerAs('app', () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  env: process.env.NODE_ENV,
}));

export default [
  appConfig,
  databaseConfig,
  jwtConfig,
  cacheConfig,
  mailConfig,
  sentryConfig,
];
