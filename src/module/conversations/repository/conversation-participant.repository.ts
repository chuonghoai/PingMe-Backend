import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ConversationParticipant } from '../entities/conversationParticipant.entity';

@Injectable()
export class ConversationParticipantRepository extends Repository<ConversationParticipant> {
  constructor(private dataSource: DataSource) {
    super(ConversationParticipant, dataSource.createEntityManager());
  }
}
