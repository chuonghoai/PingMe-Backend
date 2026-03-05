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

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    // private usersService: UsersService,
  ) {}

  // LOGIN
  // Token contain: userId, email, username
  async login(loginDto: Record<string, any>): Promise<ApiResponse<any>> {
    const { email, password, rememberMe } = loginDto;

    // Find user by email
    const user = {
      id: 'uuid-1234',
      email: 'test@example.com',
      username: 'testuser',
      password: 'hashed_password_here',
      status: 'LOCKED',
      failed_attempts: 0,
    };

    if (!user || user.email !== email) {
      throw new CustomException(
        HttpStatus.UNAUTHORIZED,
        'INVALID_CREDENTIALS',
        'Email hoặc mật khẩu không đúng',
      );
    }

    // Check Account Status
    if (user.status === 'PENDING') {
      throw new CustomException(
        HttpStatus.FORBIDDEN,
        'ACCOUNT_NOT_VERIFIED',
        'Tài khoản chưa hoàn thành đăng ký',
      );
    }
    if (user.status === 'LOCKED') {
      throw new CustomException(
        HttpStatus.LOCKED,
        'ACCOUNT_LOCKED',
        'Tài khoản đã bị khóa',
      );
    }

    // Verify Password
    const isMatch = true;
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
      username: user.username,
    };
    const accessToken = this.jwtService.sign(payload);

    const refreshTokenExpiresIn = rememberMe ? '360d' : '1d';
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>(ENV_VARS.JWT_REFRESH_SECRET),
      expiresIn: refreshTokenExpiresIn,
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
        'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại',
      );
    }

    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>(ENV_VARS.JWT_REFRESH_SECRET),
      });

      const newPayload = {
        userId: payload.userId,
        email: payload.email,
        username: payload.username,
      };
      const newAccessToken = this.jwtService.sign(newPayload);

      return new ApiResponse(true, 'Làm mới token thành công', {
        accessToken: newAccessToken,
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

    const isEmailExists = false;
    if (isEmailExists) {
      throw new CustomException(HttpStatus.CONFLICT, 'EMAIL_EXISTS', 'Email đã được sử dụng');
    }

    const isValidOtp = true;
    const isExpired = false;
    if (!isValidOtp || isExpired) {
      throw new CustomException(
        HttpStatus.BAD_REQUEST,
        'INVALID_OTP',
        'OTP không hợp lệ hoặc đã hết hạn'
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = { id: 'uuid-1234', email, status: 'PENDING' };

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

  async addProfile(addProfileDto: AddProfileDto): Promise<ApiResponse<any>> {
    const { email, fullname, phone, gender, dob } = addProfileDto;

    // TODO: Tìm user trong DB bằng "email"
    // TODO: Cập nhật fullname, phone, gender, dob
    // TODO: Cập nhật status của user thành 'ACTIVE'
    
    return new ApiResponse(true, 'Cập nhật thông tin thành công', null);
  }
}
