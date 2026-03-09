/* eslint-disable prettier/prettier */
import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { EmailService } from './email.service';
import { SendOtpDto } from './dto/otp.dto';
import { Throttle } from '@nestjs/throttler';

@Controller('email')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Throttle({ default: { limit: 1, ttl: 30000}})
  @Post('otp')
  @HttpCode(HttpStatus.OK)
  async sendOtp(@Body() body: SendOtpDto) {
    return this.emailService.sendOtp(body.email);
  }
}
