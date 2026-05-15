import { DynamicModule, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';

import { isMailConfigured } from '../../config/mail.config';
import { isRedisCacheConfigured } from '../../config/cache.config';
import { MailService } from './mail.service';
import { MailQueue } from './mail.queue';
import { MailProcessor } from './mail.processor';
import { MailTestController } from './mail-test.controller';
import { DirectMailQueue } from './mail-queue.direct';
import { NoOpMailQueue } from './mail-queue.noop';

@Module({})
export class MailModule {
  static register(): DynamicModule {
    const base = {
      module: MailModule,
      global: true,
      controllers: [MailTestController],
      exports: [MailQueue],
    };

    if (!isMailConfigured()) {
      return {
        ...base,
        providers: [
          NoOpMailQueue,
          { provide: MailQueue, useExisting: NoOpMailQueue },
        ],
      };
    }

    const mailProviders = [MailService] as const;

    if (isRedisCacheConfigured()) {
      return {
        ...base,
        imports: [BullModule.registerQueue({ name: 'mail' })],
        providers: [...mailProviders, MailQueue, MailProcessor],
      };
    }

    return {
      ...base,
      providers: [
        ...mailProviders,
        DirectMailQueue,
        { provide: MailQueue, useExisting: DirectMailQueue },
      ],
    };
  }
}
