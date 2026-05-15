import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { Role } from '@generated/prisma';

export class AdminCreateUserDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  password: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
