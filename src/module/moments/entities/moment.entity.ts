/* eslint-disable prettier/prettier */
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { MomentReport } from './moment-report.entity';

@Entity('moments')
export class Moment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  imageUrl: string;

  @Column({ type: 'text', nullable: true })
  caption: string;

  @Column({ type: 'double', nullable: false })
  latitude: number;

  @Column({ type: 'double', nullable: false })
  longitude: number;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @OneToMany(() => MomentReport, (report) => report.moment)
  reports: MomentReport[];
}
