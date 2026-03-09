/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Transform } from 'class-transformer';
import { IsEmail, IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { EUserGender } from 'src/module/users/enums/user.enum';

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
  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase() : value))
  @IsEnum(EUserGender, { message: 'Giới tính không hợp lệ' })
  gender: EUserGender;

  @IsNotEmpty({ message: 'Vui lòng nhập ngày sinh' })
  @IsString()
  dob: string;
}
