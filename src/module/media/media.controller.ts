/* eslint-disable prettier/prettier */
import { Controller, Get, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { MediaService } from './media.service';
import { ApiResponse } from '../../core/dto/ApiResponse.dto';
import { JwtAuthGuard } from '../../core/security/jwt/jwt-auth.guard';

@Controller('media')
@UseGuards(JwtAuthGuard)
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Get('signature')
  @HttpCode(HttpStatus.OK)
  getSignature() {
    const data = this.mediaService.getUploadSignature();
    
    return new ApiResponse(true, 'Lấy thông tin upload Cloudinary thành công', data);
  }
}