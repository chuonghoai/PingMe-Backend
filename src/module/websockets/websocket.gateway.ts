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
  ) {}

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
}
