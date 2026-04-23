/* eslint-disable prettier/prettier */
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { EEffectType } from './challenge-definition';
import { User } from '../../users/entities/user.entity';

@Entity('active_effects')
@Index(['userId', 'effectType'])
export class ActiveEffect {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ nullable: true })
  friendId: string; // Specific friend for streak shield, null for global effects

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'friendId' })
  friend: User;

  @Column({ type: 'varchar', length: 50 })
  effectType: EEffectType;

  @Column()
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
