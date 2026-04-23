/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, HttpStatus } from '@nestjs/common';
import { DataSource, LessThan, MoreThan, In, And } from 'typeorm';
import { MessageRepository } from './messages.repository';
import { ConversationRepository } from '../conversations/repository/conversation.repository';
import { ConversationParticipantRepository } from '../conversations/repository/conversation-participant.repository';
import { CustomException } from '../../core/exceptions/custom.exception';
import { EMessageType } from './enums/messages.dto';
import { ApiResponse } from 'src/core/dto/ApiResponse.dto';
import { IntimacyService } from '../intimacy/intimacy.service';
import { EIntimacyEventType } from '../intimacy/entities/intimacy-event.entity';

@Injectable()
export class MessagesService {
  constructor(
    private messageRepo: MessageRepository,
    private conversationRepo: ConversationRepository,
    private participantRepo: ConversationParticipantRepository,
    private dataSource: DataSource,
    private intimacyService: IntimacyService,
  ) { }

  // Save new message
  async saveNewMessage(senderId: string, payload: any): Promise<any> {
    const { conversationId, content, type, mediaId } = payload;

    // Checking block
    const conversation = await this.conversationRepo.findOne({
      where: { id: conversationId }
    });

    if (!conversation) {
      throw new CustomException(
        HttpStatus.NOT_FOUND,
        'NOT_FOUND',
        'Không tìm thấy hội thoại'
      );
    }

    if (conversation.blockedById) {
      if (conversation.blockedById === senderId) {
        throw new CustomException(
          HttpStatus.FORBIDDEN,
          'BLOCKED_BY_YOU',
          'Bạn phải bỏ chặn người này trước khi gửi tin nhắn.',
        );
      } else {
        throw new CustomException(
          HttpStatus.FORBIDDEN,
          'BLOCKED_BY_THEM',
          'Không thể gửi tin nhắn. Bạn đã bị người dùng này chặn.',
        );
      }
    }

    let snippet = 'Tin nhắn mới';
    if (type === EMessageType.TEXT) {
      snippet = content
        ? content.length > 50
          ? content.substring(0, 50) + '...'
          : content
        : '';
    } else if (type === EMessageType.IMAGE) {
      snippet = 'Đã gửi 1 ảnh';
    } else if (type === EMessageType.VIDEO) {
      snippet = 'Đã gửi 1 video';
    } else if (type === EMessageType.AUDIO) {
      snippet = 'Đã gửi 1 tin nhắn thoại';
    } else if (type === EMessageType.STICKER) {
      snippet = 'Đã gửi 1 sticker';
    } else if (type === EMessageType.CALL) {
      snippet = 'Cuộc gọi';
      try {
        if (content) {
          const callData = JSON.parse(content);
          if (callData.status === 'MISSED') {
            snippet = callData.callType === 'VIDEO' ? 'Cuộc gọi video nhỡ' : 'Cuộc gọi thoại nhỡ';
          } else {
            snippet = callData.callType === 'VIDEO' ? 'Cuộc gọi video' : 'Cuộc gọi thoại';
          }
        }
      } catch (e) {}
    } else {
      snippet = 'Đã gửi tin nhắn';
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const newMessage = this.messageRepo.create({
        conversationId,
        senderId,
        content: content || null,
        type: type || EMessageType.TEXT,
        mediaId: mediaId || null,
        replyToId: payload.replyToId || null,
      });
      const savedMessage = await queryRunner.manager.save(newMessage);

      await queryRunner.manager.update(
        'conversations',
        { id: conversationId },
        {
          lastMessageSnippet: snippet,
          lastMessageAt: new Date(),
        },
      );

      await queryRunner.manager
        .createQueryBuilder()
        .update('conversation_participants')
        .set({
          unreadCount: () => 'unreadCount + 1',
          isVisible: true,
        })
        .where('conversationId = :conversationId', { conversationId })
        .andWhere('userId != :senderId', { senderId })
        .execute();

      await queryRunner.manager
        .createQueryBuilder()
        .update('conversation_participants')
        .set({ isVisible: true })
        .where('conversationId = :conversationId', { conversationId })
        .andWhere('userId = :senderId', { senderId })
        .execute();

      await queryRunner.commitTransaction();

      // Retrieve full message
      const fullMessage = await this.messageRepo.findOne({
        where: { id: savedMessage.id },
        relations: ['sender', 'media'],
        select: {
          sender: { id: true, fullname: true, avatarUrl: true },
        },
      });

      // Retrieve updated conversation
      const updatedConversation = await this.conversationRepo.findOne({
        where: { id: conversationId },
        relations: ['participants', 'participants.user'],
        select: {
          participants: {
            id: true,
            userId: true,
            unreadCount: true,
            user: { id: true, fullname: true, avatarUrl: true }
          }
        }
      });

      // TRIGGER INTIMACY CHAT EVENT (Background)
      if (updatedConversation && updatedConversation.participants.length === 2 && type !== EMessageType.SYSTEM) {
        const receiverId = updatedConversation.participants.find(p => p.userId !== senderId)?.userId;
        if (receiverId) {
          const eventType = type === EMessageType.CALL ? EIntimacyEventType.PROXIMITY /* Call is grouped as high proximity/location interaction temporarily, or just Chat */ : EIntimacyEventType.CHAT;
          // Fire and forget
          this.intimacyService.processInteraction(senderId, receiverId, type === EMessageType.CALL ? EIntimacyEventType.LOCATION : EIntimacyEventType.CHAT).catch(console.error);
        }
      }

      return {
        message: fullMessage,
        conversation: updatedConversation,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error(error);
      throw new CustomException(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'SEND_MESSAGE_FAILED',
        'Không thể gửi tin nhắn',
      );
    } finally {
      await queryRunner.release();
    }
  }

  // Save system message (no sender, type=SYSTEM)
  async saveSystemMessage(conversationId: string, content: string): Promise<any> {
    const conversation = await this.conversationRepo.findOne({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new CustomException(
        HttpStatus.NOT_FOUND,
        'NOT_FOUND',
        'Không tìm thấy hội thoại',
      );
    }

    const snippet = content.length > 50 ? content.substring(0, 50) + '...' : content;

    const newMessage = this.messageRepo.create({
      conversationId,
      senderId: null as any,
      content,
      type: EMessageType.SYSTEM,
    });
    const savedMessage = await this.messageRepo.save(newMessage);

    await this.conversationRepo.update(conversationId, {
      lastMessageSnippet: snippet,
      lastMessageAt: new Date(),
    });

    return savedMessage;
  }

  // Revoke message
  async revokeMessage(messageId: string, senderId: string): Promise<any> {
    const message = await this.messageRepo.findOne({
      where: { id: messageId, senderId: senderId },
    });

    if (!message) {
      throw new CustomException(
        HttpStatus.FORBIDDEN,
        'FORBIDDEN',
        'Không thể thu hồi tin nhắn này',
      );
    }

    message.isRevoked = true;
    await this.messageRepo.save(message);

    await this.conversationRepo.update(message.conversationId, {
      lastMessageSnippet: 'Tin nhắn đã được thu hồi',
    });

    return message;
  }

  // Mark messages as read
  async markMessagesAsRead(conversationId: string, currentUserId: string): Promise<number> {
    const updateResult = await this.messageRepo
      .createQueryBuilder()
      .update('messages')
      .set({ isRead: true })
      .where('conversationId = :conversationId', { conversationId })
      .andWhere('senderId != :currentUserId', { currentUserId })
      .andWhere('isRead = false')
      .execute();

    return updateResult.affected || 0;
  }

  // Get message
  async getMessages(
    userId: string,
    conversationId: string,
    page: number,
    limit: number,
  ): Promise<ApiResponse<any>> {
    const participant = await this.participantRepo.findOne({
      where: { userId, conversationId },
    });
    if (!participant) {
      throw new CustomException(
        HttpStatus.FORBIDDEN,
        'FORBIDDEN',
        'Bạn không có quyền xem tin nhắn của hội thoại này',
      );
    }

    if (participant.unreadCount > 0) {
      participant.unreadCount = 0;
      await this.participantRepo.save(participant);
    }

    const skip = (page - 1) * limit;

    const whereCondition: any = { conversationId };
    if (participant.clearedAt) {
      whereCondition.createdAt = MoreThan(participant.clearedAt);
    }

    const [messages, total] = await this.messageRepo.findAndCount({
      where: whereCondition,
      relations: ['sender', 'media', 'replyTo', 'replyTo.sender'],
      select: {
        sender: { id: true, fullname: true, avatarUrl: true },
        replyTo: { id: true, content: true, type: true, sender: { id: true, fullname: true } }
      },
      order: { createdAt: 'DESC' },
      skip: skip,
      take: limit,
    });

    return new ApiResponse(true, 'Lấy danh sách tin nhắn thành công', {
      messages,
      meta: {
        totalItems: total,
        itemCount: messages.length,
        itemsPerPage: limit,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
      },
    });
  }

  async getMessageContext(userId: string, conversationId: string, messageId: string): Promise<ApiResponse<any>> {
    // 1. Kiểm tra quyền
    const participant = await this.participantRepo.findOne({ where: { userId, conversationId } });
    if (!participant) throw new CustomException(HttpStatus.FORBIDDEN, 'FORBIDDEN', 'Không có quyền truy cập');

    // 2. Lấy tin nhắn đích
    const targetMsgWhere: any = { id: messageId, conversationId };
    if (participant.clearedAt) {
      targetMsgWhere.createdAt = MoreThan(participant.clearedAt);
    }

    const targetMsg = await this.messageRepo.findOne({
      where: targetMsgWhere,
      relations: ['sender', 'media', 'replyTo', 'replyTo.sender'],
      select: {
        sender: { id: true, fullname: true, avatarUrl: true },
        replyTo: { id: true, content: true, type: true, sender: { id: true, fullname: true } }
      }
    });

    if (!targetMsg) throw new CustomException(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'Tin nhắn không tồn tại');

    // 3. Lấy 15 tin nhắn CŨ HƠN tin nhắn đích (Cuộn lên trên)
    const olderWhere: any = { conversationId, createdAt: LessThan(targetMsg.createdAt) };
    if (participant.clearedAt) {
      olderWhere.createdAt = And(
        LessThan(targetMsg.createdAt),
        MoreThan(participant.clearedAt)
      );
    }

    const olderMessages = await this.messageRepo.find({
      where: olderWhere,
      order: { createdAt: 'DESC' }, // Lấy từ đích giật lùi về quá khứ
      take: 15,
      relations: ['sender', 'media', 'replyTo', 'replyTo.sender'],
      select: { sender: { id: true, fullname: true, avatarUrl: true } }
    });

    // 4. Lấy 15 tin nhắn MỚI HƠN tin nhắn đích (Cuộn xuống dưới)
    const newerMessages = await this.messageRepo.find({
      where: { conversationId, createdAt: MoreThan(targetMsg.createdAt) },
      order: { createdAt: 'ASC' }, // Lấy từ đích tiến về hiện tại
      take: 15,
      relations: ['sender', 'media', 'replyTo', 'replyTo.sender'],
      select: { sender: { id: true, fullname: true, avatarUrl: true } }
    });

    // 5. Gộp lại thành 1 mảng duy nhất, đảo chiều newer để khớp thứ tự DESC (mới nhất nằm đầu mảng cho Frontend dễ dùng FlatList inverted)
    const contextMessages = [
      ...newerMessages.reverse(), // Tin mới hơn nằm trên cùng của mảng
      targetMsg,                  // Đích nằm giữa
      ...olderMessages            // Tin cũ nằm cuối
    ];

    return new ApiResponse(true, 'Lấy ngữ cảnh tin nhắn thành công', contextMessages);
  }

  // Get media in conversation
  async getConversationMedia(
    userId: string,
    conversationId: string,
    page: number,
    limit: number,
  ): Promise<ApiResponse<any>> {
    const participant = await this.participantRepo.findOne({
      where: { userId, conversationId },
    });

    if (!participant) {
      throw new CustomException(
        HttpStatus.FORBIDDEN,
        'FORBIDDEN',
        'Bạn không có quyền xem phương tiện của hội thoại này',
      );
    }

    const skip = (page - 1) * limit;

    const whereCondition: any = {
      conversationId,
      type: In([EMessageType.IMAGE, EMessageType.VIDEO])
    };
    if (participant.clearedAt) {
      whereCondition.createdAt = MoreThan(participant.clearedAt);
    }

    const [messages, total] = await this.messageRepo.findAndCount({
      where: whereCondition,
      relations: ['sender', 'media'],
      select: {
        sender: { id: true, fullname: true, avatarUrl: true },
      },
      order: { createdAt: 'DESC' },
      skip: skip,
      take: limit,
    });

    return new ApiResponse(true, 'Lấy danh sách phương tiện thành công', {
      messages,
      meta: {
        totalItems: total,
        itemCount: messages.length,
        itemsPerPage: limit,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
      },
    });
  }

  // Search messages in a specific conversation
  async searchMessagesInConversation(
    userId: string,
    conversationId: string,
    keyword: string,
  ): Promise<ApiResponse<any>> {
    const participant = await this.participantRepo.findOne({
      where: { userId, conversationId },
    });

    if (!participant) {
      throw new CustomException(
        HttpStatus.FORBIDDEN,
        'FORBIDDEN',
        'Bạn không có quyền tìm kiếm trong hội thoại này',
      );
    }

    if (!keyword || keyword.trim() === '') {
      return new ApiResponse(true, 'Kết quả tìm kiếm', []);
    }

    const searchTerm = `%${keyword.toLowerCase()}%`;

    const whereCondition: any = {
      conversationId,
      type: EMessageType.TEXT,
      isRevoked: false,
    };

    if (participant.clearedAt) {
      whereCondition.createdAt = MoreThan(participant.clearedAt);
    }

    // Custom query to support ILIKE / LOWER LIKE
    const messages = await this.messageRepo
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.sender', 'sender')
      .where('message.conversationId = :conversationId', { conversationId })
      .andWhere('message.type = :type', { type: EMessageType.TEXT })
      .andWhere('message.isRevoked = :isRevoked', { isRevoked: false })
      .andWhere('LOWER(message.content) LIKE :searchTerm', { searchTerm })
      .andWhere(participant.clearedAt ? 'message.createdAt > :clearedAt' : '1=1', { clearedAt: participant.clearedAt })
      .orderBy('message.createdAt', 'DESC')
      .take(50)
      .getMany();

    const formattedMessages = messages.map(msg => ({
      id: msg.id,
      content: msg.content,
      createdAt: msg.createdAt,
      senderId: msg.senderId,
      senderName: msg.sender?.fullname,
      senderAvatar: msg.sender?.avatarUrl,
    }));

    return new ApiResponse(true, 'Kết quả tìm kiếm', formattedMessages);
  }
}
