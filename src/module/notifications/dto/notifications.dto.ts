import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export interface NotificationItemDto {
  notificationId: string;
  type: string;
  subType: string;
  title: string;
  message: string;
  actor: {
    userId: string;
    fullName: string;
    avatarUrl: string;
  } | null;
  metadata: any;
  isRead: boolean;
  createdAt: Date;
}

export class UpdateStatusDto {
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập trạng thái' })
  statusMessage: string;
}

export class SecurityAlertDto {
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng cung cấp tên thiết bị' })
  device: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsNotEmpty({ message: 'Vui lòng cung cấp địa chỉ IP' })
  ipAddress: string;
}
