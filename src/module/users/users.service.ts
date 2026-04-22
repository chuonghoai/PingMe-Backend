/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/require-await */
import { forwardRef, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiResponse } from 'src/core/dto/ApiResponse.dto';
import { UserRepository } from './users.repository';
import { CustomException } from 'src/core/exceptions/custom.exception';
import { NearbyUserResponseDto, UpdateUserRequest } from './dto/user-request.dto';
import { WebsocketsService } from '../websockets/websockets.service';
import { Like, Not, IsNull, In } from 'typeorm';
import { calculateDistance } from 'src/utils/calculate.util';
import { Friend } from '../friends/entities/friend.entity';

@Injectable()
export class UsersService {
  constructor(
    private userRepository: UserRepository,
    @Inject(forwardRef(() => WebsocketsService))
    private readonly websocketsService: WebsocketsService,
    @InjectRepository(Friend)
    private readonly friendRepo: Repository<Friend>,
  ) {}

  // ── Helper: Get accepted friend IDs for a user (direct DB query, no circular dep) ──
  private async getAcceptedFriendIds(userId: string): Promise<string[]> {
    const friends = await this.friendRepo.find({
      where: [
        { senderId: userId, status: 'ACCEPTED' as any },
        { targetUserId: userId, status: 'ACCEPTED' as any },
      ],
    });

    const friendIds = friends.map(f => f.senderId === userId ? f.targetUserId : f.senderId);
    console.log(`[Friends] getAcceptedFriendIds for ${userId}: found ${friends.length} friendships, friendIds=[${friendIds.join(', ')}]`);
    return friendIds;
  }

  // ── Helper: Get friendship status between two users ──
  private async getFriendshipStatus(userId: string, targetId: string): Promise<{ isFriend: boolean; status: string | null; requestId: string | null }> {
    const friendship = await this.friendRepo.findOne({
      where: [
        { senderId: userId, targetUserId: targetId },
        { senderId: targetId, targetUserId: userId },
      ],
    });

    if (!friendship) {
      return { isFriend: false, status: null, requestId: null };
    }

    return {
      isFriend: friendship.status === ('ACCEPTED' as any),
      status: friendship.status,
      requestId: friendship.id,
    };
  }

  // find by id
  async findById(userId: string) {
    return this.userRepository.findById(userId);
  }

  // find list users by id
  async findUsersByIds(userIds: string[]) {
    if (!userIds || userIds.length === 0) return [];
    return this.userRepository.find({
      where: { id: In(userIds) }
    });
  }

  // API get user by id
  async getUserBy(userId: string): Promise<ApiResponse<any>> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new CustomException(
        HttpStatus.NOT_FOUND,
        'USER_NOT_FOUND',
        'Không tìm thấy thông tin người dùng',
      );
    }

    return new ApiResponse(true, 'Lấy thông tin hồ sơ thành công', user);
  }

  // Update user
  async updateUser(userId: string, updateUseRequest: UpdateUserRequest): Promise<ApiResponse<any>> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new CustomException(HttpStatus.NOT_FOUND, 'USER_NOT_FOUND', 'Không tìm thấy người dùng');
    }

    if (updateUseRequest.fullname !== undefined) user.fullname = updateUseRequest.fullname;
    if (updateUseRequest.avatarUrl !== undefined) user.avatarUrl = updateUseRequest.avatarUrl;
    if (updateUseRequest.phone !== undefined) user.phone = updateUseRequest.phone;
    if (updateUseRequest.gender !== undefined) user.gender = updateUseRequest.gender;
    if (updateUseRequest.dob !== undefined) user.dob = new Date(updateUseRequest.dob);
    if (updateUseRequest.bio !== undefined) user.bio = updateUseRequest.bio;

    await this.userRepository.save(user);

    return new ApiResponse(
      true,
      'Cập nhật thông tin thành công',
      null
    )
  }


  // Get user nearby raduis 
  async getNearbyUsers(
    userId: string, 
    lat: number, lng: number, 
    radius: number
  ): Promise<ApiResponse<any[]>> {
    await this.userRepository.update(userId, { lat, lng, locationUpdatedAt: new Date() });

    // Get user online
    const onlineUsers = await this.websocketsService.getOnlineUsers() || [];
    const otherOnlineUsers = onlineUsers.filter(id => id !== userId);
    console.log(`[Nearby] User ${userId} at (${lat}, ${lng}), radius=${radius}m`);
    console.log(`[Nearby] Online users: ${onlineUsers.length}, other online: ${otherOnlineUsers.length}`);
    
    if (otherOnlineUsers.length === 0) {
      return new ApiResponse(true, 'Không có ai đang online ở gần', []);
    }

    // Get accepted friend IDs for friendship check
    const friendIds = await this.getAcceptedFriendIds(userId);

    // Get user have coordinates
    const users = await this.userRepository.find({
      where: {
        id: In(otherOnlineUsers),
        lat: Not(IsNull()),
        lng: Not(IsNull()),
      },
    });
    console.log(`[Nearby] Users with coordinates: ${users.length}`);

    // Compute distance
    const nearbyUsers: any[] = [];
    for (const user of users) {
      const distance = calculateDistance(lat, lng, user.lat, user.lng);
      console.log(`[Nearby] User ${user.fullname} (${user.id}) -> distance=${distance}m, isFriend=${friendIds.includes(user.id)}`);
      
      if (distance <= radius) {
        nearbyUsers.push({
          userId: user.id,
          fullName: user.fullname,
          avatarUrl: user.avatarUrl || '',
          distance: `${distance}m`,
          isFriend: friendIds.includes(user.id),
        });
      }
    }

    nearbyUsers.sort((a, b) => parseInt(a.distance) - parseInt(b.distance));
    return new ApiResponse(true, 'Nearby users fetched', nearbyUsers);
  }

  // Update location in DB
  async updateLocation(actorId: string, lat: number, lng: number, speed?: number, battery?: number, isCharging?: boolean): Promise<any> {
    const user = await this.userRepository.findById(actorId);
    if (!user) {
      throw new CustomException(HttpStatus.NOT_FOUND, 'USER_NOT_FOUND', 'Không tìm thấy người dùng');
    }

    user.lat = lat;
    user.lng = lng;
    if (speed !== undefined) user.speed = speed;
    if (battery !== undefined) user.battery = battery;
    if (isCharging !== undefined) user.isCharging = isCharging;
    user.locationUpdatedAt = new Date();
    await this.userRepository.save(user);
    return user;
  }

  // Start/stop share location
  async toggleLocationShare(userId: string, action: string): Promise<ApiResponse<any>> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new CustomException(HttpStatus.NOT_FOUND, 'USER_NOT_FOUND', 'Không tìm thấy người dùng');
    }

    const isHide = action === 'STOP';

    user.isHideMyLocation = isHide;
    await this.userRepository.save(user);

    const message = isHide 
      ? 'Đã tắt tính năng chia sẻ vị trí' 
      : 'Đã bật tính năng chia sẻ vị trí';

    return new ApiResponse(true, message, {
      userId: user.id,
      isHideMyLocation: user.isHideMyLocation,
    });
  }

  // Update status message
  async updateStatusMessage(userId: string, statusMessage: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new CustomException(HttpStatus.NOT_FOUND, 'USER_NOT_FOUND', 'Không tìm thấy người dùng');
    }

    user.statusMessage = statusMessage;
    await this.userRepository.save(user);
  }

  // Fetch suggested or search users
  async searchUsers(query: string, currentUserId: string): Promise<ApiResponse<any>> {
    if (!query || query.trim() === '') {
      return new ApiResponse(true, 'Empty query', []);
    }
    const searchTerm = `%${query.trim()}%`;
    const users = await this.userRepository.find({
      where: [
        { email: Like(searchTerm) },
        { fullname: Like(searchTerm) },
      ],
      take: 20,
    });
    
    // Filter out current user
    const filteredUsers = users.filter(u => u.id !== currentUserId);

    // Get accepted friend IDs for friendship check
    const friendIds = await this.getAcceptedFriendIds(currentUserId);

    const result = await Promise.all(filteredUsers.map(async u => {
      const isFriend = friendIds.includes(u.id);
      const friendshipInfo = await this.getFriendshipStatus(currentUserId, u.id);
      
      console.log(`[Search] User "${u.fullname}" (${u.id}): isFriend=${isFriend}, status=${friendshipInfo.status}`);

      return {
        userId: u.id,
        fullName: u.fullname,
        avatarUrl: u.avatarUrl || '',
        isFriend: isFriend,
        friendshipStatus: friendshipInfo.status, // 'ACCEPTED' | 'PENDING' | 'REJECTED' | null
        requestId: friendshipInfo.requestId,
      };
    }));

    return new ApiResponse(true, 'Search results', result);
  }
}
