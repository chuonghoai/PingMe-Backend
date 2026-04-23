import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { IntimacyRelationship } from './intimacy-relationship.entity';

export enum EIntimacyEventType {
  CHAT = 'CHAT',
  LOCATION = 'LOCATION',
  PROXIMITY = 'PROXIMITY',
  CALL = 'CALL',
  REACTION = 'REACTION',
  GIFT = 'GIFT',
}

@Entity('intimacy_events')
export class IntimacyEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  relationshipId: string;

  @ManyToOne(() => IntimacyRelationship, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'relationshipId' })
  relationship: IntimacyRelationship;

  @Column({ type: 'enum', enum: EIntimacyEventType })
  eventType: EIntimacyEventType;

  @Column({ type: 'int' })
  scoreDelta: number;

  @CreateDateColumn()
  @Index()
  createdAt: Date;
}
