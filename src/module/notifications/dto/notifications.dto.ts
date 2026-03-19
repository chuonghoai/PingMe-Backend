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
