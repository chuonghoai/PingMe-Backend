import { IsNotEmpty, IsString } from 'class-validator';
import { FriendStatus } from '../enums/friend-status.enum';

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
