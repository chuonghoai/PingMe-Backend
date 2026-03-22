/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable prettier/prettier */
import { HttpStatus, Injectable } from '@nestjs/common';
import { ConversationRepository } from './repository/conversation.repository';
import { ConversationParticipantRepository } from './repository/conversation-participant.repository';
import { CreateConversationDto } from './dto/conversation.dto';
import { ApiResponse } from 'src/core/dto/ApiResponse.dto';
import { CustomException } from 'src/core/exceptions/custom.exception';
import { EConversationParticipantRole, EConversationType } from './enums/conversation.enum';

@Injectable()
export class ConversationService {
  constructor(
    private conversationRepo: ConversationRepository,
    private participantRepo: ConversationParticipantRepository,
  ) {}

  // Get conversation list
  async getMyConversations(userId: string): Promise<ApiResponse<any>> {
    console.log('Lay conversation list cua user: ' + userId);
    const participants = await this.participantRepo.createQueryBuilder('cp')
      .innerJoinAndSelect('cp.conversation', 'conv')
      .leftJoinAndSelect('conv.participants', 'other_cp')
      .leftJoinAndSelect('other_cp.user', 'user')
      .where('cp.userId = :userId', { userId })
      .andWhere('cp.isVisible = :isVisible', { isVisible: true })
      .orderBy('conv.lastMessageAt', 'DESC')
      .getMany();

    const formattedData = participants.map((p) => {
      const conv = p.conversation;
      return {
        id: conv.id,
        type: conv.type,
        name: conv.name,
        avatarUrl: conv.avatarUrl,
        lastMessageSnippet: conv.lastMessageSnippet,
        lastMessageAt: conv.lastMessageAt,
        unreadCount: p.unreadCount,
        hasMuted: p.hasMuted,
        participants: conv.participants.map(op => ({
          userId: op.user.id,
          fullname: op.user.fullname,
          avatarUrl: op.user.avatarUrl,
          isOnline: op.user.isOnline,
        })),
      };
    });

    return new ApiResponse(true, 'Lấy danh sách hội thoại thành công', formattedData);
  }

  // Create/get conversation
  async startConversation(userId: string, dto: CreateConversationDto): Promise<ApiResponse<any>> {
    if (dto.type === EConversationType.ONE_TO_ONE) {
      if (dto.participantIds.length !== 1) {
        throw new CustomException(HttpStatus.BAD_REQUEST, 'INVALID_DATA', 'Chat 1-1 chỉ được truyền đúng 1 người nhận');
      }

      const receiverId = dto.participantIds[0];

      const existingConv = await this.conversationRepo.createQueryBuilder('c')
        .innerJoin('c.participants', 'p1', 'p1.userId = :userId', { userId })
        .innerJoin('c.participants', 'p2', 'p2.userId = :receiverId', { receiverId })
        .where('c.type = :type', { type: EConversationType.ONE_TO_ONE })
        .getOne();

      if (existingConv) {
        await this.participantRepo.update(
          { conversationId: existingConv.id, userId: userId },
          { isVisible: true }
        );
        return new ApiResponse(true, 'Đã tìm thấy hội thoại cũ', existingConv);
      }
    }

    // Create new conversation
    const newConv = this.conversationRepo.create({
      type: dto.type,
      name: dto.name || undefined,
      lastMessageAt: new Date(),
    });
    const savedConv = await this.conversationRepo.save(newConv);
    // Create participant
    const allUserIds = [userId, ...dto.participantIds];
    const participants = allUserIds.map((id) => {
      return this.participantRepo.create({
        conversationId: savedConv.id,
        userId: id,
        role: id === userId && dto.type === EConversationType.GROUP ? 
              EConversationParticipantRole.ADMIN : 
              EConversationParticipantRole.MEMBER,
      });
    });

    await this.participantRepo.save(participants);
    return new ApiResponse(true, 'Tạo hội thoại mới thành công', savedConv);
  }

  // Hide Conversation
  async hideConversation(userId: string, conversationId: string): Promise<ApiResponse<any>> {
    const participant = await this.participantRepo.findOne({
      where: { userId, conversationId }
    });

    if (!participant) {
      throw new CustomException(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'Không tìm thấy hội thoại');
    }

    participant.isVisible = false;
    await this.participantRepo.save(participant);

    return new ApiResponse(true, 'Đã ẩn đoạn chat', null);
  }

  // Delete conversation by admin
  async deleteConversation(userId: string, conversationId: string): Promise<ApiResponse<any>> {
    const conv = await this.conversationRepo.findOne({ where: { id: conversationId } });
    
    if (!conv) {
      throw new CustomException(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'Không tìm thấy hội thoại');
    }

    await this.conversationRepo.remove(conv);
    return new ApiResponse(true, 'Đã xóa hội thoại vĩnh viễn', null);
  }

  async getParticipantIds(conversationId: string, excludeUserId?: string): Promise<string[]> {
    const query = this.participantRepo.createQueryBuilder('cp')
      .select('cp.userId')
      .where('cp.conversationId = :conversationId', { conversationId });

    if (excludeUserId) {
      query.andWhere('cp.userId != :excludeUserId', { excludeUserId });
    }

    const participants = await query.getMany();
    
    return participants.map(p => p.userId);
  }
}