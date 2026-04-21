/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable prettier/prettier */
import {
  Controller,
  Get,
  Put,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  Body,
  Query,
  Patch,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from 'src/core/security/jwt/jwt-auth.guard';
import { ToggleLocationShareDto, UpdateUserRequest } from './dto/user-request.dto';
import { FriendsService } from '../friends/friends.service';
import { MomentsService } from '../moments/moments.service';
import { ApiResponse } from 'src/core/dto/ApiResponse.dto';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly friendsService: FriendsService,
    private readonly momentsService: MomentsService,
  ) {}

  @Get('me')
  @HttpCode(HttpStatus.OK)
  async getMe(@Request() req: any) {
    const userId = req.user.userId; 
    return this.usersService.getUserBy(userId);
  }

  @Get('me/stats')
  @HttpCode(HttpStatus.OK)
  async getMyStats(@Request() req: any) {
    const userId = req.user.userId;
    const friendIds = await this.friendsService.getFriendIds(userId);
    const momentCount = await this.momentsService.countByUser(userId);
    return new ApiResponse(true, 'Lấy thống kê thành công', {
      friendCount: friendIds.length,
      momentCount,
    });
  }

  @Get('nearby')
  @HttpCode(HttpStatus.OK)
  async getNearbyUsers(
    @Request() req: any,
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('radius') radius?: string,
  ) {
    const userId = req.user.userId;
    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);
    const parsedRadius = radius ? parseFloat(radius) : 100;

    return this.usersService.getNearbyUsers(userId, parsedLat, parsedLng, parsedRadius);
  }

  @Get('search')
  @HttpCode(HttpStatus.OK)
  async searchUsers(
    @Request() req: any,
    @Query('q') q: string,
  ) {
    const userId = req.user.userId;
    return this.usersService.searchUsers(q, userId);
  }

  @Put('me')
  @HttpCode(HttpStatus.OK)
  async updateUser(@Request() req: any, @Body() updateUserRequest: UpdateUserRequest) {
    const userId = req.user.userId;
    return this.usersService.updateUser(userId, updateUserRequest);
  }

  @Patch('location-share')
  @HttpCode(HttpStatus.OK)
  async toggleLocationShare(
    @Request() req: any, 
    @Body() dto: ToggleLocationShareDto
  ) {
    const userId = req.user.userId;
    return this.usersService.toggleLocationShare(userId, dto.action);
  }
}
