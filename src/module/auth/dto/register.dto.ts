import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @IsNotEmpty({ message: 'Vui lòng nhập đầy đủ thông tin' })
  email: string;

  @IsNotEmpty({ message: 'Vui lòng nhập mã OTP' })
  otp: string;

  @IsNotEmpty({ message: 'Vui lòng nhập mật khẩu' })
  @IsString()
  password: string;
}

export class AddProfileDto {
  @IsNotEmpty({ message: 'Vui lòng cung cấp email' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;

  @IsNotEmpty({ message: 'Vui lòng nhập họ tên' })
  @IsString()
  fullname: string;

  @IsNotEmpty({ message: 'Vui lòng nhập số điện thoại' })
  @IsString()
  phone: string;

  @IsNotEmpty({ message: 'Vui lòng chọn giới tính' })
  @IsString()
  gender: string;

  @IsNotEmpty({ message: 'Vui lòng nhập ngày sinh' })
  @IsString()
  dob: string;
}
