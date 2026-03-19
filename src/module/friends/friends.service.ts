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
import { FriendStatus, FriendRequestAction } from './enums/friend-status.enum';
import {
  SendFriendRequestDto,
  FriendRequestResponseDto,
  RespondFriendRequestDto,
  RespondFriendResponseDto as ResponseFriendResponseDto,
} from './dto/friend.dto';
import { ApiResponse } from '../../core/dto/ApiResponse.dto';

@Injectable()
export class FriendsService {
  constructor(
    @InjectRepository(Friend) private readonly friendRepo: Repository<Friend>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

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
}
