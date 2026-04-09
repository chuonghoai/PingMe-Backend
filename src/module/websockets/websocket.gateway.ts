/* eslint-disable prettier/prettier */
 
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

@WebSocketGateway({ cors: { origin: '*' } })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private websocketsService: WebsocketsService,
    private messagesService: MessagesService,
    private conversationService: ConversationService,
    private usersService: UsersService,
    private friendsService: FriendsService,
  ) { }

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
    const senderId = client.data.userId;

    const savedMessage = await this.messagesService.saveNewMessage(
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
        this.server.to(socketId).emit('new_message', savedMessage);
      } else {
        // Nếu user tắt app -> Gọi Firebase Push Notification (FCM) ở đây
        // this.fcmService.sendNotification(receiverId, ...);
      }
    });
    client.emit('message_sent_success', {
      temporaryId: payload.temporaryId,
      message: savedMessage,
    });
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

    // Reset unreadCount về 0
    await this.conversationService.resetUnreadCount(payload.conversationId, userId);
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
    @MessageBody() payload: { lat: number; lng: number },
  ) {
    const userId = client.data.userId;
    if (!userId || payload.lat == null || payload.lng == null) return;

    // Save location to DB & get user object
    const user = await this.usersService.updateLocation(userId, payload.lat, payload.lng);

    // Broadcast to online friends
    const friendIds = await this.friendsService.getFriendIds(userId);
    friendIds.forEach((friendId) => {
      const socketId = this.websocketsService.getSocketId(friendId);
      if (socketId) {
        this.server.to(socketId).emit('friend_location_update', {
          userId,
          lat: payload.lat,
          lng: payload.lng,
          avatarUrl: user.avatarUrl || '',
          updatedAt: new Date(),
        });
      }
    });
  }
}

