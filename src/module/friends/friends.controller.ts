/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  Param,
  Get,
  Query,
} from '@nestjs/common';
import { FriendsService } from './friends.service';
import { RespondFriendRequestDto, SendFriendRequestDto } from './dto/friend.dto';
import { JwtAuthGuard } from '../../core/security/jwt/jwt-auth.guard';

@Controller('friends')
@UseGuards(JwtAuthGuard)
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async getFriendList(@Req() req: any, @Query('userId') queryUserId?: string) {
    const currentUserId = req.user.userId;
    return this.friendsService.getFriendList(currentUserId);
  }

  @Post('request')
  @HttpCode(HttpStatus.OK)
  async sendFriendRequest(@Req() req: any, @Body() dto: SendFriendRequestDto) {
    dto.senderId = req.user.userId;
    return this.friendsService.sendFriendRequest(dto);
  }

  @Post('respond')
  @HttpCode(HttpStatus.OK)
  async respondFriendRequest(@Req() req: any, @Body() dto: RespondFriendRequestDto) {
    const currentUserId = req.user.userId;
    return this.friendsService.responseFriendRequest(currentUserId, dto);
  }
}
