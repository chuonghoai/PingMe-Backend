import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Unique } from 'typeorm';

@Entity('intimacy_relationships')
@Unique(['user1Id', 'user2Id']) // Ensure only one relationship per pair
export class IntimacyRelationship {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  user1Id: string; // To avoid duplicates, user1Id should always be less than user2Id

  @Column()
  user2Id: string;

  @Column({ type: 'int', default: 0 })
  totalIntimacyScore: number;

  @Column({ type: 'int', default: 1 })
  level: number;

  @Column({ type: 'int', default: 0 })
  currentStreak: number;

  @Column({ type: 'int', default: 0 })
  longestStreak: number;

  @Column({ nullable: true })
  lastInteractionAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
