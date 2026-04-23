/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { ConversationParticipant } from './conversationParticipant.entity';
import { EConversationType } from '../enums/conversation.enum';
import { User } from '../../users/entities/user.entity';

@Entity('conversations')
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: EConversationType, default: EConversationType.ONE_TO_ONE })
  type: EConversationType;

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  avatarUrl: string;

  @Column({ nullable: true, length: 500 })
  lastMessageSnippet: string;

  @Column({ nullable: true })
  lastMessageAt: Date;

  @Column({ type: 'varchar', nullable: true })
  blockedById: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'blockedById' })
  blockedBy: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => ConversationParticipant, participant => participant.conversation)
  participants: ConversationParticipant[];
}