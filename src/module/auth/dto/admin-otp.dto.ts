import { IsNotEmpty, IsString } from "class-validator";

export class VerifyAdminOtpDto {
    @IsString()
    @IsNotEmpty({ message: 'Vui lòng cung cấp tempToken' })
    tempToken: string;

    @IsString()
    @IsNotEmpty({ message: 'Vui lòng nhập mã OTP' })
    otp: string;
}

export class ResendAdminOtpDto {
    @IsString()
    @IsNotEmpty({ message: 'Vui lòng cung cấp tempToken' })
    tempToken: string;
}