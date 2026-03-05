/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { ENV_VARS } from '../../constants/env.constants';

@Injectable()
export class MediaService {
  constructor(private configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get<string>(ENV_VARS.CLOUDINARY_CLOUD_NAME) as string,
      api_key: this.configService.get<string>(ENV_VARS.CLOUDINARY_API_KEY) as string,
      api_secret: this.configService.get<string>(ENV_VARS.CLOUDINARY_API_SECRET) as string,
    });
  }

  getUploadSignature() {
    const timestamp = Math.round(new Date().getTime() / 1000);
    const folderName = ENV_VARS.CLOUDINARY_FOLDER;

    const paramsToSign = {
      timestamp: timestamp,
      folder: folderName,
    };
    const apiSecret = this.configService.get<string>(ENV_VARS.CLOUDINARY_API_SECRET) as string;

    const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret);

    return {
      signature: signature,
      timestamp: timestamp,
      folder: folderName,
      api_key: this.configService.get<string>(ENV_VARS.CLOUDINARY_API_KEY),
      cloud_name: this.configService.get<string>(ENV_VARS.CLOUDINARY_CLOUD_NAME),
    };
  }
}