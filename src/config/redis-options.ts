import type { ConfigService } from '@nestjs/config';
import type { RedisOptions } from 'ioredis';

import { isRedisCacheConfigured } from './cache.config';

export { isRedisCacheConfigured };

export function getRedisConnectionOptions(
  config: ConfigService,
): string | RedisOptions {
  const url = process.env.REDIS_URL?.trim();
  if (url) {
    return url;
  }

  return {
    host: config.get<string>('cache.host'),
    port: config.get<number>('cache.port'),
    lazyConnect: true,
    maxRetriesPerRequest: null,
    enableOfflineQueue: false,
  };
}
