/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable prettier/prettier */
import { Injectable, HttpStatus } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { ApiResponse } from '../../core/dto/ApiResponse.dto';
import { CustomException } from '../../core/exceptions/custom.exception';

@Injectable()
export class EmailService {
  constructor(private readonly mailerService: MailerService) {}

  async sendOtp(email: string): Promise<ApiResponse<any>> {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expirationTime = new Date(Date.now() + 10 * 60000);

    // TODO: Lưu OTP và expirationTime vào DB

    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'Mã xác thực OTP - PingMe',
        text: `Mã xác thực của bạn là: ${otp}. Mã có hiệu lực trong 10 phút.`,
      });

      return new ApiResponse(true, `OTP đã được gửi tới email ${email}`);
    } catch (error) {
      throw new CustomException(HttpStatus.INTERNAL_SERVER_ERROR, 'SERVER_ERROR', 'Lỗi khi gửi email');
    }
  }
}