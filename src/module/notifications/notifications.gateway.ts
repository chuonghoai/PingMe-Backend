/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { NotificationsService } from './notifications.service';
import { WebsocketsService } from '../websockets/websockets.service';
import { FriendsService } from '../friends/friends.service';
import { UsersService } from '../users/users.service';
import { forwardRef, Inject } from '@nestjs/common';
import {
  processFriendNear,
  buildNotificationPayload,
} from './notification.calculate';

@WebSocketGateway({ cors: { origin: '*' } })
export class NotificationsGateway {
  @WebSocketServer() server: Server;

  private notifiedNearFriends = new Map<string, number>();

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly friendsService: FriendsService,
    private readonly usersService: UsersService,
    @Inject(forwardRef(() => WebsocketsService))
    private readonly websocketsService: WebsocketsService,
  ) {}

  // Auto get notification if someone (friend) go to order place
  @SubscribeMessage('location_moved')
  async handleLocationMoved(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { locationName: string; lat: number; lng: number },
  ) {
    // get actorId
    const actorId = this.websocketsService.getUserIdBySocketId(client.id);
    if (!actorId) return;

    // Update actor's location in DB
    await this.usersService.updateLocation(actorId, payload.lat, payload.lng);

    // Find entity actor
    const actor = await this.usersService.findById(actorId);
    if (!actor) return;

    // get list friend ids
    const friendIds = await this.friendsService.getFriendIds(actorId);
    if (friendIds.length === 0) return;

    // Create notification in DB
    await this.notificationsService.createFriendMovedNotifications(
      actorId,
      actor.fullname,
      friendIds,
      payload.locationName,
      payload.lat,
      payload.lng,
    );

    // Emit event
    const onlineSockets = this.websocketsService.getOnlineSockets(friendIds);
    if (onlineSockets.length > 0) {
      const emitPayload = buildNotificationPayload(
        'FRIEND_MOVED',
        'Cập nhật vị trí',
        `${actor.fullname} vừa đến ${payload.locationName}`,
        payload,
      );
      this.server.to(onlineSockets).emit('new_notification', emitPayload);
    }
  }

  // Auto push notification if actor move near friends
  @SubscribeMessage('check_friend_near')
  async handleFriendNear(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { distance?: number },
  ) {
    // get actor Id
    const actorId = this.websocketsService.getUserIdBySocketId(client.id);
    if (!actorId) return;

    // Default distance limit ?
    const distanceLimit = payload?.distance || 500;

    // get actor entity
    const actor = await this.usersService.findById(actorId);
    if (!actor || !actor.lat || !actor.lng) return;

    // get list friends entity
    const friendIds = await this.friendsService.getFriendIds(actorId);
    if (friendIds.length === 0) return;
    const friends = await this.usersService.findUsersByIds(friendIds);

    for (const friend of friends) {
      if (!friend.lat || !friend.lng) continue;

      const { shouldNotify, distance } = processFriendNear(
        actor.lat,
        actor.lng,
        friend.lat,
        friend.lng,
        actorId,
        friend.id,
        distanceLimit,
        this.notifiedNearFriends,
      );

      if (shouldNotify) {
        // create notification entity
        await this.notificationsService.createFriendNearNotification(
          actorId,
          actor.fullname,
          friend.id,
          distance,
        );

        // emit event
        const socketId = this.websocketsService.getSocketId(friend.id);
        if (socketId) {
          const emitPayload = buildNotificationPayload(
            'FRIEND_NEAR',
            'Bạn bè ở gần',
            `${actor.fullname} đang cách bạn ${distance}m`,
            { distance: `${distance}m` },
          );
          this.server.to(socketId).emit('new_notification', emitPayload);
        }
      }
    }
  }
}
