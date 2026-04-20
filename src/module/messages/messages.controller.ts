/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Controller,
  Get,
  Param,
  Query,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { MessagesService } from './messages.service';
import { JwtAuthGuard } from '../../core/security/jwt/jwt-auth.guard';
import { GetMessagesDto } from './dto/get-messages.dto';
import { Throttle } from '@nestjs/throttler';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get(':conversationId')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 1000 } })
  async getMessages(
    @Request() req: any,
    @Param('conversationId') conversationId: string,
    @Query() query: GetMessagesDto,
  ) {
    const userId = req.user.userId;
    const page = query.page || 1;
    const limit = query.limit || 20;

    return this.messagesService.getMessages(
      userId,
      conversationId,
      page,
      limit,
    );
  }

  @Get(':conversationId/context/:messageId')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 1000 } })
  async getMessageContext(
    @Request() req: any,
    @Param('conversationId') conversationId: string,
    @Param('messageId') messageId: string,
  ) {
    const userId = req.user.userId;
    return this.messagesService.getMessageContext(
      userId,
      conversationId,
      messageId,
    );
  }

  @Get(':conversationId/media')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 1000 } })
  async getConversationMedia(
    @Request() req: any,
    @Param('conversationId') conversationId: string,
    @Query() query: GetMessagesDto,
  ) {
    const userId = req.user.userId;
    const page = query.page || 1;
    const limit = query.limit || 10;

    return this.messagesService.getConversationMedia(
      userId,
      conversationId,
      page,
      limit,
    );
  }
}
