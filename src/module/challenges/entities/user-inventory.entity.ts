/* eslint-disable prettier/prettier */
import { Entity, Column, PrimaryGeneratedColumn, UpdateDateColumn, Index, Unique, ManyToOne, JoinColumn } from 'typeorm';
import { EItemType } from './challenge-definition';
import { User } from '../../users/entities/user.entity';

@Entity('user_inventory')
@Unique(['userId', 'itemType'])
export class UserInventory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'varchar', length: 50 })
  itemType: EItemType;

  @Column({ type: 'int', default: 0 })
  quantity: number;

  @UpdateDateColumn()
  updatedAt: Date;
}
