import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { FriendStatus } from '../enums/friend-status.enum';

@Entity('friends')
export class Friend {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  senderId: string;

  @Column()
  targetUserId: string;

  @Column({ type: 'enum', enum: FriendStatus, default: FriendStatus.PENDING })
  status: FriendStatus;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'senderId' })
  sender: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'targetUserId' })
  targetUser: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
