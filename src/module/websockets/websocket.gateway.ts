/* eslint-disable @typescript-eslint/await-thenable */
/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ENV_VARS } from 'src/constants/env.constants';
import { WebsocketsService } from './websockets.service';
import { ConversationService } from '../conversations/conversations.service';
import { MessagesService } from '../messages/messages.service';
import { UsersService } from '../users/users.service';
import { FriendsService } from '../friends/friends.service';
import { Throttle } from '@nestjs/throttler';
import { IntimacyService } from '../intimacy/intimacy.service';
import { EIntimacyEventType } from '../intimacy/entities/intimacy-event.entity';
import { NotificationsService } from '../notifications/notifications.service';

@WebSocketGateway({ cors: { origin: '*' } })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // Key: "userId_friendId" (sorted), Value: timestamp
  private meetupCooldowns = new Map<string, number>();

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private websocketsService: WebsocketsService,
    private messagesService: MessagesService,
    private conversationService: ConversationService,
    private usersService: UsersService,
    private friendsService: FriendsService,
    private intimacyService: IntimacyService,
    private notificationsService: NotificationsService,
  ) { }

  afterInit(server: Server) {
    this.websocketsService.setServer(server);
  }

  // Connect websocket
  async handleConnection(client: Socket) {
    try {
      // Checktoken
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.split(' ')[1];
      if (!token) return client.disconnect();

      // Get userId from access token
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>(ENV_VARS.JWT_ACCESS_SECRET),
      });
      const userId = payload.userId;
      client.data.userId = userId;

      await this.websocketsService.handleUserOnline(userId, client.id);
      console.log(`${userId} đã online`);
      console.log(`${client.id} đã online`);

      // Emit event
      client.emit('connected', { success: true, userId: userId });
      client.broadcast.emit('user_online', { userId: userId });

      const currentOnlineUsers = await this.websocketsService.getOnlineUsers();
      client.emit('online_users_list', currentOnlineUsers);
    } catch (error) {
      client.disconnect();
    }
  }

  // Disconnect websocket
  async handleDisconnect(client: Socket) {
    const disconnectedUserId = await this.websocketsService.handleUserOffline(
      client.id,
    );

    // Emit event
    if (disconnectedUserId) {
      this.server.emit('user_offline', {
        userId: disconnectedUserId,
        lastActiveAt: new Date(),
      });
    }
  }

  // Typing
  @SubscribeMessage('typing')
  @Throttle({ default: { limit: 10, ttl: 1000 } })
  async handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { conversationId: string; isTyping: boolean },
  ) {
    const senderId = client.data.userId;
    if (payload.isTyping)
      console.log(`${senderId} dang typing`)
    else
      console.log(`${senderId} dung typing`)
    // eslint-disable-next-line prettier/prettier
    const receiverIds = await this.conversationService.getParticipantIds(payload.conversationId, senderId);
    receiverIds.forEach((receiverId) => {
      const socketId = this.websocketsService.getSocketId(receiverId);
      if (socketId) {
        this.server.to(socketId).emit('is_typing', {
          conversationId: payload.conversationId,
          userId: senderId,
          isTyping: payload.isTyping,
        });
      }
    });
  }

  // Send message
  @SubscribeMessage('send_message')
  @Throttle({ default: { limit: 10, ttl: 1000 } })
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: {
      conversationId: string;
      content?: string;
      type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO';
      mediaId?: string;
      temporaryId?: string;
      replyToId?: string;
    },
  ) {
    try {
      const senderId = client.data.userId;

      const result = await this.messagesService.saveNewMessage(
        senderId,
        payload,
      );

      const receiverIds = await this.conversationService.getParticipantIds(
        payload.conversationId,
        senderId,
      );

      receiverIds.forEach((receiverId) => {
        const socketId = this.websocketsService.getSocketId(receiverId);
        if (socketId) {
          this.server.to(socketId).emit('new_message', {
            conversationId: payload.conversationId,
            message: result.message,
            conversation: result.conversation
          });
        } else {
          // Nếu user tắt app -> Gọi Firebase Push Notification (FCM) ở đây
          // this.fcmService.sendNotification(receiverId, ...);
        }
      });
      client.emit('message_sent_success', {
        temporaryId: payload.temporaryId,
        message: result.message,
      });
    } catch (error) {
      client.emit('message_error', {
        temporaryId: payload.temporaryId,
        message: error.message || 'Không thể gửi tin nhắn'
      });
    }
  }

  // Mark read message
  @SubscribeMessage('mark_read')
  async handleMarkRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { conversationId: string }
  ) {
    // Tìm userId từ socket id
    const userId = this.websocketsService.getUserIdBySocketId(client.id);
    if (!userId) return;

    if (userId && payload.conversationId) {
      // Reset unreadCount về 0
      await this.conversationService.resetUnreadCount(payload.conversationId, userId);
      await this.messagesService.markMessagesAsRead(payload.conversationId, userId);

      client.emit('unread_count_updated', { conversationId: payload.conversationId, unreadCount: 0 });

      const receiverIds = await this.conversationService.getParticipantIds(
        payload.conversationId,
        userId,
      );

      receiverIds.forEach((receiverId) => {
        const socketId = this.websocketsService.getSocketId(receiverId);
        if (socketId) {
          this.server.to(socketId).emit('messages_read', {
            conversationId: payload.conversationId,
            userId: userId,
            timestamp: new Date().toISOString(),
          });
        }
      });
      console.log(`[WebSocket] User ${userId} đã đọc tin nhắn trong box ${payload.conversationId}`);
    }
  }

  // Revoke message
  @SubscribeMessage('revoke_message')
  @Throttle({ default: { limit: 10, ttl: 1000 } })
  async handleRevokeMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { messageId: string; conversationId: string },
  ) {
    const senderId = client.data.userId;

    const revokedMessage = await this.messagesService.revokeMessage(
      payload.messageId,
      senderId,
    );

    if (revokedMessage) {
      const receiverIds = await this.conversationService.getParticipantIds(
        payload.conversationId,
        senderId,
      );

      receiverIds.forEach((receiverId) => {
        const socketId = this.websocketsService.getSocketId(receiverId);
        if (socketId) {
          this.server.to(socketId).emit('message_revoked', {
            messageId: payload.messageId,
            conversationId: payload.conversationId,
          });
        }
      });
    }
  }

  // Update location & broadcast to friends
  @SubscribeMessage('update_location')
  @Throttle({ default: { limit: 5, ttl: 5000 } })
  async handleUpdateLocation(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { lat: number; lng: number; speed?: number; battery?: number; isCharging?: boolean },
  ) {
    const userId = client.data.userId;
    if (!userId || payload.lat == null || payload.lng == null) return;

    // Save location to DB & get user object
    const user = await this.usersService.updateLocation(userId, payload.lat, payload.lng, payload.speed, payload.battery, payload.isCharging);

    // Broadcast to online friends & Calculate Proximity Intimacy
    const friendIds = await this.friendsService.getFriendIds(userId);
    for (const friendId of friendIds) {
      const socketId = this.websocketsService.getSocketId(friendId);
      if (socketId) {
        this.server.to(socketId).emit('friend_location_update', {
          userId,
          lat: payload.lat,
          lng: payload.lng,
          fullName: user.fullname || '',
          avatarUrl: user.avatarUrl || '',
          updatedAt: new Date(),
        });

        // ── Proximity Intimacy Logic ──
        const friendInfo = await this.usersService.findById(friendId);
        if (friendInfo?.lat && friendInfo?.lng) {
          const R = 6371;
          const dLat = (friendInfo.lat - payload.lat) * (Math.PI / 180);
          const dLon = (friendInfo.lng - payload.lng) * (Math.PI / 180);
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(payload.lat * (Math.PI / 180)) * Math.cos(friendInfo.lat * (Math.PI / 180)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          const distanceKM = R * c;

          if (distanceKM <= 0.05) {
            this.intimacyService.processInteraction(userId, friendId, EIntimacyEventType.PROXIMITY).catch(console.error);
          }

          // ── Proximity Meet-up Logic (30 meters) ──
          if (distanceKM <= 0.03) {
            const pairKey = [userId, friendId].sort().join('_');
            const now = Date.now();
            const lastMeetup = this.meetupCooldowns.get(pairKey) || 0;

            // Cooldown: 3 hours = 3 * 60 * 60 * 1000 = 10800000 ms
            if (now - lastMeetup > 10800000) {
              this.meetupCooldowns.set(pairKey, now);

              // 1. Emit to the two users involved for the Ping Modal
              const u1Socket = this.websocketsService.getSocketId(userId);
              const u2Socket = this.websocketsService.getSocketId(friendId);

              const midLat = (payload.lat + friendInfo.lat) / 2;
              const midLng = (payload.lng + friendInfo.lng) / 2;

              const meetupPayload = {
                user1: userId,
                user2: friendId,
                user1Name: user.fullname || '',
                user2Name: friendInfo.fullname || '',
                lat: midLat,
                lng: midLng,
              };

              if (u1Socket) this.server.to(u1Socket).emit('proximity_meetup', meetupPayload);
              if (u2Socket) this.server.to(u2Socket).emit('proximity_meetup', meetupPayload);

              // 2. Broadcast to Mutual Friends
              this.friendsService.getFriendIds(userId).then(u1Friends => {
                this.friendsService.getFriendIds(friendId).then(u2Friends => {
                  const mutualFriends = u1Friends.filter(id => u2Friends.includes(id));
                  mutualFriends.forEach(mfId => {
                    // Do not send to the two users themselves
                    if (mfId === userId || mfId === friendId) return;
                    const mfSocket = this.websocketsService.getSocketId(mfId);
                    if (mfSocket) {
                      this.server.to(mfSocket).emit('proximity_broadcast', meetupPayload);
                    }
                  });
                });
              });

              // 3. Create persistent Notification
              this.notificationsService.createProximityMeetupNotification(
                userId, friendId, user.fullname || '', friendInfo.fullname || ''
              ).catch(e => console.log('Proximity notification error', e));
            }
          }
        }
      }
    }
  }

  // Ping/Wave Friend
  @SubscribeMessage('ping_friend')
  @Throttle({ default: { limit: 5, ttl: 5000 } })
  async handlePingFriend(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { friendId: string },
  ) {
    const senderId = client.data.userId;
    if (!senderId || !payload.friendId) return;

    const socketId = this.websocketsService.getSocketId(payload.friendId);
    if (socketId) {
      const sender = await this.usersService.findById(senderId);
      this.server.to(socketId).emit('receive_nudge', {
        senderId,
        senderName: sender?.fullname || 'Một người bạn',
        timestamp: new Date().toISOString(),
      });

      // 2. Persistent Notification
      if (sender) {
        this.notificationsService.createNudgeNotification(
          senderId, sender.fullname, sender.avatarUrl || '', payload.friendId
        ).catch(e => console.log('Nudge notification error', e));
      }

      client.emit('ping_sent_success', { success: true });
    } else {
      client.emit('ping_error', { message: 'Người bạn này đang ngoại tuyến.' });
    }
  }

  // Request Location Update
  @SubscribeMessage('req_location_update')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  async handleReqLocationUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { friendId: string },
  ) {
    const senderId = client.data.userId;
    if (!senderId || !payload.friendId) return;

    const socketId = this.websocketsService.getSocketId(payload.friendId);
    if (socketId) {
      this.server.to(socketId).emit('request_location_update', {
        requestedBy: senderId,
      });
      client.emit('req_location_sent_success', { success: true });
    } else {
      client.emit('req_location_error', { message: 'Người bạn này đang ngoại tuyến.' });
    }
  }
}
