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
  constructor(private readonly conversationService: ConversationService) {}

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
}
