import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';
import { OtpPurpose } from '../enums/otp-purpose.enum';

@Entity('otps')
export class Otp {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  email: string;

  @Column()
  otp: string;

  @Column({ type: 'enum', enum: OtpPurpose, nullable: true })
  purpose: OtpPurpose;

  @Column({ type: 'timestamp' })
  expirationTime: Date;

  @Column({ default: false })
  isUsed: boolean;

  @CreateDateColumn()
  createdAt: Date;
}