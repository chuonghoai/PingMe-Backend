/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable prettier/prettier */
import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { ENV_VARS } from '../../constants/env.constants';
import { InjectRepository } from '@nestjs/typeorm';
import { MediaObject } from './entities/media.entity';
import { Repository } from 'typeorm';
import { MediaRequestDto } from './dto/media.dto';
import { EMediaType } from './enums/media.enum';
import { ApiResponse } from 'src/core/dto/ApiResponse.dto';
import { CustomException } from 'src/core/exceptions/custom.exception';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    private configService: ConfigService,
    @InjectRepository(MediaObject)
    private mediaRepository: Repository<MediaObject>,
  ) {
    cloudinary.config({
      cloud_name: this.configService.get<string>(ENV_VARS.CLOUDINARY_CLOUD_NAME) as string,
      api_key: this.configService.get<string>(ENV_VARS.CLOUDINARY_API_KEY) as string,
      api_secret: this.configService.get<string>(ENV_VARS.CLOUDINARY_API_SECRET) as string,
    });
  }

  getUploadSignature() {
    const timestamp = Math.round(new Date().getTime() / 1000);
    const folderName = this.configService.get<string>(ENV_VARS.CLOUDINARY_FOLDER) as string;
    const tags = 'tmp';

    const paramsToSign = {
      timestamp: timestamp,
      folder: folderName,
      tags: tags,
    };
    const apiSecret = this.configService.get<string>(ENV_VARS.CLOUDINARY_API_SECRET) as string;

    const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret);

    return {
      signature: signature,
      timestamp: timestamp,
      folder: folderName,
      api_key: this.configService.get<string>(ENV_VARS.CLOUDINARY_API_KEY),
      cloud_name: this.configService.get<string>(ENV_VARS.CLOUDINARY_CLOUD_NAME),
      tags: tags,
    };
  }

  async saveMedia(dto: MediaRequestDto): Promise<ApiResponse<any>> {
    try {
      // format resource type
      let finalResourceType: EMediaType;
      if (dto.resource_type === 'image') {
        finalResourceType = EMediaType.IMAGE;
      } else if (dto.resource_type === 'video') {
        if (dto.is_audio) {
          finalResourceType = EMediaType.AUDIO;
        } else {
          finalResourceType = EMediaType.VIDEO;
        }
      } else {
        finalResourceType = EMediaType.IMAGE;
      }

      // Save media into DB
      const newMedia = this.mediaRepository.create({
        publicId: dto.public_id,
        secureUrl: dto.secure_url,
        resourceType: finalResourceType,
        format: dto.format || undefined,
        width: dto.width || 0,
        height: dto.height || 0,
        bytes: dto.bytes || 0,
        duration: dto.duration || undefined,
      });
      await this.mediaRepository.save(newMedia);

      // Remove tags 'tmp'
      await cloudinary.uploader.remove_tag('tmp', [dto.public_id], {
        resource_type: dto.resource_type, 
      });

      return new ApiResponse(true, 'Lưu thông tin media thành công', newMedia);
    } catch (error) {
      throw new CustomException(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'SAVE_MEDIA_FAILED',
        'Đã xảy ra lỗi khi lưu thông tin media',
      );
    }
  }

  async cleanupTemporaryMedia(): Promise<any> {
    try {
      this.logger.log('Bắt đầu dọn dẹp các file media có tag "tmp"...');
      
      const [imageResult, videoResult, rawResult] = await Promise.all([
        cloudinary.api.delete_resources_by_tag('tmp', { resource_type: 'image' }),
        cloudinary.api.delete_resources_by_tag('tmp', { resource_type: 'video' }),
        cloudinary.api.delete_resources_by_tag('tmp', { resource_type: 'raw' }),
      ]);
      
      const totalDeleted = {
        images: imageResult.deleted,
        videos: videoResult.deleted,
        raws: rawResult.deleted,
      };

      this.logger.log(`Dọn dẹp hoàn tất: ${JSON.stringify(totalDeleted)}`);
      return totalDeleted;
    } catch (error) {
      this.logger.error('Lỗi khi dọn dẹp media tạm thời trên Cloudinary', error);
      throw new CustomException(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'CLEANUP_FAILED',
        'Đã xảy ra lỗi khi xóa file tạm trên Cloud, vui lòng kiểm tra lại cấu hình.',
      );
    }
  }

  @Cron(CronExpression.EVERY_3_HOURS)
  async handleCronCleanup() {
    this.logger.log('[CRON JOB] Tự động kích hoạt tác vụ xóa rác Cloudinary...');
    await this.cleanupTemporaryMedia();
  }
}