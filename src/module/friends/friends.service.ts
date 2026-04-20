/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable prettier/prettier */
import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Friend } from './entities/friend.entity';
import { User } from '../users/entities/user.entity';
import { FriendStatus, FriendRequestAction, FriendPopupStatus } from './enums/friend-status.enum';
import {
  SendFriendRequestDto,
  FriendRequestResponseDto,
  RespondFriendRequestDto,
  RespondFriendResponseDto as ResponseFriendResponseDto,
  FriendListResponseDto,
  FriendRequestItemDto,
  FriendOnMapDto,
  FriendMapPopupDto,
} from './dto/friend.dto';
import { ApiResponse } from '../../core/dto/ApiResponse.dto';
import { WebsocketsService } from '../websockets/websockets.service';
import { calculateDistance } from 'src/utils/calculate.util';
import { formatDistance, formatLastActive } from 'src/utils/format.util';

@Injectable()
export class FriendsService {
  constructor(
    @InjectRepository(Friend) private readonly friendRepo: Repository<Friend>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly websocketsService: WebsocketsService,
  ) {}

  // Get friends list
  async getFriendList(userId: string): Promise<ApiResponse<FriendListResponseDto[]>> {
    // Get list user's friend
    const friends = await this.friendRepo.find({
      where: [
        { senderId: userId, status: FriendStatus.ACCEPTED },
        { targetUserId: userId, status: FriendStatus.ACCEPTED },
      ],
      relations: ['sender', 'targetUser'], 
    });

    // Get list user online
    const onlineUsers = await this.websocketsService.getOnlineUsers();

    const friendList: FriendListResponseDto[] = friends.map((friend) => {
      const isSenderMe = friend.senderId === userId;
      const otherUser = isSenderMe ? friend.targetUser : friend.sender;
      const isOnline = onlineUsers.includes(otherUser.id);

      return {
        userId: otherUser.id,
        fullName: otherUser.fullname,
        avatarUrl: otherUser.avatarUrl || '',
        onlineStatus: isOnline ? 'ONLINE' : 'OFFLINE',
        lastActive: formatLastActive(otherUser.lastActiveAt, isOnline), 
      };
    });

    return new ApiResponse(true, 'Get friend list successfully', friendList);
  }

  // Get friend requests list
  async getFriendRequests(userId: string): Promise<ApiResponse<FriendRequestItemDto[]>> {
    // Query
    const requests = await this.friendRepo.find({
      where: {
        targetUserId: userId,
        status: FriendStatus.PENDING,
      },
      relations: ['sender'],
      order: {
        createdAt: 'DESC',
      },
    });

    // Return
    const requestList: FriendRequestItemDto[] = requests.map((req) => ({
      requestId: req.id,
      fromUser: {
        userId: req.sender.id,
        fullName: req.sender.fullname,
        avatarUrl: req.sender.avatarUrl || '',
      },
      toUserId: req.targetUserId,
      status: req.status,
      createdAt: req.createdAt,
    }));
    return new ApiResponse(true, 'Get friend requests successfully', requestList);
  }

  // Send friend request
  async sendFriendRequest(
    dto: SendFriendRequestDto,
  ): Promise<ApiResponse<FriendRequestResponseDto>> {
    const { senderId, targetUserId } = dto;

    if (senderId === targetUserId) {
      throw new BadRequestException(
        'Không thể tự gửi lời mời kết bạn cho chính mình',
      );
    }

    // Check user exist
    const sender = await this.userRepo.findOne({ where: { id: senderId } });
    const receiver = await this.userRepo.findOne({
      where: { id: targetUserId },
    });

    if (!sender || !receiver) {
      throw new NotFoundException('Người dùng không tồn tại');
    }

    // Check friend request status
    const existingFriendship = await this.friendRepo.findOne({
      where: [
        { senderId, targetUserId },
        { senderId: targetUserId, targetUserId: senderId },
      ],
    });

    if (existingFriendship) {
      if (existingFriendship.status === FriendStatus.ACCEPTED) {
        throw new BadRequestException('Hai người đã là bạn bè');
      }
      throw new BadRequestException('Lời mời kết bạn đã tồn tại');
    }

    // Save friend request into DB (PENDING)
    const newFriendRequest = this.friendRepo.create({
      senderId,
      targetUserId,
      status: FriendStatus.PENDING,
    });

    const savedRequest = await this.friendRepo.save(newFriendRequest);

    const responseData: FriendRequestResponseDto = {
      requestId: savedRequest.id,
      sender: {
        userId: sender.id,
        fullName: sender.fullname,
        avatarUrl: sender.avatarUrl,
      },
      receiver: {
        userId: receiver.id,
        fullName: receiver.fullname,
        avatarUrl: receiver.avatarUrl,
      },
      status: savedRequest.status,
      createdAt: savedRequest.createdAt,
    };
    return new ApiResponse(true, 'Friend request sent', responseData);
  }

  // Accept/reject friend request
  async responseFriendRequest(
    userId: string, 
    dto: RespondFriendRequestDto
  ): Promise<ApiResponse<ResponseFriendResponseDto>> {
    const { requestId, action } = dto;

    // Find friend request
    const friendRequest = await this.friendRepo.findOne({ where: { id: requestId } });
    if (!friendRequest) {
      throw new NotFoundException('Không tìm thấy lời mời kết bạn này');
    }

    // Security data
    if (friendRequest.targetUserId !== userId) {
      throw new ForbiddenException('Bạn không có quyền xử lý lời mời kết bạn này');
    }
    if (friendRequest.status !== FriendStatus.PENDING) {
      throw new BadRequestException('Lời mời kết bạn này đã được xử lý trước đó');
    }

    // Return
    if (action === FriendRequestAction.ACCEPT) {
      friendRequest.status = FriendStatus.ACCEPTED;
      await this.friendRepo.save(friendRequest);

      return new ApiResponse(true, 'Đã chấp nhận lời mời kết bạn', {
        requestId: friendRequest.id,
        status: FriendStatus.ACCEPTED,
      });
    } else {
      await this.friendRepo.remove(friendRequest);

      return new ApiResponse(true, 'Đã từ chối lời mời kết bạn', {
        requestId: friendRequest.id,
        status: FriendStatus.REJECTED,
      });
    }
  }

  // Delete friend
  async unfriend(userId: string, friendId: string): Promise<ApiResponse<null>> {
    const friendship = await this.friendRepo.findOne({
      where: [
        { senderId: userId, targetUserId: friendId, status: FriendStatus.ACCEPTED },
        { senderId: friendId, targetUserId: userId, status: FriendStatus.ACCEPTED },
      ],
    });

    if (!friendship) {
      throw new NotFoundException('Không tìm thấy quan hệ bạn bè với người dùng này');
    }

    await this.friendRepo.remove(friendship);
    return new ApiResponse(true, 'Đã hủy kết bạn thành công', null);
  }

  // Get list friend render on map
  async getFriendsOnMap(userId: string): Promise<ApiResponse<FriendOnMapDto[]>> {
    // Query DB
    const friends = await this.friendRepo.find({
      where: [
        { senderId: userId, status: FriendStatus.ACCEPTED },
        { targetUserId: userId, status: FriendStatus.ACCEPTED },
      ],
      relations: ['sender', 'targetUser'], 
    });

    // Query websocket
    const onlineUsers = await this.websocketsService.getOnlineUsers() || [];

    const friendsOnMap: FriendOnMapDto[] = [];
    for (const friend of friends) {
      const isSenderMe = friend.senderId === userId;
      const otherUser = isSenderMe ? friend.targetUser : friend.sender;

      if (otherUser.lat !== null && otherUser.lng !== null && otherUser.lat !== undefined) {
        if (otherUser.isHideMyLocation) continue;

        const isOnline = onlineUsers.includes(otherUser.id);
        if (!isOnline) continue; // Only show ONLINE friends on map

        friendsOnMap.push({
          userId: otherUser.id,
          avatarUrl: otherUser.avatarUrl || '',
          latitude: otherUser.lat,
          longitude: otherUser.lng,
          onlineStatus: 'ONLINE',
        });
      }
    }
    return new ApiResponse(true, 'Get friends on map successfully', friendsOnMap);
  }

  // Get profile detail pop up
  async getFriendPopup(
    currentUserId: string, 
    targetUserId: string
  ): Promise<ApiResponse<FriendMapPopupDto>> {
    // Get target and current user
    const targetUser = await this.userRepo.findOne({ where: { id: targetUserId } });
    if (!targetUser) {
      throw new NotFoundException('Người dùng không tồn tại');
    }
    const currentUser = await this.userRepo.findOne({ where: { id: currentUserId } });

    // Friends relation ship
    const friendship = await this.friendRepo.findOne({
      where: [
        { senderId: currentUserId, targetUserId: targetUserId },
        { senderId: targetUserId, targetUserId: currentUserId },
      ],
    });

    let relStatus = FriendPopupStatus.NONE;
    let requestId: string | null = null;
    let isRequester = false;

    if (friendship) {
      requestId = friendship.id;
      isRequester = friendship.senderId === currentUserId;

      if (friendship.status === FriendStatus.ACCEPTED) {
        relStatus = FriendPopupStatus.FRIEND;
      } else if (friendship.status === FriendStatus.PENDING) {
        relStatus = isRequester ? FriendPopupStatus.PENDING_SENT : FriendPopupStatus.PENDING_RECEIVED;
      } else {
        relStatus = FriendPopupStatus.NONE; 
      }
    }

    // Online status
    const onlineUsers = await this.websocketsService.getOnlineUsers() || [];
    const isOnline = onlineUsers.includes(targetUser.id);

    // Calculate distance
    let distanceStr = 'Không xác định';
    if (currentUser?.lat && currentUser?.lng && targetUser.lat && targetUser.lng) {
      const distanceMeters = calculateDistance(currentUser.lat, currentUser.lng, targetUser.lat, targetUser.lng);
      distanceStr = formatDistance(distanceMeters);
    }

    // Calculate rank
    const level = targetUser.level || 1;
    const currentExp = targetUser.currentExp || 0;
    const nextLevelExp = level * 1000;
    const progressPercent = Math.min(Math.round((currentExp / nextLevelExp) * 100), 100);

    // Return data
    const popupData: FriendMapPopupDto = {
      basicInfo: {
        userId: targetUser.id,
        fullName: targetUser.fullname || 'Người dùng ẩn danh',
        username: targetUser.username || '',
        avatarUrl: targetUser.avatarUrl || 'https://ui-avatars.com/api/?name=User',
        onlineStatus: isOnline ? 'ONLINE' : 'OFFLINE',
        lastActive: formatLastActive(targetUser.lastActiveAt, isOnline),
      },
      relationship: {
        status: relStatus,
        requestId: requestId,
        isRequester: isRequester,
      },
      location: {
        address: targetUser.address || 'Chưa cập nhật địa chỉ',
        distance: distanceStr,
        latitude: targetUser.lat,
        longitude: targetUser.lng,
        updatedAt: formatLastActive(targetUser.locationUpdatedAt, false),
      },
      activity: {
        statusMessage: targetUser.statusMessage || '',
        activityType: targetUser.activityType || 'OFFLINE',
        battery: targetUser.battery ?? 0,
        speed: targetUser.speed || 0,
      },
      actions: {
        canChat: relStatus === FriendPopupStatus.FRIEND,
        canShareLocation: relStatus === FriendPopupStatus.FRIEND && !targetUser.isHideMyLocation,
        canNavigate: targetUser.lat !== null,
        canMute: relStatus === FriendPopupStatus.FRIEND,
      },
      privacy: {
        canHideMyLocation: targetUser.isHideMyLocation || false,
      },
      optional: {
        storyUrl: targetUser.storyUrl || '',
        checkInLocation: targetUser.checkInLocation || '',
        rank: {
          level: level,
          name: `Người Khám Phá Lv.${level}`,
          iconUrl: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
          currentExp: currentExp,
          nextLevelExp: nextLevelExp,
          progressPercent: progressPercent,
        },
      },
    };
    return new ApiResponse(true, 'Get friend popup successfully', popupData);
  }

  // Get user's friends
  async getFriendIds(userId: string): Promise<string[]> {
    const friends = await this.friendRepo.find({
      where: [
        { senderId: userId, status: FriendStatus.ACCEPTED },
        { targetUserId: userId, status: FriendStatus.ACCEPTED },
      ],
    });
    
    return friends.map(f => f.senderId === userId ? f.targetUserId : f.senderId);
  }
}
