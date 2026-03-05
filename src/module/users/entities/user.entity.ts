/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

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

  @Column()
  gender: string;

  @Column()
  dob: Date;

  @Column()
  role: string;

  @Column()
  joinAt: Date;

  @Column()
  lastActiveAt: Date;

  @Column()
  isOnline: boolean;
}
