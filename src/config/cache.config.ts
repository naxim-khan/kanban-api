import { registerAs } from '@nestjs/config';

/** HTTP cache (Keyv) uses Redis only when this is true; otherwise in-memory. */
export function isRedisCacheConfigured(): boolean {
  const url = process.env.REDIS_URL?.trim();
  const host = process.env.REDIS_HOST?.trim();
  return Boolean(url || host);
}

export default registerAs('cache', () => ({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  ttl: parseInt(process.env.CACHE_TTL || '60', 10), // seconds
}));
