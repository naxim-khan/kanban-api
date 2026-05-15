import { IsOptional, IsString } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  name?: string;

  // Email update is disabled to prevent email changes
  // Role update is disabled for regular users (admins use AdminUpdateUserDto)

  @IsOptional()
  @IsString()
  password?: string;
}
