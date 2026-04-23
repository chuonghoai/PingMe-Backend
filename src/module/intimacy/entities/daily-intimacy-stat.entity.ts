import { Entity, Column, PrimaryGeneratedColumn, Unique, CreateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { IntimacyRelationship } from './intimacy-relationship.entity';

@Entity('daily_intimacy_stats')
@Unique(['relationshipId', 'dateString']) // Ensure only one stat per relationship per day
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
  dateString: string; // Stored as 'YYYY-MM-DD' for easy querying

  @Column({ type: 'int', default: 0 })
  pointsGained: number; // Anti-spam daily cap tracking

  @Column({ type: 'int', default: 0 })
  messagesCount: number;

  @Column({ type: 'int', default: 0 })
  proximityMinutes: number; // Track duration near each other

  @CreateDateColumn()
  createdAt: Date;
}
