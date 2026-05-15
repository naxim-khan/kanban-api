import { registerAs } from '@nestjs/config';

/** SMTP is used only when credentials are set (e.g. on Vercel without mail env, app still runs). */
export function isMailConfigured(): boolean {
  const user = process.env.MAIL_USER?.trim();
  const pass = process.env.MAIL_PASS?.trim();
  return Boolean(user && pass);
}

export default registerAs('mail', () => ({
  host: process.env.MAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.MAIL_PORT || '587', 10),
  user: process.env.MAIL_USER,
  pass: process.env.MAIL_PASS,
  from: process.env.MAIL_FROM || '"NestJS Task" <noreply@example.com>',
}));
