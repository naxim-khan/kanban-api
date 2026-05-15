import { IsEmail, IsOptional, IsString } from 'class-validator';
import { Role } from '@generated/prisma';

/**
 * DTO for admin-only user updates
 * Admins can update all fields including role
 */
export class AdminUpdateUserDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  role?: Role;

  @IsOptional()
  @IsString()
  password?: string;
}
