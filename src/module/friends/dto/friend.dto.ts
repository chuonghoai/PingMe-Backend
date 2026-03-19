/* eslint-disable prettier/prettier */
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { FriendRequestAction, FriendStatus } from '../enums/friend-status.enum';

export class SendFriendRequestDto {
  @IsString()
  @IsNotEmpty()
  senderId: string;

  @IsString()
  @IsNotEmpty()
  targetUserId: string;
}

export interface FriendRequestResponseDto {
  requestId: string;
  sender: {
    userId: string;
    fullName: string;
    avatarUrl: string;
  };
  receiver: {
    userId: string;
    fullName: string;
    avatarUrl: string;
  };
  status: FriendStatus | string;
  createdAt: Date;
}


export class RespondFriendRequestDto {
  @IsString()
  @IsNotEmpty()
  requestId: string;

  @IsEnum(FriendRequestAction, { message: 'Action chỉ được phép là ACCEPT hoặc REJECT' })
  @IsNotEmpty()
  action: FriendRequestAction;
}

export interface RespondFriendResponseDto {
  requestId: string;
  status: string;
}