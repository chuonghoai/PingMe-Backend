import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Conversation } from './entities/conversation.entity';
import { ConversationParticipant } from './entities/conversationParticipant.entity';
import { ConversationService } from './conversations.service';
import { ConversationController } from './conversations.controller';
import { ConversationRepository } from './repository/conversation.repository';
import { ConversationParticipantRepository } from './repository/conversation-participant.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Conversation, ConversationParticipant])],
  providers: [
    ConversationService,
    ConversationRepository,
    ConversationParticipantRepository,
  ],
  controllers: [ConversationController],
  exports: [
    ConversationService,
    ConversationRepository,
    ConversationParticipantRepository,
  ],
})
export class ConversationModule {}
