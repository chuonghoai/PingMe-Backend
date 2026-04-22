/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notifications.entity';
import { ApiResponse } from '../../core/dto/ApiResponse.dto';
import { NotificationItemDto } from './dto/notifications.dto';
import { ENotificationSubType, ENotificationType } from './enums/notifications.enum';
import { UserRepository } from '../users/users.repository';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    private readonly userRepository: UserRepository,
  ) { }

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
    return savedNotification;
  }

  // Social - Friend Request received
  async createFriendRequestNotification(
    actorId: string,
    actorName: string,
    actorAvatarUrl: string,
    targetUserId: string,
    requestId: string,
  ) {
    const message = `${actorName} đã gửi cho bạn lời mời kết bạn`;

    const notification = this.notificationRepo.create({
      userId: targetUserId,
      type: ENotificationType.SOCIAL,
      subType: ENotificationSubType.FRIEND_REQUEST,
      title: 'Lời mời kết bạn',
      message: message,
      metadata: { actorId, actorName, actorAvatarUrl, requestId },
      isRead: false,
    });

    const savedNotification = await this.notificationRepo.save(notification);
    return savedNotification;
  }

  // Social - Friend Request accepted
  async createFriendAcceptedNotification(
    actorId: string,
    actorName: string,
    actorAvatarUrl: string,
    targetUserId: string,
    conversationId: string | null,
  ) {
    const message = `${actorName} đã chấp nhận lời mời kết bạn của bạn`;

    const notification = this.notificationRepo.create({
      userId: targetUserId,
      type: ENotificationType.SOCIAL,
      subType: ENotificationSubType.FRIEND_ACCEPTED,
      title: 'Kết bạn thành công',
      message: message,
      metadata: { actorId, actorName, actorAvatarUrl, conversationId },
      isRead: false,
    });

    const savedNotification = await this.notificationRepo.save(notification);
    return savedNotification;
  }

  // Social - Nudge Received
  async createNudgeNotification(
    actorId: string,
    actorName: string,
    actorAvatarUrl: string,
    targetUserId: string,
  ) {
    const message = `${actorName} vừa chọc bạn! Hãy phản hồi lại.`;

    const notification = this.notificationRepo.create({
      userId: targetUserId,
      type: ENotificationType.SOCIAL,
      subType: ENotificationSubType.NUDGE_RECEIVED,
      title: 'Có người chọc bạn',
      message: message,
      metadata: { actorId, actorName, actorAvatarUrl },
      isRead: false,
    });

    return await this.notificationRepo.save(notification);
  }

  // Social - Moment New
  async createMomentNotification(
    actorId: string,
    actorName: string,
    actorAvatarUrl: string,
    friendIds: string[],
    momentId: string,
    momentImageUrl: string,
  ) {
    if (friendIds.length === 0) return [];

    const message = `${actorName} vừa chia sẻ khoảnh khắc mới.`;

    const notifications = friendIds.map(targetUserId => {
      return this.notificationRepo.create({
        userId: targetUserId,
        type: ENotificationType.ACTIVITY,
        subType: ENotificationSubType.MOMENT_NEW,
        title: 'Khoảnh khắc mới',
        message: message,
        metadata: { actorId, actorName, actorAvatarUrl, momentId, momentImageUrl },
        isRead: false,
      });
    });

    return await this.notificationRepo.save(notifications);
  }

  // Social - Moment Reaction
  async createMomentReactionNotification(
    actorId: string,
    actorName: string,
    actorAvatarUrl: string,
    targetUserId: string,
    momentId: string,
  ) {
    const message = `${actorName} đã thả tim khoảnh khắc của bạn.`;

    const notification = this.notificationRepo.create({
      userId: targetUserId,
      type: ENotificationType.ACTIVITY,
      subType: ENotificationSubType.MOMENT_REACTION,
      title: 'Tương tác mới',
      message: message,
      metadata: { actorId, actorName, actorAvatarUrl, momentId },
      isRead: false,
    });

    return await this.notificationRepo.save(notification);
  }

  // Social - Proximity Meetup
  async createProximityMeetupNotification(
    user1Id: string,
    user2Id: string,
    user1Name: string,
    user2Name: string,
  ) {
    // We create for both users
    const msgFor1 = `Bạn và ${user2Name} vừa đi lướt qua nhau!`;
    const msgFor2 = `Bạn và ${user1Name} vừa đi lướt qua nhau!`;

    const notifications = [
      this.notificationRepo.create({
        userId: user1Id,
        type: ENotificationType.LOCATION,
        subType: ENotificationSubType.PROXIMITY_MEETUP,
        title: 'Gặp gỡ tình cờ',
        message: msgFor1,
        metadata: { friendId: user2Id, friendName: user2Name },
        isRead: false,
      }),
      this.notificationRepo.create({
        userId: user2Id,
        type: ENotificationType.LOCATION,
        subType: ENotificationSubType.PROXIMITY_MEETUP,
        title: 'Gặp gỡ tình cờ',
        message: msgFor2,
        metadata: { friendId: user1Id, friendName: user1Name },
        isRead: false,
      })
    ];

    return await this.notificationRepo.save(notifications);
  }

  // Social - Intimacy Level Up
  async createIntimacyLevelUpNotification(
    userId: string,
    friendId: string,
    friendName: string,
    newLevel: number,
  ) {
    const message = `Tình bạn giữa bạn và ${friendName} vừa đạt Level ${newLevel}!`;

    const notification = this.notificationRepo.create({
      userId: userId,
      type: ENotificationType.SOCIAL,
      subType: ENotificationSubType.INTIMACY_LEVEL_UP,
      title: 'Thăng cấp tình bạn',
      message: message,
      metadata: { friendId, friendName, newLevel },
      isRead: false,
    });

    return await this.notificationRepo.save(notification);
  }

  // Delete notification
  async deleteNotification(userId: string, notificationId: string) {
    try {
      await this.notificationRepo.delete({ id: notificationId, userId: userId });
      console.log(`[NotificationService] Deleted notification ${notificationId} for user ${userId}`);
    } catch (err) {
      console.error(`[NotificationService] Error deleting notification:`, err);
    }
  }

  async createMapEventNotificationToAll(
    eventName: string,
    rewardItem: string,
    rewardQuantity: number,
    eventId: string,
  ): Promise<void> {
    try {
      const users = await this.userRepository.find({ select: ['id'] });

      if (!users || users.length === 0) return;

      const title = '🌟 Sự kiện Bản đồ mới!';
      const message = `Nhiệm vụ: ${eventName} vừa xuất hiện. Phần thưởng:${" " + rewardQuantity} ${rewardItem}`;

      const notifications = users.map((user) => {
        return this.notificationRepo.create({
          userId: user.id,
          type: ENotificationType.EVENT,
          subType: ENotificationSubType.EVENT,
          title: title,
          message: message,
          isRead: false,
          metadata: {
            eventId: eventId,
          }
        });
      });

      const chunkSize = 1000;
      for (let i = 0; i < notifications.length; i += chunkSize) {
        const chunk = notifications.slice(i, i + chunkSize);
        await this.notificationRepo.insert(chunk);
      }

      console.log(`[Notification] Đã tạo thành công thông báo sự kiện cho ${users.length} users.`);
    } catch (error) {
      console.error('[Notification] Lỗi khi tạo thông báo sự kiện toàn server:', error);
    }
  }
}
