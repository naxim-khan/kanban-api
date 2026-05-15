import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaHealthIndicator } from './indicators/prisma.health';
import { RedisHealthIndicator } from './indicators/redis.health';

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

  /**
   * Liveness Check
   *
   * Simple endpoint that returns immediately without checking dependencies.
   *
   * Use Cases:
   * - Kubernetes livenessProbe
   * - Load balancer health checks
   * - Uptime monitoring services
   *
   * Returns: { status: "ok", timestamp: "ISO_TIMESTAMP" }
   * HTTP Status: Always 200 OK
   */
  @ApiOperation({ summary: 'Simple liveness check' })
  @Get()
  getLiveness() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Readiness Check
   *
   * Comprehensive health check that verifies all critical dependencies.
   *
   * Checks:
   * - Database connectivity (Prisma)
   * - Cache connectivity (Redis)
   *
   * Use Cases:
   * - Kubernetes readinessProbe
   * - CI/CD deployment validation
   * - Service mesh health verification
   *
   * Returns: Terminus health check result with detailed status
   * HTTP Status: 200 OK if healthy, 503 Service Unavailable if any dependency is down
   */
  @ApiOperation({ summary: 'Full readiness check for dependencies' })
  @Get('ready')
  @HealthCheck()
  getReadiness() {
    return this.health.check([
      () => this.prismaHealth.isHealthy('database'),
      () => this.redisHealth.isHealthy('redis'),
    ]);
  }
}
