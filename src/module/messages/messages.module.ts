import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessagesService } from './messages.service';
import { MessageRepository } from './messages.repository';
import { ConversationModule } from '../conversations/conversations.module';
import { Message } from './entities/message.entities';
import { MessagesController } from './messages.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Message]), ConversationModule],
  providers: [MessagesService, MessageRepository],
  controllers: [MessagesController],
  exports: [MessagesService, MessageRepository],
})
export class MessagesModule {}
