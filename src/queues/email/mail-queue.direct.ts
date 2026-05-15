import { Injectable, Logger } from '@nestjs/common';
import { MailService } from './mail.service';

/** Sends welcome email inline when Bull/Redis is not configured. */
@Injectable()
export class DirectMailQueue {
  private readonly logger = new Logger(DirectMailQueue.name);

  constructor(private readonly mailService: MailService) {}

  async addWelcomeEmailJob(to: string, name: string) {
    try {
      this.logger.log(`Sending welcome email directly to ${to} (no Redis queue).`);
      await this.mailService.sendWelcomeEmail(to, name);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Welcome email failed for ${to}: ${message}`);
    }
  }
}
