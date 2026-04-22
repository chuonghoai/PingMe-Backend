/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable prettier/prettier */
import { HttpStatus, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ConversationRepository } from './repository/conversation.repository';
import { ConversationParticipantRepository } from './repository/conversation-participant.repository';
import { CreateConversationDto } from './dto/conversation.dto';
import { ApiResponse } from 'src/core/dto/ApiResponse.dto';
import { CustomException } from 'src/core/exceptions/custom.exception';
import { EConversationParticipantRole, EConversationType } from './enums/conversation.enum';
import { EMessageType } from '../messages/enums/messages.dto';

@Injectable()
export class ConversationService {
  constructor(
    private conversationRepo: ConversationRepository,
    private participantRepo: ConversationParticipantRepository,
    private dataSource: DataSource,
  ) { }

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
        blockedById: conv.blockedById,
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

  // Get participant in conversation
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

  // Reset unread count
  async resetUnreadCount(conversationId: string, userId: string): Promise<void> {
    const participant = await this.participantRepo.findOne({
      where: { conversationId: conversationId, userId: userId }
    });

    if (participant) {
      participant.unreadCount = 0;
      await this.participantRepo.save(participant);
    }
  }

  // Block user
  async blockUser(userId: string, conversationId: string): Promise<ApiResponse<any>> {
    const conv = await this.conversationRepo.findOne({ where: { id: conversationId } });
    if (!conv) throw new CustomException(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'Không tìm thấy hội thoại');

    conv.blockedById = userId;
    await this.conversationRepo.save(conv);
    return new ApiResponse(true, 'Đã chặn người dùng', null);
  }

  // Unblock
  async unblockUser(userId: string, conversationId: string): Promise<ApiResponse<any>> {
    const conv = await this.conversationRepo.findOne({ where: { id: conversationId } });
    if (!conv) throw new CustomException(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'Không tìm thấy hội thoại');

    if (conv.blockedById === userId) {
      conv.blockedById = null;
      await this.conversationRepo.save(conv);
    }
    return new ApiResponse(true, 'Đã bỏ chặn người dùng', null);
  }

  // Delete message history
  async clearHistory(userId: string, conversationId: string): Promise<ApiResponse<any>> {
    const participant = await this.participantRepo.findOne({ where: { userId, conversationId } });
    if (!participant) throw new CustomException(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'Không tìm thấy người tham gia');

    participant.clearedAt = new Date();
    await this.participantRepo.save(participant);
    return new ApiResponse(true, 'Đã xóa lịch sử trò chuyện', null);
  }

  // Toggle Mute
  async toggleMute(userId: string, conversationId: string): Promise<ApiResponse<any>> {
    const participant = await this.participantRepo.findOne({ where: { userId, conversationId } });
    if (!participant) throw new CustomException(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'Không tìm thấy hội thoại');

    participant.hasMuted = !participant.hasMuted;
    await this.participantRepo.save(participant);
    return new ApiResponse(true, participant.hasMuted ? 'Đã tắt thông báo' : 'Đã bật thông báo', { isMuted: participant.hasMuted });
  }

  // Search conversations and messages
  async searchConversations(userId: string, keyword: string): Promise<ApiResponse<any>> {
    if (!keyword || keyword.trim() === '') {
      return new ApiResponse(true, 'Kết quả tìm kiếm', {
        conversations: [],
        messages: [],
      });
    }

    const lowerKeyword = keyword.toLowerCase();
    const searchTerm = `%${lowerKeyword}%`;

    // 1. Get ALL user's visible conversations with participants loaded
    const allParticipants = await this.participantRepo.createQueryBuilder('cp')
      .innerJoinAndSelect('cp.conversation', 'conv')
      .leftJoinAndSelect('conv.participants', 'other_cp')
      .leftJoinAndSelect('other_cp.user', 'user')
      .where('cp.userId = :userId', { userId })
      .andWhere('cp.isVisible = :isVisible', { isVisible: true })
      .orderBy('conv.lastMessageAt', 'DESC')
      .getMany();

    // Filter in memory by keyword matching on friend name / group name
    const formattedConversations: any[] = [];
    const addedConvIds = new Set();

    for (const p of allParticipants) {
      if (addedConvIds.has(p.conversationId)) continue;

      const conv = p.conversation;
      if (!conv || !conv.participants) continue;

      // Check if any OTHER participant's name matches the keyword
      const hasOtherUserMatch = conv.participants.some(op =>
        op.userId !== userId &&
        op.user &&
        ((op.user.fullname && op.user.fullname.toLowerCase().includes(lowerKeyword)) ||
         (op.user.username && op.user.username.toLowerCase().includes(lowerKeyword)))
      );

      // Check group name match
      const hasGroupNameMatch = conv.type === EConversationType.GROUP && conv.name && conv.name.toLowerCase().includes(lowerKeyword);

      if (!hasOtherUserMatch && !hasGroupNameMatch) continue;

      addedConvIds.add(p.conversationId);
      formattedConversations.push({
        id: conv.id,
        type: conv.type,
        name: conv.name,
        avatarUrl: conv.avatarUrl,
        lastMessageSnippet: conv.lastMessageSnippet,
        lastMessageAt: conv.lastMessageAt,
        blockedById: conv.blockedById,
        unreadCount: p.unreadCount,
        hasMuted: p.hasMuted,
        participants: conv.participants
          .filter(op => op.user)
          .map(op => ({
            userId: op.user.id,
            fullname: op.user.fullname,
            avatarUrl: op.user.avatarUrl,
            isOnline: op.user.isOnline,
          })),
      });
    }

    // 2. Search message contents within user's active conversations
    const conversationIds = allParticipants.map(p => p.conversationId);

    let messages: any[] = [];
    if (conversationIds.length > 0) {
      try {
        messages = await this.dataSource.query(
          `SELECT m.id, m.content, m."createdAt", m."conversationId", m."senderId",
                  c.name as "conversationName", c.type as "conversationType",
                  u.fullname as "senderName", u."avatarUrl" as "senderAvatar"
           FROM messages m
           JOIN conversations c ON c.id = m."conversationId"
           LEFT JOIN users u ON u.id = m."senderId"
           WHERE m."conversationId" = ANY($1)
             AND LOWER(m.content) LIKE $2
             AND m.type = $3
             AND m."isRevoked" = false
           ORDER BY m."createdAt" DESC
           LIMIT 30`,
          [conversationIds, searchTerm, EMessageType.TEXT]
        );
      } catch (e) {
        console.error('[SearchConversations] Message search error:', e);
        messages = [];
      }
    }

    // Build display info for each matched message
    // Cache other-participant lookups by conversationId to avoid N+1 queries
    const otherParticipantCache = new Map<string, any>();
    for (const p of allParticipants) {
      if (otherParticipantCache.has(p.conversationId)) continue;
      const conv = p.conversation;
      if (!conv || !conv.participants) continue;
      const other = conv.participants.find(op => op.userId !== userId && op.user);
      if (other) {
        otherParticipantCache.set(p.conversationId, {
          fullname: other.user.fullname,
          avatarUrl: other.user.avatarUrl,
          id: other.user.id,
        });
      }
    }

    const formattedMessages = messages.map((msg: any) => {
      let displayName = msg.conversationName;
      let displayAvatar: any = null;
      let targetUserId = msg.senderId;

      const cached = otherParticipantCache.get(msg.conversationId);
      if (cached) {
        displayName = cached.fullname;
        displayAvatar = cached.avatarUrl;
        targetUserId = cached.id;
      }

      return {
        id: msg.id,
        content: msg.content,
        createdAt: msg.createdAt,
        conversationId: msg.conversationId,
        senderId: msg.senderId,
        senderName: msg.senderName,
        senderAvatar: msg.senderAvatar,
        displayName: displayName || msg.senderName,
        displayAvatar: displayAvatar,
        targetUserId: targetUserId,
      };
    });

    return new ApiResponse(true, 'Kết quả tìm kiếm', {
      conversations: formattedConversations,
      messages: formattedMessages,
    });
  }
}