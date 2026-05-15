import { Controller, Get, Query } from '@nestjs/common';
import { MailQueue } from './mail.queue';

@Controller('mail')
export class MailTestController {
  constructor(private readonly mailQueue: MailQueue) {}

  @Get('test-welcome')
  async testWelcome(
    @Query('email') email: string = 'test@example.com',
    @Query('name') name: string = 'Tester',
  ) {
    await this.mailQueue.addWelcomeEmailJob(email, name);
    return {
      message: 'Welcome email job added to queue!',
      data: { email, name },
      dashboard: '/admin/queues',
    };
  }
}
