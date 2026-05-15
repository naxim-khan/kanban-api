import * as bcrypt from 'bcrypt';
import { User } from '@generated/prisma';

// sanitize user object
export function sanitizeUser(user: User) {
  const { password, ...rest } = user;
  return rest;
}

// hash password
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

// compare password
export async function comparePassword(
  password: string,
  hashed: string,
): Promise<boolean> {
  return bcrypt.compare(password, hashed);
}
