import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import { CreateUserDto } from 'src/users/dto/create-user.dto/create-user.dto';
import { JwtService } from '@nestjs/jwt';
import { sanitizeUser, comparePassword } from 'src/users/utils/user.utils';
import { LoginDto } from './dto/login.dto';
import { TokenBlacklistService } from './token-blacklist.service';
import type { JwtPayload } from 'src/common/types/request.types';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UsersService,
    private readonly jwtService: JwtService,
    private readonly tokenBlacklistService: TokenBlacklistService,
  ) { }

  // register method - always creates USER role
  async registerUser(createUserDto: CreateUserDto) {
    // Explicitly destructure to ensure role field is never read from input
    const { name, email, password } = createUserDto;

    const user = await this.userService.createRaw({
      name,
      email,
      password,
    }); // returns Prisma user object

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      accessToken,
      user: sanitizeUser(user),
    };
  }

  // login method
  async loginUser(loginDto: LoginDto) {
    const user = await this.userService.findByEmail(loginDto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Check if account is locked
    if (user.lockUntil && user.lockUntil > new Date()) {
      const remainingTime = Math.ceil(
        (user.lockUntil.getTime() - new Date().getTime()) / 60000,
      );
      throw new UnauthorizedException(
        `Account is temporarily locked. Try again in ${remainingTime} minutes.`,
      );
    }

    const isPasswordMatching = await comparePassword(
      loginDto.password,
      user.password,
    );

    if (!isPasswordMatching) {
      // Increment failed attempts
      const updatedUser = await this.userService.incrementFailedAttempts(
        user.id,
      );

      // Lock account if 5 or more failed attempts
      if (updatedUser.failedLoginAttempts >= 5) {
        await this.userService.lockAccount(user.id, 15); // Lock for 15 minutes
        throw new UnauthorizedException(
          'Too many failed attempts. Account has been locked for 15 minutes.',
        );
      }

      throw new UnauthorizedException('Invalid email or password');
    }

    // Reset failed attempts on successful login
    if (user.failedLoginAttempts > 0 || user.lockUntil) {
      await this.userService.resetFailedAttempts(user.id);
    }

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
    return {
      accessToken,
      user: sanitizeUser(user),
    };
  }

  // get profile method
  async getProfile(userId: string) {
    return await this.userService.findOne(userId);
  }

  // logout method
  async logoutUser(token: string) {
    // Align blacklist TTL to the remaining JWT lifetime (exp - now).
    const decoded = this.jwtService.decode(token) as JwtPayload | null;
    const expSeconds = decoded?.exp;
    const ttlMs =
      typeof expSeconds === 'number'
        ? Math.max(0, expSeconds * 1000 - Date.now())
        : undefined;

    await this.tokenBlacklistService.add(token, ttlMs);
    return 'User logged out successfully';
  }
}
