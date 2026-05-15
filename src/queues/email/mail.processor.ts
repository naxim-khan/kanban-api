import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { MailService } from './mail.service';

@Processor('mail')
export class MailProcessor {
  private readonly logger = new Logger(MailProcessor.name);

  constructor(private readonly mailService: MailService) {}

  @Process('welcome')
  async handleWelcomeEmail(job: Job<{ to: string; name: string }>) {
    this.logger.log(`Processing 'welcome' job for ${job.data.to}`);
    try {
      await this.mailService.sendWelcomeEmail(job.data.to, job.data.name);
      this.logger.log(`Completed 'welcome' job for ${job.data.to}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Welcome job failed for ${job.data.to} (not rethrowing): ${message}`,
      );
    }
  }
}
