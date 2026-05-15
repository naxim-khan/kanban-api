import { Injectable, Logger } from '@nestjs/common';

import { isMailConfigured } from '../../config/mail.config';

/** No-op when SMTP is not configured. */
@Injectable()
export class NoOpMailQueue {
  private readonly logger = new Logger(NoOpMailQueue.name);

  async addWelcomeEmailJob(to: string, _name: string) {
    if (!isMailConfigured()) {
      this.logger.debug(
        `Welcome email skipped for ${to} (set MAIL_USER and MAIL_PASS to enable).`,
      );
    }
  }
}
