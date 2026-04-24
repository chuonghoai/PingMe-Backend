import { Entity, Column, PrimaryGeneratedColumn, Unique, CreateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { IntimacyRelationship } from './intimacy-relationship.entity';

@Entity('daily_intimacy_stats')
@Unique(['relationshipId', 'dateString'])
export class DailyIntimacyStat {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  relationshipId: string;

  @ManyToOne(() => IntimacyRelationship, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'relationshipId' })
  relationship: IntimacyRelationship;

  @Column()
  @Index()
  dateString: string;

  @Column({ type: 'int', default: 0 })
  pointsGained: number;

  @Column({ type: 'int', default: 0 })
  messagesCount: number;

  @Column({ type: 'int', default: 0 })
  proximityMinutes: number;

  @CreateDateColumn()
  createdAt: Date;
}
