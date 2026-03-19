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
}
