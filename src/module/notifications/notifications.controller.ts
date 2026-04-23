/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  Post,
  Patch,
  Body,
  Delete,
  Param,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../../core/security/jwt/jwt-auth.guard';
import { UsersService } from '../users/users.service';
import { FriendsService } from '../friends/friends.service';
import { NotificationsGateway } from './notifications.gateway';
import { SecurityAlertDto, UpdateStatusDto } from './dto/notifications.dto';
import { buildNotificationPayload } from './notification.calculate';
import { ApiResponse } from 'src/core/dto/ApiResponse.dto';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly usersService: UsersService,
    private readonly friendsService: FriendsService,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async getNotifications(@Req() req: any) {
    const currentUserId = req.user.userId;
    return this.notificationsService.getNotifications(currentUserId);
  }

  @Post('system/security')
  @HttpCode(HttpStatus.OK)
  async triggerSecurityAlert(@Req() req: any, @Body() dto: SecurityAlertDto) {
    const userId = req.user.userId;
    const loc = dto.location || 'vị trí không xác định';

    const notification =
      await this.notificationsService.createSecurityAlertNotification(
        userId,
        dto.device,
        loc,
        dto.ipAddress,
      );

    return new ApiResponse(true, 'Security alert notification', {
      subType: 'SECURITY_ALERT',
      message: notification.message,
      metadata: notification.metadata,
    });
  }

  @Post('activity/status')
  @HttpCode(HttpStatus.OK)
  async updateStatus(@Req() req: any, @Body() dto: UpdateStatusDto) {
    const actorId = req.user.userId;

    // Update status message
    await this.usersService.updateStatusMessage(actorId, dto.statusMessage);

    // Get entity object
    const actor = await this.usersService.findById(actorId);
    if (!actor) return;
    const friendIds = await this.friendsService.getFriendIds(actorId);

    if (friendIds.length > 0) {
      // Create notification DB
      await this.notificationsService.createStatusUpdateNotifications(
        actorId,
        actor.fullname,
        friendIds,
        dto.statusMessage,
      );

      // Emit event
      const payload = buildNotificationPayload(
        'STATUS_UPDATE',
        'Cập nhật trạng thái',
        `${actor.fullname} đã cập nhật trạng thái mới: ${dto.statusMessage}`,
        { statusMessage: dto.statusMessage },
        'ACTIVITY',
      );
      this.notificationsGateway.sendNotificationToFriends(friendIds, payload);
    }

    return new ApiResponse(true, 'Status update notification', {
      subType: 'STATUS_UPDATE',
      message: `${actor.fullname}: ${dto.statusMessage}`,
      metadata: { statusMessage: dto.statusMessage },
    });
  }

  @Patch(':id/responded')
  @HttpCode(HttpStatus.OK)
  async markAsResponded(
    @Req() req: any,
    @Param('id') notificationId: string,
    @Body() body: { action: string },
  ) {
    const currentUserId = req.user.userId;
    await this.notificationsService.markAsResponded(currentUserId, notificationId, body.action);
    return new ApiResponse(true, 'Đã cập nhật trạng thái phản hồi', null);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteNotification(@Req() req: any, @Param('id') notificationId: string) {
    const currentUserId = req.user.userId;
    await this.notificationsService.deleteNotification(currentUserId, notificationId);
    return new ApiResponse(true, 'Đã xoá thông báo', null);
  }
}
