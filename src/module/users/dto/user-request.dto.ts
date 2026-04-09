/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable prettier/prettier */
 
/* eslint-disable @typescript-eslint/no-unused-vars */
import { isEmpty, IsEnum, IsNotEmpty, isNotEmpty, IsString } from 'class-validator';
import { EUserGender } from '../enums/user.enum';
import { Transform } from 'class-transformer';

export class UpdateUserRequest {
  @IsNotEmpty({ message: 'Vui lòng nhập họ tên' })
  @IsString()
  fullname: string;

  @IsNotEmpty({ message: 'Vui lòng nhập số điện thoại' })
  @IsString()
  phone: string;

  @IsNotEmpty({ message: 'Vui lòng chọn giới tính' })
  @Transform(({ value }) => typeof value === 'string' ? value.toUpperCase() : value,)
  @IsEnum(EUserGender, { message: 'Giới tính không hợp lệ' })
  gender: EUserGender;

  @IsNotEmpty({ message: 'Vui lòng nhập ngày sinh' })
  @IsString()
  dob: string;
}

export interface NearbyUserResponseDto {
  userId: string;
  fullName: string;
  avatarUrl: string;
  distance: string;
}

export enum ELocationShareAction {
  START = 'START',
  STOP = 'STOP',
}

export class ToggleLocationShareDto {
  @IsEnum(ELocationShareAction, { message: 'Action chỉ được phép là START hoặc STOP' })
  @IsNotEmpty({ message: 'Vui lòng truyền action' })
  action: ELocationShareAction;
}