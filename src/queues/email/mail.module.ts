import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { MailService } from './mail.service';
import { MailQueue } from './mail.queue';
import { MailProcessor } from './mail.processor';
import { MailTestController } from './mail-test.controller';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'mail',
    }),
  ],
  controllers: [MailTestController],
  providers: [MailService, MailQueue, MailProcessor],
  exports: [MailQueue], // Export so other modules (like UsersModule) can enqueue jobs
})
export class MailModule {}
