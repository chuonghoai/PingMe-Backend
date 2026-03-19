import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './entities/notifications.entity';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { WebsocketsModule } from '../websockets/websockets.module';
import { FriendsModule } from '../friends/friends.module';
import { UsersModule } from '../users/users.module';
import { NotificationsGateway } from './notifications.gateway';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification]),
    forwardRef(() => WebsocketsModule),
    forwardRef(() => FriendsModule),
    forwardRef(() => UsersModule),
  ],
  providers: [NotificationsService, NotificationsGateway],
  controllers: [NotificationsController],
  exports: [NotificationsService],
})
export class NotificationsModule {}
