/* eslint-disable prettier/prettier */
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { FriendPopupStatus, FriendRequestAction, FriendStatus } from '../enums/friend-status.enum';

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

export class DeleteFriendDto {
  @IsString()
  @IsNotEmpty()
  friendId: string;
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

export interface FriendListResponseDto {
  userId: string;
  fullName: string;
  username?: string; 
  avatarUrl: string;
  onlineStatus: string;
  lastActive: string | Date;
}

export interface FriendRequestItemDto {
  requestId: string;
  fromUser: {
    userId: string;
    fullName: string;
    username?: string;
    avatarUrl: string;
  };
  toUserId: string;
  status: FriendStatus | string;
  createdAt: Date;
}

export interface FriendOnMapDto {
  userId: string;
  avatarUrl: string;
  latitude: number;
  longitude: number;
  onlineStatus: string;
}

export interface FriendMapPopupDto {
  basicInfo: {
    userId: string;
    fullName: string;
    username: string;
    avatarUrl: string;
    onlineStatus: string;
    lastActive: string;
  };
  relationship: {
    status: FriendPopupStatus | string;
    requestId: string | null;
    isRequester: boolean;
  };
  location: {
    address: string;
    distance: string;
    latitude: number;
    longitude: number;
    updatedAt: string;
  };
  activity: {
    statusMessage: string;
    activityType: string;
    battery: number;
    speed: number;
  };
  actions: {
    canChat: boolean;
    canShareLocation: boolean;
    canNavigate: boolean;
    canMute: boolean;
  };
  privacy: {
    canHideMyLocation: boolean;
  };
  optional: {
    storyUrl: string;
    checkInLocation: string;
    rank: {
      level: number;
      name: string;
      iconUrl: string;
      currentExp: number;
      nextLevelExp: number;
      progressPercent: number;
    };
  };
}