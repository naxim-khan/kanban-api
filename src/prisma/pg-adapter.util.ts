import { PrismaPg } from '@prisma/adapter-pg';

/** Matches `PrismaPg` constructor (`string | Pool | PoolConfig` from adapter-pg's bundled `pg`). */
type PrismaPgPoolInput = ConstructorParameters<typeof PrismaPg>[0];

/**
 * Neon / managed Postgres often need explicit SSL on the `pg` pool.
 * Pass pool options as config (not `new Pool(...)`) — adapter-pg creates the pool internally.
 */
export function createPrismaPgAdapter(connectionString: string): PrismaPg {
  const isLocal =
    /@(localhost|127\.0\.0\.1)(:\d+)?\//.test(connectionString) ||
    connectionString.includes('host=localhost');

  const poolConfig = {
    connectionString,
    connectionTimeoutMillis: 15_000,
    max: 10,
    ...(isLocal ? {} : { ssl: { rejectUnauthorized: false } }),
  } satisfies Record<string, unknown>;

  return new PrismaPg(poolConfig as PrismaPgPoolInput);
}
