import { EmailService } from './../email/email.service';
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ApiResponse } from '../../core/dto/ApiResponse.dto';
import { CustomException } from '../../core/exceptions/custom.exception';
import { ENV_VARS } from '../../constants/env.constants';
import { AddProfileDto, RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';
import { EmailRepository } from '../email/email.repository';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { EUserGender, EUserStatus } from '../users/enums/user.enum';
import { UserRepository } from '../users/users.repository';
import { UserToken } from './entities/user-token.entity';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/password.dto';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private userRepository: UserRepository,
    private emailRepository: EmailRepository,
    @InjectRepository(UserToken) private userTokenRepository: Repository<UserToken>,
    private emailService: EmailService,
  ) {}

  // LOGIN
  // Token contain: userId, email, role
  async login(loginDto: Record<string, any>): Promise<ApiResponse<any>> {
    const { email, password, rememberMe } = loginDto;

    // Find user by email
    const user = await this.userRepository.createQueryBuilder('user')
                                          .where('user.email = :email', { email })
                                          .addSelect('user.password')
                                          .getOne();

    if (!user) {
      throw new CustomException(
        HttpStatus.UNAUTHORIZED,
        'INVALID_CREDENTIALS',
        'Email hoặc mật khẩu không đúng',
      );
    }

    // Check Account Status
    if (user.status === EUserStatus.PENDING) {
      throw new CustomException(
        HttpStatus.FORBIDDEN,
        'ACCOUNT_NOT_VERIFIED',
        'Tài khoản chưa hoàn thành đăng ký',
      );
    }
    if (user.status === EUserStatus.LOCKED) {
      throw new CustomException(
        HttpStatus.LOCKED,
        'ACCOUNT_LOCKED',
        'Tài khoản đã bị khóa',
      );
    }

    // Verify Password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new CustomException(
        HttpStatus.UNAUTHORIZED,
        'INVALID_CREDENTIALS',
        'Email hoặc mật khẩu không đúng',
      );
    }

    // Generate Tokens
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };
    const accessToken = this.jwtService.sign(payload);

    // Refrest Tokens
    const refreshTokenExpiresIn = rememberMe ? '360d' : '1d';
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>(ENV_VARS.JWT_REFRESH_SECRET),
      expiresIn: refreshTokenExpiresIn,
    });

    // Save Refresh tokens in db
    const days = rememberMe ? 360 : 1;
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    await this.userTokenRepository.save({
      userId: user.id,
      refreshToken: refreshToken,
      expiresAt: expiresAt,
      isRevoked: false,
    });

    return new ApiResponse(true, 'Đăng nhập thành công', {
      accessToken,
      refreshToken,
      user: {
        userId: user.id,
        email: user.email,
        status: user.status,
      },
    });
  }

  // REFRESH TOKEN
  async refreshToken(body: Record<string, any>): Promise<ApiResponse<any>> {
    const { refreshToken } = body;

    if (!refreshToken) {
      throw new CustomException(
        HttpStatus.UNAUTHORIZED,
        'INVALID_REFRESH_TOKEN',
        'Vui lòng cung cấp Refresh Token',
      );
    }

    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>(ENV_VARS.JWT_REFRESH_SECRET),
      });

      // Check refresh token
      const tokenRecord = await this.userTokenRepository.findOne({ 
        where: { refreshToken: refreshToken } 
      });
      if (!tokenRecord || tokenRecord.isRevoked) {
        throw new CustomException(HttpStatus.UNAUTHORIZED, 'TOKEN_REVOKED', 'Phiên đăng nhập không hợp lệ');
      }

      // Check user account
      const user = await this.userRepository.findById(payload.userId);

      if (!user) {
        throw new CustomException(
          HttpStatus.UNAUTHORIZED,
          'USER_NOT_FOUND',
          'Tài khoản không tồn tại',
        );
      }

      if (user.status === EUserStatus.LOCKED) {
        throw new CustomException(
          HttpStatus.FORBIDDEN,
          'ACCOUNT_LOCKED',
          'Tài khoản đã bị khóa.',
        );
      }

      // Generate new access tokens and refresh tokens
      const newPayload = { userId: user.id, email: user.email, role: user.role };
      const newAccessToken = this.jwtService.sign(newPayload);
      const newRefreshToken = this.jwtService.sign(newPayload, {
        secret: this.configService.get<string>(ENV_VARS.JWT_REFRESH_SECRET),
        expiresIn: '360d',
      });

      // Revoked old token and save new tokens
      tokenRecord.isRevoked = true;
      await this.userTokenRepository.save(tokenRecord);
      await this.userTokenRepository.save({
        userId: user.id,
        refreshToken: newRefreshToken,
        expiresAt: new Date(Date.now() + 360 * 24 * 60 * 60 * 1000),
      });

      return new ApiResponse(true, 'Làm mới token thành công', {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      });
      
    } catch (error) {
      throw new CustomException(
        HttpStatus.UNAUTHORIZED,
        'INVALID_REFRESH_TOKEN',
        'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại',
      );
    }
  }

  // REGISTER
  async register(registerDto: RegisterDto): Promise<ApiResponse<any>> {
    const { email, otp, password } = registerDto;

    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new CustomException(HttpStatus.CONFLICT, 'EMAIL_EXISTS', 'Email đã được sử dụng');
    }

    const latestOtp = await this.emailRepository.findLatestOtpByEmail(email);
    if (!latestOtp || latestOtp.otp !== otp || latestOtp.isUsed || new Date() > latestOtp.expirationTime) {
      throw new CustomException(
        HttpStatus.BAD_REQUEST,
        'INVALID_OTP',
        'OTP không hợp lệ hoặc đã hết hạn'
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = this.userRepository.create({
      email: email,
      password: hashedPassword,
      status: EUserStatus.PENDING,
    });
    const savedUser = await this.userRepository.save(newUser);

    latestOtp.isUsed = true;
    await this.emailRepository.save(latestOtp);

    return new ApiResponse(
      true, 
      'Đăng ký thành công.',
      {
        userId: newUser.id,
        email: newUser.email,
        status: newUser.status,
      }
    );
  }

  // Add profile
  async addProfile(addProfileDto: AddProfileDto): Promise<ApiResponse<any>> {
    const { email, fullname, phone, gender, dob } = addProfileDto;

    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new CustomException(HttpStatus.NOT_FOUND, 'USER_NOT_FOUND', 'Không tìm thấy tài khoản');
    }
    if (user.status === EUserStatus.ACTIVE) {
      throw new CustomException(HttpStatus.BAD_REQUEST, 'ALREADY_ACTIVE', 'Tài khoản này đã hoàn tất hồ sơ từ trước');
    }

    user.fullname = fullname;
    user.phone = phone;
    user.gender = gender;
    user.dob = new Date(dob);
    const encodedName = encodeURIComponent(fullname);
    user.avatarUrl = `https://ui-avatars.com/api/?name=${encodedName}&background=random&color=fff&size=256&bold=true`;
    
    user.status = EUserStatus.ACTIVE;

    await this.userRepository.save(user);
    return new ApiResponse(true, 'Cập nhật thông tin thành công', null);
  }

  // Logout
  async logout(refreshToken: string): Promise<ApiResponse<any>> {
    try {
      // revoke old refresh token in db
      if (refreshToken) {
        const tokenRecord = await this.userTokenRepository.findOne({ where: { refreshToken } });
        if (tokenRecord) {
          tokenRecord.isRevoked = true;
          await this.userTokenRepository.save(tokenRecord);
        }
      }

      return new ApiResponse(true, 'Đăng xuất thành công', null);
    } catch (error) {
      throw new CustomException(HttpStatus.INTERNAL_SERVER_ERROR, 'LOGOUT_FAILED', 'Đã xảy ra lỗi khi đăng xuất');
    }
  }

  // Forgot password
  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<ApiResponse<any>> {
    const { email } = forgotPasswordDto;
    const user = await this.userRepository.findByEmail(email);
    if (user) {
      await this.emailService.sendOtp(email, 'Mã khôi phục mật khẩu - PingMe');
    }

    return new ApiResponse(
      true,
      'Mã xác thực đã được gửi đi',
      null
    );
  }

  // Reset password
  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<ApiResponse<any>> {
    const { email, otp, newPassword } = resetPasswordDto;

    // Check user
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new CustomException(HttpStatus.BAD_REQUEST, 'INVALID_REQUEST', 'Yêu cầu không hợp lệ');
    }

    // Check OTP
    const latestOtp = await this.emailRepository.findLatestOtpByEmail(email);
    if (!latestOtp || latestOtp.otp !== otp || latestOtp.isUsed || new Date() > latestOtp.expirationTime) {
      throw new CustomException(HttpStatus.BAD_REQUEST, 'INVALID_OTP', 'Mã OTP không hợp lệ hoặc đã hết hạn');
    }

    // Reset password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await this.userRepository.save(user);

    // Revoked OTP
    latestOtp.isUsed = true;
    await this.emailRepository.save(latestOtp);

    // Refresh all token
    await this.userTokenRepository.update(
      { userId: user.id },
      { isRevoked: true }
    );

    return new ApiResponse(true, 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.', null);
  }
}
