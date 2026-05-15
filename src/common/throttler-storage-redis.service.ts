import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import Redis, { Cluster, RedisOptions } from 'ioredis';

/**
 * Redis-backed {@link ThrottlerStorage} (same Lua approach as @nest-lab/throttler-storage-redis).
 * Kept in-repo so TypeScript `nodenext` resolution works without that package's legacy `main` layout.
 */
@Injectable()
export class ThrottlerStorageRedisService
  implements ThrottlerStorage, OnModuleDestroy
{
  private readonly scriptSrc: string;
  readonly redis: Redis | Cluster;
  private disconnectRequired = false;

  constructor(redisOrOptions?: Redis | Cluster | RedisOptions | string) {
    if (redisOrOptions instanceof Redis || redisOrOptions instanceof Cluster) {
      this.redis = redisOrOptions;
    } else if (typeof redisOrOptions === 'string') {
      this.redis = new Redis(redisOrOptions);
      this.disconnectRequired = true;
    } else {
      this.redis =
        redisOrOptions === undefined
          ? new Redis()
          : new Redis(redisOrOptions);
      this.disconnectRequired = true;
    }
    this.scriptSrc = ThrottlerStorageRedisService.buildScriptSrc();
  }

  private static buildScriptSrc(): string {
    // Credits to wyattjoh for the fast implementation (rate-limit-redis).
    return `
      local hitKey = KEYS[1]
      local blockKey = KEYS[2]
      local throttlerName = ARGV[1]
      local ttl = tonumber(ARGV[2])
      local limit = tonumber(ARGV[3])
      local blockDuration = tonumber(ARGV[4])

      local totalHits = redis.call('INCR', hitKey)
      local timeToExpire = redis.call('PTTL', hitKey)
      
      if timeToExpire <= 0 then
        redis.call('PEXPIRE', hitKey, ttl)
        timeToExpire = ttl
      end

      local isBlocked = redis.call('GET', blockKey)
      local timeToBlockExpire = 0

      if isBlocked then
        timeToBlockExpire = redis.call('PTTL', blockKey)
      elseif totalHits > limit then
        redis.call('SET', blockKey, 1, 'PX', blockDuration)
        isBlocked = '1'
        timeToBlockExpire = blockDuration
      end

      if isBlocked and timeToBlockExpire <= 0 then
        redis.call('DEL', blockKey)
        redis.call('SET', hitKey, 1, 'PX', ttl)
        totalHits = 1
        timeToExpire = ttl
        isBlocked = false
      end

      return { totalHits, timeToExpire, isBlocked and 1 or 0, timeToBlockExpire }
    `
      .replace(/^\s+/gm, '')
      .trim();
  }

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ) {
    const prefix = this.redis.options.keyPrefix ?? '';
    const hitKey = `${prefix}{${key}:${throttlerName}}:hits`;
    const blockKey = `${prefix}{${key}:${throttlerName}}:blocked`;
    const results = (await this.redis.call(
      'EVAL',
      this.scriptSrc,
      2,
      hitKey,
      blockKey,
      throttlerName,
      ttl,
      limit,
      blockDuration,
    )) as unknown;

    if (!Array.isArray(results)) {
      throw new TypeError(
        `Expected result to be array of values, got ${String(results)}`,
      );
    }
    const [totalHits, timeToExpire, isBlocked, timeToBlockExpire] = results;
    if (typeof totalHits !== 'number') {
      throw new TypeError('Expected totalHits to be a number');
    }
    if (typeof timeToExpire !== 'number') {
      throw new TypeError('Expected timeToExpire to be a number');
    }
    if (typeof isBlocked !== 'number') {
      throw new TypeError('Expected isBlocked to be a number');
    }
    if (typeof timeToBlockExpire !== 'number') {
      throw new TypeError('Expected timeToBlockExpire to be a number');
    }
    return {
      totalHits,
      timeToExpire: Math.ceil(timeToExpire / 1000),
      isBlocked: isBlocked === 1,
      timeToBlockExpire: Math.ceil(timeToBlockExpire / 1000),
    };
  }

  onModuleDestroy(): void {
    if (this.disconnectRequired) {
      this.redis?.disconnect(false);
    }
  }
}
