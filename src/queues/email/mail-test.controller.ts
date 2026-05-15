import { Controller, Get, Query } from '@nestjs/common';

import { isMailConfigured } from '../../config/mail.config';
import { isRedisCacheConfigured } from '../../config/cache.config';
import { MailQueue } from './mail.queue';

@Controller('mail')
export class MailTestController {
  constructor(private readonly mailQueue: MailQueue) {}

  @Get('test-welcome')
  async testWelcome(
    @Query('email') email: string = 'test@example.com',
    @Query('name') name: string = 'Tester',
  ) {
    if (!isMailConfigured()) {
      return {
        message: 'Mail is not configured (set MAIL_USER and MAIL_PASS).',
        enabled: false,
        data: { email, name },
      };
    }

    await this.mailQueue.addWelcomeEmailJob(email, name);

    return {
      message: isRedisCacheConfigured()
        ? 'Welcome email job added to queue.'
        : 'Welcome email sent directly (no Redis queue).',
      enabled: true,
      data: { email, name },
      dashboard: isRedisCacheConfigured() ? '/admin/queues' : undefined,
    };
  }
}
