/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/require-await */
import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Headers,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Throttle } from '@nestjs/throttler';
import { RegisterDto, AddProfileDto } from './dto/register.dto';
import { JwtAuthGuard } from 'src/core/security/jwt/jwt-auth.guard';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/password.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // API: Login
  @Throttle({ default: { limit: 1, ttl: 1000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  // API: Refresh Token
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() body: Record<string, any>) {
    return this.authService.refreshToken(body);
  }

  // API: Register
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  // API: Add Profile
  @Post('add-profile')
  @HttpCode(HttpStatus.OK)
  async addProfile(@Body() addProfileDto: AddProfileDto) {
    return this.authService.addProfile(addProfileDto);
  }

  // API: Logout
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Body('refreshToken') refreshToken: string) {
    return this.authService.logout(refreshToken);
  }

  // API: Forgot password
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  // API: Reset Password
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }
}
