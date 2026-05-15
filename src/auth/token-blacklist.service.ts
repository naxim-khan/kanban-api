import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

@Injectable()
export class TokenBlacklistService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  // Add a token to the blacklist with a specific TTL (e.g., remaining lifetime of JWT)
  // Default to 1 hour (3600000 ms) if not specified
  async add(token: string, ttlMs: number = 3600000) {
    // cache-manager TTL unit depends on store; we keep the existing convention (ms)
    // and ensure we never set negative TTLs.
    const safeTtlMs = Math.max(0, ttlMs);
    await this.cacheManager.set(`blacklist:${token}`, true, safeTtlMs);
  }

  // Check if a token is blacklisted
  async isBlacklisted(token: string): Promise<boolean> {
    const isBlacklisted = await this.cacheManager.get(`blacklist:${token}`);
    return !!isBlacklisted;
  }
}
