import { User } from 'src/module/users/entities/user.entity';
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index, Unique, ManyToOne, JoinColumn } from 'typeorm';
import { MapEvent } from './map-event.entity';

@Entity('user_event_history')
@Unique(['userId', 'eventId'])
export class UserEventHistory {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    @Index()
    userId: string;

    @Column()
    @Index()
    eventId: string;

    @CreateDateColumn()
    completedAt: Date;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user: User;

    @ManyToOne(() => MapEvent, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'eventId' })
    mapEvent: MapEvent;
}