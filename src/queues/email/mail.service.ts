import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

import { isMailConfigured } from '../../config/mail.config';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: nodemailer.Transporter | null;

  constructor(private readonly configService: ConfigService) {
    if (!isMailConfigured()) {
      this.transporter = null;
      this.logger.log(
        '[MAIL] SMTP not configured (MAIL_USER / MAIL_PASS); emails disabled.',
      );
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('mail.host'),
      port: this.configService.get<number>('mail.port'),
      secure: false,
      auth: {
        user: this.configService.get<string>('mail.user'),
        pass: this.configService.get<string>('mail.pass'),
      },
    });
  }

  async sendWelcomeEmail(to: string, name: string): Promise<void> {
    if (!this.transporter) {
      return;
    }

    try {
      const from = this.configService.get<string>('mail.from');
      await this.transporter.sendMail({
        from,
        to,
        subject: 'Welcome to NestJS Task App!',
        html: `
          <h1>Welcome, ${name}!</h1>
          <p>Thank you for joining our platform. We are excited to have you on board.</p>
          <p>Best regards,<br/>The Team</p>
        `,
      });
      this.logger.log(`Email sent successfully to ${to}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to send email to ${to}: ${message}`);
    }
  }
}
