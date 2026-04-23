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
import { ConversationService } from '../conversations/conversations.service';
import { MessagesService } from '../messages/messages.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EConversationType } from '../conversations/enums/conversation.enum';
import { calculateDistance } from 'src/utils/calculate.util';
import { formatDistance, formatLastActive } from 'src/utils/format.util';
import { IntimacyService } from '../intimacy/intimacy.service';

@Injectable()
export class FriendsService {
  constructor(
    @InjectRepository(Friend) private readonly friendRepo: Repository<Friend>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly websocketsService: WebsocketsService,
    private readonly conversationService: ConversationService,
    private readonly messagesService: MessagesService,
    private readonly notificationsService: NotificationsService,
    private readonly intimacyService: IntimacyService,
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

    // === TẠO NOTIFICATION + EMIT REALTIME ===
    try {
      const notification = await this.notificationsService.createFriendRequestNotification(
        sender.id,
        sender.fullname,
        sender.avatarUrl,
        targetUserId,
        savedRequest.id, // Pass requestId
      );
      // Emit WS event cho người nhận
      this.websocketsService.emitToUsers(
        [targetUserId],
        'new_notification',
        {
          notificationId: notification.id,
          type: 'SOCIAL',
          subType: 'FRIEND_REQUEST',
          title: 'Lời mời kết bạn',
          message: `${sender.fullname} đã gửi cho bạn lời mời kết bạn`,
          metadata: { // Actor data should be inside metadata to match DB structure
            actorId: sender.id,
            actorName: sender.fullname,
            actorAvatarUrl: sender.avatarUrl,
            requestId: savedRequest.id,
          },
          createdAt: notification.createdAt,
        },
      );
    } catch (err) {
      console.error('[Friends] Lỗi khi tạo notification cho friend request:', err);
    }

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

      // === TỰ ĐỘNG TẠO CONVERSATION + SYSTEM MESSAGE ===
      let conversationId: string | null = null;
      try {
        // Tạo hoặc tìm lại conversation 1-1 giữa 2 người
        const convResult = await this.conversationService.startConversation(
          userId, // người chấp nhận
          {
            participantIds: [friendRequest.senderId],
            type: EConversationType.ONE_TO_ONE,
          },
        );
        const conversation = convResult.data;
        conversationId = conversation?.id || null;

        // Gửi system message
        if (conversationId) {
          await this.messagesService.saveSystemMessage(
            conversationId,
            'Hai bạn đã trở thành bạn bè, hãy gửi tin nhắn đầu tiên cho nhau 🎉',
          );
        }
      } catch (err) {
        console.error('[Friends] Lỗi khi tạo conversation sau khi kết bạn:', err);
      }

      // === EMIT WEBSOCKET EVENT cho cả 2 user ===
      try {
        const sender = await this.userRepo.findOne({ where: { id: friendRequest.senderId } });
        const accepter = await this.userRepo.findOne({ where: { id: userId } });

        const eventPayload = {
          requestId: friendRequest.id,
          conversationId,
          sender: {
            userId: friendRequest.senderId,
            fullName: sender?.fullname || '',
            avatarUrl: sender?.avatarUrl || '',
          },
          accepter: {
            userId: userId,
            fullName: accepter?.fullname || '',
            avatarUrl: accepter?.avatarUrl || '',
          },
        };

        // Emit 'friend_accepted' event to both users
        this.websocketsService.emitToUsers(
          [friendRequest.senderId, userId],
          'friend_accepted',
          eventPayload,
        );

        // Tạo notification cho người gửi lời mời (sender) biết đã được chấp nhận
        const acceptNotification = await this.notificationsService.createFriendAcceptedNotification(
          userId,
          accepter?.fullname || '',
          accepter?.avatarUrl || '',
          friendRequest.senderId,
          conversationId,
        );
        this.websocketsService.emitToUsers(
          [friendRequest.senderId],
          'new_notification',
          {
            notificationId: acceptNotification.id,
            type: 'SOCIAL',
            subType: 'FRIEND_ACCEPTED',
            title: 'Kết bạn thành công',
            message: `${accepter?.fullname || ''} đã chấp nhận lời mời kết bạn của bạn`,
            actor: {
              userId: userId,
              fullName: accepter?.fullname || '',
              avatarUrl: accepter?.avatarUrl || '',
            },
            metadata: { conversationId },
            createdAt: acceptNotification.createdAt,
          },
        );
      } catch (err) {
        console.error('[Friends] Lỗi khi emit friend_accepted WS:', err);
      }

      return new ApiResponse(true, 'Đã chấp nhận lời mời kết bạn', {
        requestId: friendRequest.id,
        status: FriendStatus.ACCEPTED,
        conversationId,
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

    console.log(`[FriendsOnMap] User ${userId}: found ${friends.length} ACCEPTED friendships`);

    // Query websocket
    const onlineUsers = await this.websocketsService.getOnlineUsers() || [];
    console.log(`[FriendsOnMap] Online users: [${onlineUsers.join(', ')}]`);

    const friendsOnMap: FriendOnMapDto[] = [];
    for (const friend of friends) {
      const isSenderMe = friend.senderId === userId;
      const otherUser = isSenderMe ? friend.targetUser : friend.sender;

      const isOnline = onlineUsers.includes(otherUser.id);
      const hasCoords = otherUser.lat !== null && otherUser.lng !== null && otherUser.lat !== undefined;
      const isHiding = otherUser.isHideMyLocation;
      
      console.log(`[FriendsOnMap] Friend "${otherUser.fullname}" (${otherUser.id}): online=${isOnline}, hasCoords=${hasCoords}, hiding=${isHiding}, status=${friend.status}`);

      if (!hasCoords) continue;
      if (isHiding) continue;
      if (!isOnline) continue; // Only show ONLINE friends on map

      friendsOnMap.push({
        userId: otherUser.id,
        fullName: otherUser.fullname || '',
        avatarUrl: otherUser.avatarUrl || '',
        latitude: otherUser.lat,
        longitude: otherUser.lng,
        onlineStatus: 'ONLINE',
      });
    }

    console.log(`[FriendsOnMap] Result: ${friendsOnMap.length} friends on map`);
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

    // Calculate rank from REAL Intimacy Data
    const intimacyData = await this.intimacyService.getIntimacyInfo(currentUserId, targetUserId);
    const level = intimacyData.level;
    const currentExp = intimacyData.totalIntimacyScore;
    const nextLevelExp = intimacyData.nextLevelExp;
    const progressPercent = nextLevelExp > 0 ? Math.min(Math.round((currentExp / nextLevelExp) * 100), 100) : 0;

    // Map aura to Vietnamese display name
    let rankName = 'Người quen (Thủy tinh)';
    if (intimacyData.auraUnlocked === 'DIAMOND') rankName = 'Ngoại hạng (Kim cương)';
    else if (intimacyData.auraUnlocked === 'PLATINUM') rankName = 'Tri kỷ (Bạch kim)';
    else if (intimacyData.auraUnlocked === 'GOLD') rankName = 'Khắng khít (Vàng)';
    else if (intimacyData.auraUnlocked === 'SILVER') rankName = 'Bạn thân (Bạc)';

    // Calculate mutual friends
    const currentUserFriends = await this.getFriendIds(currentUserId);
    const targetUserFriends = await this.getFriendIds(targetUserId);
    const mutualFriendsCount = currentUserFriends.filter(id => targetUserFriends.includes(id)).length;

    // Return data
    const popupData: FriendMapPopupDto = {
      basicInfo: {
        userId: targetUser.id,
        fullName: targetUser.fullname || 'Người dùng ẩn danh',
        username: targetUser.username || '',
        avatarUrl: targetUser.avatarUrl || 'https://ui-avatars.com/api/?name=User',
        onlineStatus: isOnline ? 'ONLINE' : 'OFFLINE',
        lastActive: formatLastActive(targetUser.lastActiveAt, isOnline),
        mutualFriends: mutualFriendsCount,
        bio: targetUser.bio || '',
        gender: targetUser.gender,
        dob: targetUser.dob,
        phone: targetUser.phone,
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
        isCharging: targetUser.isCharging || false,
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
          name: rankName,
          iconUrl: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
          currentExp: currentExp,
          nextLevelExp: nextLevelExp,
          progressPercent: progressPercent,
          currentStreak: intimacyData.currentStreak,
          longestStreak: intimacyData.longestStreak,
          aura: intimacyData.auraUnlocked,
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
