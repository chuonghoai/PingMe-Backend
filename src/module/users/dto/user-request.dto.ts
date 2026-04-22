/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { isEmpty, IsEnum, IsNotEmpty, IsOptional, isNotEmpty, IsString } from 'class-validator';
import { EUserGender } from '../enums/user.enum';
import { Transform } from 'class-transformer';

export class UpdateUserRequest {
  @IsOptional()
  @IsString()
  fullname?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @Transform(({ value }) => typeof value === 'string' ? value.toUpperCase() : value)
  @IsEnum(EUserGender, { message: 'Giới tính không hợp lệ' })
  gender?: EUserGender;

  @IsOptional()
  @IsString()
  dob?: string;

  @IsOptional()
  @IsString()
  bio?: string;
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