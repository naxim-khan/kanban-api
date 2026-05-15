import { Module, Global, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { createCache } from 'cache-manager';
import Keyv from 'keyv';
import KeyvRedis from '@keyv/redis';

import { isRedisCacheConfigured } from '../config/redis-options';

function createMemoryCache() {
  const keyv = new Keyv({ namespace: 'cache' });
  return createCache({ stores: [keyv as any] });
}

@Global()
@Module({
  providers: [
    {
      provide: CACHE_MANAGER,
      useFactory: async (config: ConfigService) => {
        const logger = new Logger('GlobalCacheModule');

        if (!isRedisCacheConfigured()) {
          logger.log(
            '[CACHE] Redis not configured (set REDIS_URL or REDIS_HOST); using in-memory cache.',
          );
          return createMemoryCache();
        }

        const redisUrl =
          process.env.REDIS_URL?.trim() ||
          `redis://${config.get('cache.host')}:${config.get('cache.port')}`;

        try {
          const store = new KeyvRedis(redisUrl);
          const keyv = new Keyv({ store, namespace: 'cache' });
          return createCache({ stores: [keyv as any] });
        } catch (error) {
          logger.warn(
            '[CACHE] Redis configured but failed to initialize; using in-memory cache.',
            error,
          );
          return createMemoryCache();
        }
      },
      inject: [ConfigService],
    },
  ],
  exports: [CACHE_MANAGER],
})
export class GlobalCacheModule {}
