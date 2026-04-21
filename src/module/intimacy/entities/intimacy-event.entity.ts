import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

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

  @Column({ type: 'enum', enum: EIntimacyEventType })
  eventType: EIntimacyEventType;

  @Column({ type: 'int' })
  scoreDelta: number;

  @CreateDateColumn()
  @Index()
  createdAt: Date;
}
