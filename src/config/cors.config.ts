import { registerAs } from '@nestjs/config';

export function parseCorsOrigins(raw?: string): string[] {
  if (!raw?.trim()) {
    return [];
  }
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export default registerAs('cors', () => ({
  origins: parseCorsOrigins(process.env.CORS_ORIGINS),
  credentials: process.env.CORS_CREDENTIALS === 'true',
  methods: (
    process.env.CORS_METHODS ?? 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS'
  )
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean),
}));
