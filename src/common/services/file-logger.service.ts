import { Injectable, LoggerService } from '@nestjs/common';

/**
 * Structured request logging to stdout (Vercel/runtime logs).
 * No filesystem writes — serverless deploys cannot create dirs under /var/task.
 */
@Injectable()
export class FileLoggerService implements LoggerService {
  log(message: unknown, context?: string) {
    this.write('LOG', message, context);
  }

  error(message: unknown, trace?: string, context?: string) {
    this.write('ERROR', message, context, trace);
  }

  warn(message: unknown, context?: string) {
    this.write('WARN', message, context);
  }

  debug(_message: unknown, _context?: string) {
    // Intentionally quiet; HTTP middleware uses Nest Logger for debug.
  }

  verbose(_message: unknown, _context?: string) {
    // Intentionally quiet.
  }

  private write(
    level: string,
    message: unknown,
    context?: string,
    trace?: string,
  ) {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` [${context}]` : '';
    const traceStr = trace ? `\n${trace}` : '';
    const line = `[${timestamp}] ${level}${contextStr}: ${String(message)}${traceStr}`;

    switch (level) {
      case 'ERROR':
        console.error(line);
        break;
      case 'WARN':
        console.warn(line);
        break;
      default:
        console.log(line);
    }
  }
}
