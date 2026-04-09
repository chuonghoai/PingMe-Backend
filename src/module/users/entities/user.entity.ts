/* eslint-disable prettier/prettier */
 
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';
import { EUserActivityType, EUserGender, EUserRole, EUserStatus } from '../enums/user.enum';

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

  @Column({ type: 'float', nullable: true })
  lat: number;

  @Column({ type: 'float', nullable: true })
  lng: number;

  @Column({ unique: true, nullable: true })
  username: string;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  locationUpdatedAt: Date;

  @Column({ nullable: true, length: 255 })
  statusMessage: string;

  @Column({ type: 'enum', enum: EUserActivityType, default: EUserActivityType.OFFLINE })
  activityType: EUserActivityType;

  @Column({ type: 'int', nullable: true })
  battery: number;

  @Column({ type: 'float', nullable: true })
  speed: number;

  @Column({ default: false })
  isHideMyLocation: boolean;

  @Column({ nullable: true })
  storyUrl: string;

  @Column({ nullable: true })
  checkInLocation: string;

  @Column({ type: 'int', default: 1 })
  level: number;

  @Column({ type: 'int', default: 0 })
  currentExp: number;
}
