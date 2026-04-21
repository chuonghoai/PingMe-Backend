import { EConversationParticipantRole as EConvParRole } from './../enums/conversation.enum';
/* eslint-disable prettier/prettier */
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Conversation } from './conversation.entity';

@Entity('conversation_participants')
export class ConversationParticipant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  conversationId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Conversation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversationId' })
  conversation: Conversation;

  @Column({ type: 'enum', enum: EConvParRole, default: EConvParRole.MEMBER })
  role: EConvParRole;

  @Column({ type: 'int', default: 0 })
  unreadCount: number;

  @Column({ default: false })
  hasMuted: boolean;

  @Column({ default: true })
  isVisible: boolean;

  @Column({ nullable: true })
  clearedAt: Date;

  @CreateDateColumn()
  joinedAt: Date;
}