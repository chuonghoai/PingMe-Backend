import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @IsNotEmpty({ message: 'Vui lòng nhập email' })
  email: string;
}

export class ResetPasswordDto {
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @IsNotEmpty({ message: 'Vui lòng nhập email' })
  email: string;

  @IsNotEmpty({ message: 'Vui lòng nhập mã OTP' })
  @IsString()
  otp: string;

  @IsNotEmpty({ message: 'Vui lòng nhập mật khẩu mới' })
  @IsString()
  newPassword: string;
}
