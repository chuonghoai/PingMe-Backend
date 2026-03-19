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

@WebSocketGateway({ cors: { origin: '*' } }) // Vẫn dùng chung cổng mặc định
export class NotificationsGateway {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly friendsService: FriendsService,
    private readonly usersService: UsersService,
    @Inject(forwardRef(() => WebsocketsService))
    private readonly websocketsService: WebsocketsService,
  ) {}

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
    const actor = (await this.usersService.getUserBy(actorId)).data;
    const friendIds = await this.friendsService.getFriendIds(actorId);
    await this.notificationsService.createFriendMovedNotifications(
      actorId,
      actor.fullname,
      friendIds,
      payload.locationName,
      payload.lat,
      payload.lng,
    );

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
}
