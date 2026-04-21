/* eslint-disable prettier/prettier */
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';
import { EChallengeType } from './challenge-definition';

@Entity('user_challenges')
@Index(['userId', 'challengeType'], { unique: false })
export class UserChallenge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  userId: string;

  @Column({ nullable: true })
  friendId: string; // For pair-specific challenges (optional)

  @Column({ type: 'varchar', length: 50 })
  challengeType: EChallengeType;

  @Column({ type: 'int', default: 0 })
  currentProgress: number;

  @Column({ type: 'int' })
  targetProgress: number;

  @Column({ default: false })
  isCompleted: boolean;

  @Column({ default: false })
  isClaimed: boolean;

  @Column({ nullable: true })
  completedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
