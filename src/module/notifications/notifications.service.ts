/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notifications.entity';
import { ApiResponse } from '../../core/dto/ApiResponse.dto';
import { NotificationItemDto } from './dto/notifications.dto';
import { ENotificationSubType, ENotificationType } from './enums/notifications.enum';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
  ) {}

  // Get notifications
  async getNotifications(
    userId: string,
  ): Promise<ApiResponse<NotificationItemDto[]>> {
    const notifications = await this.notificationRepo.find({
      where: { userId: userId },
      relations: ['actor'],
      order: { createdAt: 'DESC' },
    });

    const formattedNotifications: NotificationItemDto[] = notifications.map(
      (notif) => ({
        notificationId: notif.id,
        type: notif.type,
        subType: notif.subType,
        title: notif.title,
        message: notif.message,
        actor: notif.actor
          ? {
              userId: notif.actor.id,
              fullName: notif.actor.fullname,
              avatarUrl: notif.actor.avatarUrl || '',
            }
          : null,
        metadata: notif.metadata,
        isRead: notif.isRead,
        createdAt: notif.createdAt,
      }),
    );

    return new ApiResponse(
      true,
      'Lấy danh sách thông báo thành công',
      formattedNotifications,
    );
  }

  // Friend moved
  async createFriendMovedNotifications(
    actorId: string,
    actorName: string,
    friendIds: string[],
    locationName: string,
    lat: number,
    lng: number,
  ) {
    if (friendIds.length === 0) return [];

    const notifications = friendIds.map((friendId) => {
      return this.notificationRepo.create({
        userId: friendId,
        actorId: actorId,
        type: ENotificationType.LOCATION,
        subType: ENotificationSubType.FRIEND_MOVED,
        title: 'Cập nhật vị trí',
        message: `${actorName} vừa đến ${locationName}`,
        metadata: { locationName, lat, lng },
        isRead: false,
      });
    });

    return await this.notificationRepo.save(notifications);
  }

  // Friend near
  async createFriendNearNotification(
    actorId: string,
    actorName: string,
    friendId: string,
    distanceMeters: number,
  ) {
    const notification = this.notificationRepo.create({
      userId: friendId,
      actorId: actorId,
      type: ENotificationType.LOCATION,
      subType: ENotificationSubType.FRIEND_NEAR,
      title: 'Bạn bè ở gần',
      message: `${actorName} đang cách bạn ${distanceMeters}m`,
      metadata: { distance: `${distanceMeters}m` },
      isRead: false,
    });
    
    return await this.notificationRepo.save(notification);
  }

  // Update status
  async createStatusUpdateNotifications(
    actorId: string,
    actorName: string,
    friendIds: string[],
    statusMessage: string,
  ) {
    if (friendIds.length === 0) return [];

    const notifications = friendIds.map((friendId) => {
      return this.notificationRepo.create({
        userId: friendId,
        actorId: actorId,
        type: ENotificationType.ACTIVITY,
        subType: ENotificationSubType.STATUS_UPDATE,
        title: 'Cập nhật trạng thái',
        message: `${actorName} đã cập nhật trạng thái mới: ${statusMessage}`,
        metadata: { statusMessage },
        isRead: false,
      });
    });

    return await this.notificationRepo.save(notifications);
  }

  // System - Security Alert
  async createSecurityAlertNotification(
    userId: string,
    device: string,
    location: string,
    ipAddress: string,
  ) {
    const message = `Phát hiện đăng nhập từ thiết bị lạ (${device}) tại ${location}. Hãy kiểm tra xem có phải bạn không?`;

    const notification = this.notificationRepo.create({
      userId: userId,
      type: ENotificationType.SYSTEM,
      subType: ENotificationSubType.SECURITY_ALERT,
      title: 'Cảnh báo bảo mật',
      message: message,
      metadata: { device, location, ipAddress },
      isRead: false,
    });

    const savedNotification = await this.notificationRepo.save(notification);

    // ==========================================
    // TODO: TÍCH HỢP FIREBASE PUSH NOTIFICATION
    // ==========================================
    // Tại đây, sau khi lưu DB thành công, bạn sẽ gọi service Firebase.
    // VD: await this.firebaseService.sendPushToUser(userId, title, message);
    
    return savedNotification;
  }
}
