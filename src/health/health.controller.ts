import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaHealthIndicator } from './indicators/prisma.health';
import { RedisHealthIndicator } from './indicators/redis.health';
import { isRedisCacheConfigured } from '../config/cache.config';

/**
 * HealthController
 *
 * Provides production-ready health check endpoints for monitoring and orchestration.
 *
 * Endpoints:
 * - GET /health         → Liveness probe (simple uptime check)
 * - GET /health/ready   → Readiness probe (dependency health verification)
 */
@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaHealth: PrismaHealthIndicator,
    private readonly redisHealth: RedisHealthIndicator,
  ) {}

  @ApiOperation({ summary: 'Simple liveness check' })
  @Get()
  getLiveness() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  @ApiOperation({ summary: 'Full readiness check for dependencies' })
  @Get('ready')
  @HealthCheck()
  getReadiness() {
    const checks = [() => this.prismaHealth.isHealthy('database')];

    if (isRedisCacheConfigured()) {
      checks.push(() => this.redisHealth.isHealthy('redis'));
    }

    return this.health.check(checks);
  }
}
