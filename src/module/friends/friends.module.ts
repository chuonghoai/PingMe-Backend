import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FriendsService } from './friends.service';
import { FriendsController } from './friends.controller';
import { Friend } from './entities/friend.entity';
import { User } from '../users/entities/user.entity';
import { WebsocketsModule } from '../websockets/websockets.module';
import { ConversationModule } from '../conversations/conversations.module';
import { MessagesModule } from '../messages/messages.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { IntimacyModule } from '../intimacy/intimacy.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Friend, User]),
    forwardRef(() => WebsocketsModule),
    ConversationModule,
    forwardRef(() => MessagesModule),
    forwardRef(() => NotificationsModule),
    forwardRef(() => IntimacyModule),
  ],
  providers: [FriendsService],
  controllers: [FriendsController],
  exports: [FriendsService],
})
export class FriendsModule {}
