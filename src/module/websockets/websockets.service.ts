/* eslint-disable @typescript-eslint/require-await */
import { Injectable, OnModuleInit } from '@nestjs/common';
import { UserRepository } from '../users/users.repository';

@Injectable()
export class WebsocketsService implements OnModuleInit {
  private connectedUsers = new Map<string, string>();

  constructor(private userRepository: UserRepository) {}

  // Reset all users to offline when server starts (clear stale data)
  async onModuleInit() {
    try {
      await this.userRepository.update({ isOnline: true }, { isOnline: false });
      console.log('[WebSocket] Reset all users to offline on server start');
    } catch (error) {
      console.error('[WebSocket] Error resetting online users:', error);
    }
  }

  // Handle user online
  async handleUserOnline(userId: string, socketId: string): Promise<void> {
    this.connectedUsers.set(userId, socketId);
    await this.userRepository.update(userId, {
      isOnline: true,
      lastActiveAt: new Date(),
    });
  }

  // Handle user offline
  async handleUserOffline(socketId: string): Promise<string | null> {
    let disconnectedUserId: string | null = null;

    for (const [userId, sId] of this.connectedUsers.entries()) {
      if (sId === socketId) {
        disconnectedUserId = userId;
        break;
      }
    }

    if (disconnectedUserId) {
      this.connectedUsers.delete(disconnectedUserId);
      await this.userRepository.update(disconnectedUserId, {
        isOnline: false,
        lastActiveAt: new Date(),
      });
    }
    console.log(`${disconnectedUserId} đã offline`);
    return disconnectedUserId;
  }

  getSocketId(userId: string): string | undefined {
    return this.connectedUsers.get(userId);
  }

  async getOnlineUsers(): Promise<string[]> {
    return Array.from(this.connectedUsers.keys());
  }

  getUserIdBySocketId(socketId: string): string | null {
    for (const [userId, sId] of this.connectedUsers.entries()) {
      if (sId === socketId) return userId;
    }
    return null;
  }

  getOnlineSockets(userIds: string[]): string[] {
    const sockets: string[] = [];
    userIds.forEach((id) => {
      const socketId = this.connectedUsers.get(id);
      if (socketId) sockets.push(socketId);
    });
    return sockets;
  }
}
