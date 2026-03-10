import { Injectable } from '@nestjs/common';
import { UserRepository } from '../users/users.repository';

@Injectable()
export class WebsocketsService {
  private connectedUsers = new Map<string, string>();

  constructor(private userRepository: UserRepository) {}

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

    return disconnectedUserId;
  }

  getSocketId(userId: string): string | undefined {
    return this.connectedUsers.get(userId);
  }
}
