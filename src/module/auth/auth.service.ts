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

    // Bước 3: Find user by email (Mockup DB)
    const user = {
      id: 'uuid-1234',
      email: 'test@example.com',
      username: 'testuser',
      password: 'hashed_password_here',
      status: 'ACTIVE',
      failed_attempts: 0,
    };

    if (!user || user.email !== email) {
      throw new CustomException(
        HttpStatus.UNAUTHORIZED,
        'INVALID_CREDENTIALS',
        'Email hoặc mật khẩu không đúng',
      );
    }

    // Bước 4: Check Account Status
    if (user.status === 'PENDING_VERIFICATION') {
      throw new CustomException(
        HttpStatus.FORBIDDEN,
        'ACCOUNT_NOT_VERIFIED',
        'Tài khoản chưa xác thực email',
      );
    }
    if (user.status === 'LOCKED') {
      throw new CustomException(
        HttpStatus.LOCKED,
        'ACCOUNT_LOCKED',
        'Tài khoản đã bị khóa do nhập sai nhiều lần',
      );
    }

    // Bước 5: Verify Password
    const isMatch = true;

    if (!isMatch) {
      throw new CustomException(
        HttpStatus.UNAUTHORIZED,
        'INVALID_CREDENTIALS',
        'Email hoặc mật khẩu không đúng',
      );
    }

    // Bước 6: Generate Tokens
    const payload = {
      userId: user.id,
      email: user.email,
      username: user.username,
    };
    const accessToken = this.jwtService.sign(payload);

    const refreshTokenExpiresIn = rememberMe ? '360d' : '1d';

    // SỬ DỤNG CONSTANTS ĐỂ LẤY BIẾN MÔI TRƯỜNG
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>(ENV_VARS.JWT_REFRESH_SECRET),
      expiresIn: refreshTokenExpiresIn,
    });

    // Bước 7: Trả về kết quả
    return new ApiResponse(true, 'Đăng nhập thành công', {
      accessToken,
      refreshToken,
      user: {
        userId: user.id,
        email: user.email,
        username: user.username,
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
      // Bước 1: Xác thực JWT của Refresh Token
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>(ENV_VARS.JWT_REFRESH_SECRET),
      });

      // Bước 2: Tạo Access Token mới
      const newPayload = {
        userId: payload.userId,
        email: payload.email,
        username: payload.username,
      };
      const newAccessToken = this.jwtService.sign(newPayload);

      // Bước 3: Trả về kết quả
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
}
