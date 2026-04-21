/* eslint-disable prettier/prettier */
import { Controller, Get, Param, Req, UseGuards, HttpStatus } from '@nestjs/common';
import { IntimacyService } from './intimacy.service';
import { JwtAuthGuard } from '../../core/security/jwt/jwt-auth.guard';
import { ApiResponse } from 'src/core/dto/ApiResponse.dto';
import { CustomException } from 'src/core/exceptions/custom.exception';

@Controller('intimacy')
@UseGuards(JwtAuthGuard)
export class IntimacyController {
  constructor(private readonly intimacyService: IntimacyService) {}

  @Get(':friendId')
  async getFriendIntimacy(@Req() req: any, @Param('friendId') friendId: string) {
    const currentUserId = req.user.userId;
    if (!currentUserId || !friendId) {
      throw new CustomException(HttpStatus.BAD_REQUEST, 'INVALID_PARAMS', 'Thiếu dữ liệu');
    }

    try {
      const intimacyData = await this.intimacyService.getIntimacyInfo(currentUserId, friendId);
      return new ApiResponse(true, 'Lấy thông tin độ thân thiết thành công', intimacyData);
    } catch (e) {
      throw new CustomException(HttpStatus.INTERNAL_SERVER_ERROR, 'ERROR', 'Không thể lấy thông tin độ thân mật');
    }
  }
}
