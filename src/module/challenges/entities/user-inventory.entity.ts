/* eslint-disable prettier/prettier */
import { Entity, Column, PrimaryGeneratedColumn, UpdateDateColumn, Index, Unique } from 'typeorm';
import { EItemType } from './challenge-definition';

@Entity('user_inventory')
@Unique(['userId', 'itemType'])
export class UserInventory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  userId: string;

  @Column({ type: 'varchar', length: 50 })
  itemType: EItemType;

  @Column({ type: 'int', default: 0 })
  quantity: number;

  @UpdateDateColumn()
  updatedAt: Date;
}
