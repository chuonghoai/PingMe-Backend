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

@WebSocketGateway({ cors: { origin: '*' } })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private websocketsService: WebsocketsService,
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

      // Emit event
      client.emit('connected', { success: true, userId: userId });
      client.broadcast.emit('user_online', { userId: userId });
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
}
