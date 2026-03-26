/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Controller,
  UseGuards,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Request,
  HttpCode,
  HttpStatus,
  Param,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/core/security/jwt/jwt-auth.guard';
import { ConversationService } from './conversations.service';
import { CreateConversationDto } from './dto/conversation.dto';
import { Throttle } from '@nestjs/throttler';

@Controller('conversations')
@UseGuards(JwtAuthGuard)
export class ConversationController {
  constructor(private readonly conversationService: ConversationService) { }

  // Get conversation list
  @Get()
  @HttpCode(HttpStatus.OK)
  async getMyConversations(@Request() req: any) {
    const userId = req.user.userId;
    return this.conversationService.getMyConversations(userId);
  }

  // Create conversation
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 10, ttl: 1000 } })
  async createConversation(
    @Request() req: any,
    @Body() dto: CreateConversationDto,
  ) {
    const userId = req.user.userId;
    return this.conversationService.startConversation(userId, dto);
  }

  // Hide conversation
  @Patch(':id/hide')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 1000 } })
  async hideConversation(
    @Request() req: any,
    @Param('id') conversationId: string,
  ) {
    const userId = req.user.userId;
    return this.conversationService.hideConversation(userId, conversationId);
  }

  // Delete conversation
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteConversation(
    @Request() req: any,
    @Param('id') conversationId: string,
  ) {
    const userId = req.user.userId;
    return this.conversationService.deleteConversation(userId, conversationId);
  }

  // Block user
  @Post(':id/block')
  @HttpCode(HttpStatus.OK)
  async blockUser(@Request() req: any, @Param('id') conversationId: string) {
    return this.conversationService.blockUser(req.user.userId, conversationId);
  }

  // Unblock user
  @Post(':id/unblock')
  @HttpCode(HttpStatus.OK)
  async unblockUser(@Request() req: any, @Param('id') conversationId: string) {
    return this.conversationService.unblockUser(req.user.userId, conversationId);
  }

  // Delete message history
  @Post(':id/clear-history')
  @HttpCode(HttpStatus.OK)
  async clearHistory(@Request() req: any, @Param('id') conversationId: string) {
    return this.conversationService.clearHistory(req.user.userId, conversationId);
  }
}
