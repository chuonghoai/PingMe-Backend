import { forwardRef, HttpStatus, Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { UserRepository } from "../users/users.repository";
import { EmailRepository } from "../email/email.repository";
import { UserToken } from "./entities/user-token.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { EmailService } from "../email/email.service";
import { Repository } from "typeorm";
import { ApiResponse } from "../../core/dto/ApiResponse.dto";
import { CustomException } from "../../core/exceptions/custom.exception";
import { EUserStatus, EUserRole } from "../users/enums/user.enum";
import * as bcrypt from 'bcrypt';
import { ENV_VARS } from "../../constants/env.constants";
import { LoginDto } from "./dto/login.dto";
import { OtpPurpose } from "../email/enums/otp-purpose.enum";
import { User } from "../users/entities/user.entity";
import { ForgotPasswordDto, ResetPasswordDto } from "./dto/admin-password.dto";

@Injectable()
export class AdminAuthService {
    constructor(
        private jwtService: JwtService,
        private configService: ConfigService,
        @Inject(forwardRef(() => UserRepository))
        private userRepository: UserRepository,
        private emailRepository: EmailRepository,
        @InjectRepository(UserToken) private userTokenRepository: Repository<UserToken>,
        private emailService: EmailService,
    ) { }

    // Verify OTP
    private async verifyOtpCore(email: string, otp: string, purpose: OtpPurpose): Promise<boolean> {
        const latestOtp = await this.emailRepository.findLatestOtp(email, purpose);

        if (!latestOtp || latestOtp.otp !== otp || latestOtp.isUsed || new Date() > latestOtp.expirationTime) {
            throw new CustomException(HttpStatus.BAD_REQUEST, 'INVALID_OTP', 'Mã OTP không hợp lệ hoặc đã hết hạn');
        }

        latestOtp.isUsed = true;
        await this.emailRepository.save(latestOtp);
        return true;
    }

    // Generate Access Token
    private async generateAccessToken(user: User, rememberMe: boolean = false) {
        const payload = { userId: user.id, email: user.email, role: user.role };
        const accessToken = this.jwtService.sign(payload);

        const refreshTokenExpiresIn = rememberMe ? '360d' : '1d';
        const refreshToken = this.jwtService.sign(payload, {
            secret: this.configService.get<string>(ENV_VARS.JWT_REFRESH_SECRET),
            expiresIn: refreshTokenExpiresIn,
        });

        const days = rememberMe ? 360 : 1;
        const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

        await this.userTokenRepository.save({
            userId: user.id,
            refreshToken: refreshToken,
            expiresAt: expiresAt,
            isRevoked: false,
        });

        return { accessToken, refreshToken, user: { userId: user.id, email: user.email, status: user.status } };
    }

    // Generate Reset Token
    private async generateResetToken(userId: string) {
        const payload = { userId, purpose: 'RESET_PASSWORD_FLOW' };
        return this.jwtService.sign(payload, { expiresIn: '15m' });
    }

    // Login: send OTP
    async login(loginDto: LoginDto): Promise<ApiResponse<any>> {
        const { email, password, rememberMe } = loginDto;

        const user = await this.userRepository.createQueryBuilder('user')
            .where('user.email = :email', { email })
            .addSelect('user.password')
            .getOne();

        if (!user) {
            throw new CustomException(HttpStatus.UNAUTHORIZED, 'INVALID_CREDENTIALS', 'Email hoặc mật khẩu không đúng');
        }
        if (user.role !== EUserRole.ADMIN) {
            throw new CustomException(HttpStatus.FORBIDDEN, 'FORBIDDEN', 'Bạn không có quyền truy cập trang quản trị');
        }
        if (user.status === EUserStatus.PENDING) {
            throw new CustomException(HttpStatus.FORBIDDEN, 'ACCOUNT_NOT_VERIFIED', 'Tài khoản chưa hoàn thành đăng ký');
        }
        if (user.status === EUserStatus.LOCKED) {
            throw new CustomException(HttpStatus.LOCKED, 'ACCOUNT_LOCKED', 'Tài khoản đã bị khóa');
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            throw new CustomException(HttpStatus.UNAUTHORIZED, 'INVALID_CREDENTIALS', 'Mật khẩu không đúng');
        }

        const payload = {
            userId: user.id,
            email: user.email,
            role: user.role,
            rememberMe: rememberMe || false,
        };
        const tempToken = this.jwtService.sign(payload, { expiresIn: '10m' });

        //await this.emailService.sendOtp(user.email, 'Mã OTP đăng nhập - PingMe', OtpPurpose.LOGIN_2FA);
        return new ApiResponse(true, 'Vui lòng kiểm tra email để lấy mã OTP', { tempToken });
    }

    // Verify login OTP
    async verifyLoginOtp(dto: any): Promise<ApiResponse<any>> {
        try {
            const payload = this.jwtService.verify(dto.tempToken);

            //await this.verifyOtpCore(payload.email, dto.otp, OtpPurpose.LOGIN_2FA);

            const user = await this.userRepository.findByEmail(payload.email);
            if (!user) throw new CustomException(HttpStatus.NOT_FOUND, 'USER_NOT_FOUND', 'Tài khoản không tồn tại');
            const tokenData = await this.generateAccessToken(user, payload.rememberMe);

            return new ApiResponse(true, 'Đăng nhập thành công', tokenData);
        } catch (error) {
            if (error instanceof CustomException) throw error;
            throw new CustomException(HttpStatus.UNAUTHORIZED, 'INVALID_TOKEN', 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn');
        }
    }

    async resendOtp(tempToken: string): Promise<ApiResponse<any>> {
        try {
            const payload = this.jwtService.verify(tempToken, { ignoreExpiration: true });

            await this.emailService.sendOtp(payload.email, 'Mã xác thực OTP đăng nhập Admin - PingMe');

            const newTempToken = this.jwtService.sign({
                userId: payload.userId,
                email: payload.email,
                role: payload.role,
                rememberMe: payload.rememberMe
            }, { expiresIn: '10m' });

            return new ApiResponse(true, 'OTP đã được gửi lại thành công', { tempToken: newTempToken });
        } catch (error) {
            throw new CustomException(HttpStatus.UNAUTHORIZED, 'INVALID_TOKEN', 'Token không hợp lệ. Vui lòng đăng nhập lại từ đầu.');
        }
    }

    async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<ApiResponse<any>> {
        const user = await this.userRepository.findByEmail(forgotPasswordDto.email);
        if (user) {
            await this.emailService.sendOtp(user.email, 'Mã khôi phục mật khẩu - PingMe', OtpPurpose.RESET_PASSWORD);
        }
        return new ApiResponse(true, 'Nếu email tồn tại, mã khôi phục đã được gửi đi', null);
    }

    async verifyResetPasswordOtp(dto: any): Promise<ApiResponse<any>> {
        await this.verifyOtpCore(dto.email, dto.otp, OtpPurpose.RESET_PASSWORD);

        const user = await this.userRepository.findByEmail(dto.email);
        if (!user) throw new CustomException(HttpStatus.NOT_FOUND, 'USER_NOT_FOUND', 'Tài khoản không tồn tại');
        const resetToken = await this.generateResetToken(user.id);

        return new ApiResponse(true, 'Xác thực thành công. Vui lòng đặt lại mật khẩu.', { resetToken });
    }

    async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<ApiResponse<any>> {
        try {
            const payload = this.jwtService.verify(resetPasswordDto.resetToken);

            if (payload.purpose !== 'RESET_PASSWORD_FLOW') {
                throw new CustomException(HttpStatus.BAD_REQUEST, 'INVALID_TOKEN_PURPOSE', 'Token không đúng mục đích');
            }

            const user = await this.userRepository.findById(payload.userId);
            if (!user) throw new CustomException(HttpStatus.NOT_FOUND, 'USER_NOT_FOUND', 'Tài khoản không tồn tại');

            user.password = await bcrypt.hash(resetPasswordDto.newPassword, 10);
            await this.userRepository.save(user);

            await this.userTokenRepository.update({ userId: user.id }, { isRevoked: true });

            return new ApiResponse(true, 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.', null);
        } catch (error) {
            if (error instanceof CustomException) throw error;
            throw new CustomException(HttpStatus.BAD_REQUEST, 'EXPIRED_TOKEN', 'Phiên đổi mật khẩu đã hết hạn');
        }
    }
}