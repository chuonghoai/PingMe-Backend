import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
    @IsNotEmpty({ message: 'Vui lòng nhập mật khẩu cũ' })
    @IsString()
    oldPassword: string;

    @IsNotEmpty({ message: 'Vui lòng nhập mật khẩu mới' })
    @IsString()
    @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
    newPassword: string;
}