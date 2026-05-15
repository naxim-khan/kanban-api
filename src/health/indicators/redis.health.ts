import { Injectable, Inject } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

import { isRedisCacheConfigured } from '../../config/cache.config';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    if (!isRedisCacheConfigured()) {
      return this.getStatus(key, true, {
        message: 'Redis not configured; using in-memory cache',
      });
    }

    try {
      const testKey = '__health_check__';
      const testValue = Date.now().toString();

      await this.cacheManager.set(testKey, testValue, 1000);
      const retrieved = await this.cacheManager.get(testKey);

      if (retrieved === testValue) {
        return this.getStatus(key, true, { message: 'Redis is reachable' });
      }

      return this.getStatus(key, false, {
        message: 'Redis health check value mismatch',
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      return this.getStatus(key, false, { message: errorMessage });
    }
  }
}
