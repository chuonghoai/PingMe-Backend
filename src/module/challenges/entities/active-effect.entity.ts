/* eslint-disable prettier/prettier */
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';
import { EEffectType } from './challenge-definition';

@Entity('active_effects')
@Index(['userId', 'effectType'])
export class ActiveEffect {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  userId: string;

  @Column({ nullable: true })
  friendId: string; // Specific friend for streak shield, null for global effects

  @Column({ type: 'varchar', length: 50 })
  effectType: EEffectType;

  @Column()
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
