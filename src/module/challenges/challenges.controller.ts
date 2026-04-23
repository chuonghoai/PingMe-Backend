/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Controller, Get, Post, Body, Param, Req, UseGuards, HttpStatus } from '@nestjs/common';
import { ChallengesService } from './challenges.service';
import { JwtAuthGuard } from '../../core/security/jwt/jwt-auth.guard';
import { ApiResponse } from 'src/core/dto/ApiResponse.dto';
import { CustomException } from 'src/core/exceptions/custom.exception';

@Controller('challenges')
@UseGuards(JwtAuthGuard)
export class ChallengesController {
  constructor(private readonly challengesService: ChallengesService) {}

  // GET /challenges — Lấy danh sách thử thách + tiến trình
  @Get()
  async getChallenges(@Req() req: any) {
    const userId = req.user.userId;
    const challenges = await this.challengesService.getActiveChallenges(userId);
    return new ApiResponse(true, 'Lấy danh sách thử thách thành công', challenges);
  }

  // POST /challenges/:id/claim — Nhận thưởng
  @Post(':id/claim')
  async claimReward(@Req() req: any, @Param('id') challengeId: string) {
    const userId = req.user.userId;
    try {
      const result = await this.challengesService.claimReward(userId, challengeId);
      return new ApiResponse(true, 'Nhận phần thưởng thành công', result);
    } catch (e: any) {
      if (e instanceof CustomException) throw e;
      throw new CustomException(HttpStatus.INTERNAL_SERVER_ERROR, 'ERROR', e.message || 'Không thể nhận phần thưởng');
    }
  }

  // GET /challenges/inventory — Xem kho đồ
  @Get('inventory')
  async getInventory(@Req() req: any) {
    const userId = req.user.userId;
    const inventory = await this.challengesService.getInventory(userId);
    return new ApiResponse(true, 'Lấy kho đồ thành công', inventory);
  }

  // POST /challenges/gift/send — Tặng quà cho bạn
  @Post('gift/send')
  async sendGift(@Req() req: any, @Body() body: { friendId: string; itemType: string }) {
    const userId = req.user.userId;
    if (!body.friendId || !body.itemType) {
      throw new CustomException(HttpStatus.BAD_REQUEST, 'INVALID_PARAMS', 'Thiếu dữ liệu');
    }

    try {
      const result = await this.challengesService.sendGift(userId, body.friendId, body.itemType as any);
      return new ApiResponse(true, 'Tặng quà thành công', result);
    } catch (e: any) {
      if (e instanceof CustomException) throw e;
      throw new CustomException(HttpStatus.INTERNAL_SERVER_ERROR, 'ERROR', e.message || 'Không thể tặng quà');
    }
  }

  // POST /challenges/items/use — Sử dụng vật phẩm đặc biệt
  @Post('items/use')
  async useItem(@Req() req: any, @Body() body: { itemType: string; friendId?: string }) {
    const userId = req.user.userId;
    if (!body.itemType) {
      throw new CustomException(HttpStatus.BAD_REQUEST, 'INVALID_PARAMS', 'Thiếu loại vật phẩm');
    }

    try {
      const result = await this.challengesService.useSpecialItem(userId, body.itemType as any, body.friendId);
      return new ApiResponse(true, 'Kích hoạt vật phẩm thành công', result);
    } catch (e: any) {
      if (e instanceof CustomException) throw e;
      throw new CustomException(HttpStatus.INTERNAL_SERVER_ERROR, 'ERROR', e.message || 'Không thể sử dụng vật phẩm');
    }
  }

  // GET /challenges/items — Catalog of available items
  @Get('items')
  async getItemCatalog() {
    const items = this.challengesService.getAllItemDefinitions();
    return new ApiResponse(true, 'Lấy danh sách vật phẩm thành công', items);
  }
}
