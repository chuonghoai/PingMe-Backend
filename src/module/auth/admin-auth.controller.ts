import {
    Controller,
    Post,
    Body,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { AdminAuthService } from './admin-auth.service';
import { LoginDto } from './dto/login.dto';
import { Throttle } from '@nestjs/throttler';
import { ResendAdminOtpDto, VerifyAdminOtpDto } from './dto/admin-otp.dto';
import { ForgotPasswordDto, ResetPasswordDto, VerifyResetOtpDto } from './dto/admin-password.dto';

@Controller('admin/auth')
export class AdminAuthController {
    constructor(private readonly adminAuthService: AdminAuthService) { }

    // Login
    @Throttle({ default: { limit: 5, ttl: 20000 } })
    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(@Body() loginDto: LoginDto) {
        console.log('admin đăng nhập lúc ' + Date.now());
        return this.adminAuthService.login(loginDto);
    }

    // Verify OTP
    @Post('verify-login-otp')
    @HttpCode(HttpStatus.OK)
    async verifyLoginOtp(@Body() dto: VerifyAdminOtpDto) {
        return this.adminAuthService.verifyLoginOtp(dto);
    }

    // Resend OTP
    @Throttle({ default: { limit: 1, ttl: 30000 } })
    @Post('resend-otp')
    @HttpCode(HttpStatus.OK)
    async resendOtp(@Body() body: ResendAdminOtpDto) {
        return this.adminAuthService.resendOtp(body.tempToken);
    }

    @Post('forgot-password')
    @HttpCode(HttpStatus.OK)
    async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
        return this.adminAuthService.forgotPassword(forgotPasswordDto);
    }

    @Post('verify-reset-otp')
    @HttpCode(HttpStatus.OK)
    async verifyResetPasswordOtp(@Body() dto: VerifyResetOtpDto) {
        return this.adminAuthService.verifyResetPasswordOtp(dto);
    }

    @Post('reset-password')
    @HttpCode(HttpStatus.OK)
    async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
        return this.adminAuthService.resetPassword(resetPasswordDto);
    }
}