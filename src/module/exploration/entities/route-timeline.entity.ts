import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Unique, UpdateDateColumn } from 'typeorm';

@Entity('route_timelines')
@Unique(['userId', 'date'])
export class RouteTimeline {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'char', length: 36 })
  userId: string;

  @Column({ type: 'date' })
  date: string; // YYYY-MM-DD

  // Storing simple coordinate points as JSON array [ {lat, lng}, ... ]
  @Column({ type: 'json', nullable: true })
  path: any;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
