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
import { calculateDistance } from 'src/utils/calculate.util';

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

  // auto get notification if someone (friend) go to order place
  @SubscribeMessage('location_moved')
  async handleLocationMoved(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { locationName: string; lat: number; lng: number },
  ) {
    // Get actor in websocket
    const actorId = this.websocketsService.getUserIdBySocketId(client.id);
    if (!actorId) return;

    // Update location last update
    await this.usersService.updateLocation(actorId, payload.lat, payload.lng);

    // Create notification
    const actor = await this.usersService.findById(actorId);
    if (!actor) return;
    const friendIds = await this.friendsService.getFriendIds(actorId);
    if (friendIds.length === 0) return;

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
      this.server.to(onlineSockets).emit('new_notification', {
        type: 'LOCATION',
        subType: 'FRIEND_MOVED',
        title: 'Cập nhật vị trí',
        message: `${actor.fullname} vừa đến ${payload.locationName}`,
        metadata: payload,
      });
    }
  }

  // auto push notification if actor move near friends
  @SubscribeMessage('check_friend_near')
  async handleFriendNear(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { distance?: number },
  ) {
    // Find actor
    const actorId = this.websocketsService.getUserIdBySocketId(client.id);
    if (!actorId) return;

    // distance limit and actor's coordinates
    const distanceLimit = payload?.distance || 500;
    const actor = await this.usersService.findById(actorId);
    if (!actor || !actor.lat || !actor.lng) return;

    // Get list friend
    const friendIds = await this.friendsService.getFriendIds(actorId);
    if (friendIds.length === 0) return;
    const friends = await this.usersService.findUsersByIds(friendIds);

    // Caculate distance
    for (const friend of friends) {
      if (!friend.lat || !friend.lng) continue;

      const dist = calculateDistance(
        actor.lat,
        actor.lng,
        friend.lat,
        friend.lng,
      );
      const cacheKey = `${actorId}_${friend.id}`;

      if (dist <= distanceLimit) {
        // Anti spam request
        const lastNotified = this.notifiedNearFriends.get(cacheKey);
        const now = Date.now();
        if (lastNotified && now - lastNotified < 30 * 60 * 1000) {
          continue;
        }

        this.notifiedNearFriends.set(cacheKey, now);

        // Create notification
        await this.notificationsService.createFriendNearNotification(
          actorId,
          actor.fullname,
          friend.id,
          dist,
        );

        // Emit event
        const socketId = this.websocketsService.getSocketId(friend.id);
        if (socketId) {
          this.server.to(socketId).emit('new_notification', {
            type: 'LOCATION',
            subType: 'FRIEND_NEAR',
            title: 'Bạn bè ở gần',
            message: `${actor.fullname} đang cách bạn ${dist}m`,
            metadata: { distance: `${dist}m` },
          });
        }
      } else {
        if (this.notifiedNearFriends.has(cacheKey)) {
          this.notifiedNearFriends.delete(cacheKey);
        }
      }
    }
  }
}
