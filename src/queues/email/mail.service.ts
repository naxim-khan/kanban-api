import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(MailService.name);

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('mail.host'),
      port: this.configService.get<number>('mail.port'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: this.configService.get<string>('mail.user'),
        pass: this.configService.get<string>('mail.pass'),
      },
    });
  }

  async sendWelcomeEmail(to: string, name: string) {
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
      this.logger.error(`Failed to send email to ${to}: ${error.message}`);
      throw error;
    }
  }

  // Add more email methods as needed
}
