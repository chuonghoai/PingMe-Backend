/* eslint-disable prettier/prettier */
import { TypeOrmModule } from '@nestjs/typeorm';
import { Module } from '@nestjs/common';
import { MediaService } from './media.service';
import { MediaController } from './media.controller';
import { MediaObject } from './entities/media.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([MediaObject]),
  ],
  providers: [MediaService],
  controllers: [MediaController],
})
export class MediaModule {}
