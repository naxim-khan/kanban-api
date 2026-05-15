import path from 'path';
import { existsSync } from 'fs';
import type { IncomingMessage, ServerResponse } from 'http';
import type { INestApplication } from '@nestjs/common';
import type { Express } from 'express';

let expressApp: Express | undefined;

function resolveNestMainScript(): string {
  const candidates = [
    path.join(process.cwd(), 'dist/src/main.js'),
    path.join(__dirname, '..', 'dist', 'src', 'main.js'),
    path.join(__dirname, 'dist', 'src', 'main.js'),
  ];
  for (const filePath of candidates) {
    if (existsSync(filePath)) {
      return filePath;
    }
  }
  throw new Error(
    `Nest main bundle not found (tried: ${candidates.join(' | ')}). cwd=${process.cwd()} __dirname=${__dirname}`,
  );
}

/**
 * Vercel serverless entry: forward Node `req`/`res` to Nest’s Express instance.
 * Nest is built to `dist/src/main.js`; `createConfiguredApp` is exported from there.
 */
export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  try {
    if (!expressApp) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const nestMain = require(resolveNestMainScript()) as {
        createConfiguredApp: () => Promise<INestApplication>;
      };
      const nestApp = await nestMain.createConfiguredApp();
      await nestApp.init();
      expressApp = nestApp.getHttpAdapter().getInstance();
    }

    await new Promise<void>((resolve, reject) => {
      res.once('finish', () => resolve());
      res.once('error', reject);
      expressApp!(req, res);
    });
  } catch (err) {
    console.error('[api] handler error', err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('content-type', 'application/json; charset=utf-8');
      res.end(
        JSON.stringify({
          statusCode: 500,
          message: 'Internal server error',
        }),
      );
    }
  }
}
