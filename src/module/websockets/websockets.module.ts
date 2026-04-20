import { forwardRef, Module } from '@nestjs/common';
import { ChatGateway } from './websocket.gateway';
import { WebsocketsService } from './websockets.service';
import { UsersModule } from '../users/users.module';
import { ConversationModule } from '../conversations/conversations.module';
import { MessagesModule } from '../messages/messages.module';
import { AuthModule } from '../auth/auth.module';
import { FriendsModule } from '../friends/friends.module';

@Module({
  imports: [
    forwardRef(() => UsersModule),
    ConversationModule,
    MessagesModule,
    forwardRef(() => AuthModule),
    forwardRef(() => FriendsModule),
  ],
  providers: [ChatGateway, WebsocketsService],
  exports: [WebsocketsService],
})
export class WebsocketsModule {}
