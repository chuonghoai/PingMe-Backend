/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notifications.entity';
import { ApiResponse } from '../../core/dto/ApiResponse.dto';
import { NotificationItemDto } from './dto/notifications.dto';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
  ) {}

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
}
