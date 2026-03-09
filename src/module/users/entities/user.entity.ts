/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
import { EUserGender, EUserRole, EUserStatus } from '../enums/user.enum';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  fullname: string;

  @Column({ unique: true })
  email: string;

  @Column({ select: false })
  password: string;

  @Column()
  phone: string;

  @Column()
  avatarUrl: string;

  @Column({ type: 'enum', enum: EUserStatus, default: EUserStatus.PENDING })
  status: EUserStatus;

  @Column({ type: 'enum', enum: EUserGender, nullable: true })
  gender: EUserGender;

  @Column()
  dob: Date;

  @Column({ type: 'enum', enum: EUserRole, default: EUserRole.CLIENT })
  role: EUserRole;

  @Column()
  joinAt: Date;

  @Column()
  lastActiveAt: Date;

  @Column()
  isOnline: boolean;
}
