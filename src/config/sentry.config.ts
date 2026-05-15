// src/config/sentry.config.ts
import { registerAs } from '@nestjs/config';

export default registerAs('sentry', () => ({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    debug: process.env.SENTRY_DEBUG === 'true',
    sampleRate: parseFloat(process.env.SENTRY_SAMPLE_RATE || '1.0'),
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '1.0'),
}));
