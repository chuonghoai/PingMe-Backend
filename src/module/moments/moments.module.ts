/* eslint-disable prettier/prettier */
import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Moment } from './entities/moment.entity';
import { MomentsService } from './moments.service';
import { MomentsController } from './moments.controller';
import { User } from '../users/entities/user.entity';
import { FriendsModule } from '../friends/friends.module';
import { WebsocketsModule } from '../websockets/websockets.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Moment, User]),
    forwardRef(() => FriendsModule),
    forwardRef(() => WebsocketsModule),
    forwardRef(() => NotificationsModule),
  ],
  controllers: [MomentsController],
  providers: [MomentsService],
  exports: [MomentsService],
})
export class MomentsModule {}
