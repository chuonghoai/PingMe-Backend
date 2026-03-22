import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FriendsService } from './friends.service';
import { FriendsController } from './friends.controller';
import { Friend } from './entities/friend.entity';
import { User } from '../users/entities/user.entity';
import { WebsocketsModule } from '../websockets/websockets.module';

@Module({
  imports: [TypeOrmModule.forFeature([Friend, User]), WebsocketsModule],
  providers: [FriendsService],
  controllers: [FriendsController],
  exports: [FriendsService],
})
export class FriendsModule {}
