import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Throttle } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // API: Login
  // Request: email, password, rememberMe
  @Throttle({ default: { limit: 1, ttl: 1000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  // API: Refresh Token
  // Request: Refresh token
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() body: Record<string, any>) {
    return this.authService.refreshToken(body);
  }
}
