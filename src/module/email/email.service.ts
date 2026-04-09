import { EmailRepository } from './email.repository';
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable prettier/prettier */
import { Injectable, HttpStatus } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { ApiResponse } from '../../core/dto/ApiResponse.dto';
import { CustomException } from '../../core/exceptions/custom.exception';

@Injectable()
export class EmailService {
  constructor(
    private readonly mailerService: MailerService,
    private readonly emailRepository: EmailRepository,
  ) {}

  async sendOtp(email: string, subject: string): Promise<ApiResponse<any>> {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expirationTime = new Date(Date.now() + 10 * 60000);

    await this.emailRepository.createAndSaveOtp(email, otp, expirationTime);

    this.mailerService.sendMail({
      to: email,
      subject: subject,
      template: './otp',
      context: {
        email: email, 
        otp: otp,
      },
    }).catch((error) => {
      throw new CustomException(HttpStatus.INTERNAL_SERVER_ERROR, 'SERVER_ERROR', 'Lỗi khi gửi email');
      console.error(`[EmailService] Lỗi khi gửi email tới ${email}:`, error);
    });

    console.log('Email dang duoc gui den: ' + email);
    return new ApiResponse(true, `OTP đang được gửi tới email ${email}`);
  }
}