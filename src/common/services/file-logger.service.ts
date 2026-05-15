import { Injectable, LoggerService } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class FileLoggerService implements LoggerService {
  private readonly logDir = path.join(process.cwd(), 'logs');
  private readonly logFile = path.join(this.logDir, 'app.log');

  constructor() {
    this.ensureLogDirExists();
  }

  private ensureLogDirExists() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  log(message: any, context?: string) {
    this.writeToFile('LOG', message, context);
  }

  error(message: any, trace?: string, context?: string) {
    this.writeToFile('ERROR', message, context, trace);
  }

  warn(message: any, context?: string) {
    this.writeToFile('WARN', message, context);
  }

  debug(message: any, context?: string) {
    // Only logged to console if needed, not file by default to avoid noise
  }

  verbose(message: any, context?: string) {
    // Only logged to console if needed
  }

  private async writeToFile(
    level: string,
    message: any,
    context?: string,
    trace?: string,
  ) {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` [${context}]` : '';
    const traceStr = trace ? `\n${trace}` : '';
    const formattedMessage = `[${timestamp}] ${level}${contextStr}: ${message}${traceStr}\n`;

    try {
      await fs.promises.appendFile(this.logFile, formattedMessage, 'utf8');
    } catch (error) {
      // Fallback to console if file logging fails to avoid losing critical logs
      console.error('Failed to write to log file:', error);
    }
  }
}
