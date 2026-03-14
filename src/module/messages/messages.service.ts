/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, HttpStatus } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { MessageRepository } from './messages.repository';
import { ConversationRepository } from '../conversations/repository/conversation.repository';
import { CustomException } from '../../core/exceptions/custom.exception';
import { EMessageType } from './enums/messages.dto';

@Injectable()
export class MessagesService {
  constructor(
    private messageRepo: MessageRepository,
    private conversationRepo: ConversationRepository,
    private dataSource: DataSource, // Inject DataSource để dùng Transaction
  ) {}

  // =====================================================================
  // 1. LƯU TIN NHẮN MỚI (Dùng Transaction để đảm bảo tính toàn vẹn)
  // =====================================================================
  async saveNewMessage(senderId: string, payload: any): Promise<any> {
    const { conversationId, content, type, mediaId } = payload;

    // A. Xử lý đoạn text xem trước (Snippet) cho màn hình Home
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
    } else {
      snippet = 'Đã gửi tin nhắn';
    }

    // Khởi tạo Transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // BƯỚC 1: Lưu dòng tin nhắn mới vào bảng messages
      const newMessage = this.messageRepo.create({
        conversationId,
        senderId,
        content: content || null,
        type: type || EMessageType.TEXT,
        mediaId: mediaId || null,
      });
      const savedMessage = await queryRunner.manager.save(newMessage);

      // BƯỚC 2: Cập nhật thông tin hiển thị của phòng chat
      await queryRunner.manager.update(
        'conversations',
        { id: conversationId },
        {
          lastMessageSnippet: snippet,
          lastMessageAt: new Date(),
        },
      );

      // BƯỚC 3: Tăng unreadCount của NGƯỜI NHẬN lên +1, và hiển thị lại chat nếu họ đã ẩn
      await queryRunner.manager
        .createQueryBuilder()
        .update('conversation_participants')
        .set({
          unreadCount: () => 'unreadCount + 1',
          isVisible: true,
        })
        .where('conversationId = :conversationId', { conversationId })
        .andWhere('userId != :senderId', { senderId }) // Loại trừ người gửi
        .execute();

      // BƯỚC 4: Đảm bảo phòng chat của NGƯỜI GỬI cũng đang hiển thị
      await queryRunner.manager
        .createQueryBuilder()
        .update('conversation_participants')
        .set({ isVisible: true })
        .where('conversationId = :conversationId', { conversationId })
        .andWhere('userId = :senderId', { senderId })
        .execute();

      // Xác nhận commit mọi thay đổi vào Database
      await queryRunner.commitTransaction();

      // TRẢ VỀ: Load thêm data Sender và Media để FE hiển thị UI mượt mà
      return await this.messageRepo.findOne({
        where: { id: savedMessage.id },
        relations: ['sender', 'media'],
        select: {
          sender: { id: true, fullname: true, avatarUrl: true }, // Chỉ lấy thông tin công khai
        },
      });
    } catch (error) {
      // Nếu có bất kỳ lỗi gì xảy ra, Rollback (Hủy) mọi thao tác
      await queryRunner.rollbackTransaction();
      throw new CustomException(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'SEND_MESSAGE_FAILED',
        'Không thể gửi tin nhắn',
      );
    } finally {
      // Giải phóng bộ nhớ của QueryRunner
      await queryRunner.release();
    }
  }

  // =====================================================================
  // 2. THU HỒI TIN NHẮN
  // =====================================================================
  async revokeMessage(messageId: string, senderId: string): Promise<any> {
    const message = await this.messageRepo.findOne({
      where: { id: messageId, senderId: senderId },
    });

    // Nếu không tìm thấy, hoặc user đang cố thu hồi tin nhắn của người khác
    if (!message) {
      throw new CustomException(
        HttpStatus.FORBIDDEN,
        'FORBIDDEN',
        'Không thể thu hồi tin nhắn này',
      );
    }

    message.isRevoked = true;
    await this.messageRepo.save(message);

    // Mẹo nhỏ: Cập nhật lại snippet của nhóm nếu tin nhắn bị thu hồi là tin nhắn cuối cùng
    await this.conversationRepo.update(message.conversationId, {
      lastMessageSnippet: 'Tin nhắn đã được thu hồi',
    });

    return message;
  }
}
