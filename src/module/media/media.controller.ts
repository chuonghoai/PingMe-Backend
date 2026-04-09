/* eslint-disable @typescript-eslint/no-unsafe-assignment */

/* eslint-disable prettier/prettier */
import { Controller, Get, HttpCode, HttpStatus, UseGuards, Body, Post, Delete } from '@nestjs/common';
import { MediaService } from './media.service';
import { ApiResponse } from '../../core/dto/ApiResponse.dto';
import { JwtAuthGuard } from '../../core/security/jwt/jwt-auth.guard';
import { MediaRequestDto } from './dto/media.dto';

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

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async addMediaObject(@Body() mediaRequestDto: MediaRequestDto) {
    return this.mediaService.saveMedia(mediaRequestDto);
  }

  // API local for testing
  @Delete('cleanup-tmp')
  @HttpCode(HttpStatus.OK)
  async forceCleanupTemporaryMedia() {
    const result = await this.mediaService.cleanupTemporaryMedia();
    return new ApiResponse(
      true, 
      'Đã dọn dẹp thành công các file rác trên Cloudinary', 
      result
    );
  }
}