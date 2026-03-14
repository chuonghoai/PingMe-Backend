import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessagesService } from './messages.service';
import { MessageRepository } from './messages.repository';
import { ConversationModule } from '../conversations/conversations.module';
import { Message } from './entities/message.entities';

@Module({
  imports: [TypeOrmModule.forFeature([Message]), ConversationModule],
  providers: [MessagesService, MessageRepository],
  exports: [MessagesService, MessageRepository],
})
export class MessagesModule {}
