import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Moment } from './moment.entity';
import { User } from '../../users/entities/user.entity';

@Entity('moment_reports')
export class MomentReport {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    momentId: string;

    @Column()
    reporterId: string;

    @Column()
    reason: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ default: false })
    isHandled: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @ManyToOne(() => Moment, { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'momentId' })
    moment: Moment;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'reporterId' })
    reporter: User;
}