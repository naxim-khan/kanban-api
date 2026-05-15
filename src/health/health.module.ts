import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { PrismaHealthIndicator } from './indicators/prisma.health';
import { RedisHealthIndicator } from './indicators/redis.health';
import { PrismaModule } from '../prisma/prisma.module';

/**
 * HealthModule
 *
 * Production-grade health check module using @nestjs/terminus.
 *
 * Provides:
 * - Liveness endpoint for uptime monitoring
 * - Readiness endpoint for dependency verification
 * - Custom health indicators for Prisma and Redis
 */
@Module({
  imports: [TerminusModule, PrismaModule],
  controllers: [HealthController],
  providers: [PrismaHealthIndicator, RedisHealthIndicator],
})
export class HealthModule {}
