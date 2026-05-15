import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';

@Injectable()
export class MailQueue {
  private readonly logger = new Logger(MailQueue.name);

  constructor(@InjectQueue('mail') private readonly emailQueue: Queue) {}

  async addWelcomeEmailJob(to: string, name: string) {
    try {
      this.logger.log(`Adding welcome email job for ${to} to the queue...`);

      const jobPromise = this.emailQueue.add(
        'welcome',
        {
          to,
          name,
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
          removeOnComplete: true,
        },
      );

      // Add a 5 second timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error('Queue addition timed out (Redis likely unreachable)'),
            ),
          5000,
        ),
      );

      const job = (await Promise.race([jobPromise, timeoutPromise])) as any;

      this.logger.log(`Job added successfully with ID: ${job.id}`);
      return job;
    } catch (error) {
      this.logger.error(
        `Failed to add welcome email job to queue: ${error.message}`,
      );
      throw error;
    }
  }
}
