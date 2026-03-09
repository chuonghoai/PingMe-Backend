/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';
import { EUserGender, EUserRole, EUserStatus } from '../enums/user.enum';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  fullname: string;

  @Column({ unique: true })
  email: string;

  @Column({ select: false })
  password: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  avatarUrl: string;

  @Column({ type: 'enum', enum: EUserStatus, default: EUserStatus.PENDING })
  status: EUserStatus;

  @Column({ type: 'enum', enum: EUserGender, nullable: true })
  gender: EUserGender;

  @Column({ nullable: true })
  dob: Date;

  @Column({ type: 'enum', enum: EUserRole, default: EUserRole.CLIENT })
  role: EUserRole;

  @CreateDateColumn()
  joinAt: Date;

  @Column({ nullable: true })
  lastActiveAt: Date;

  @Column({ default: false })
  isOnline: boolean;
}
