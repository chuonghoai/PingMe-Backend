import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Unique } from 'typeorm';

@Entity('explored_areas')
@Unique(['userId', 'hexId'])
export class ExploredArea {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'char', length: 36 })
  userId: string;

  // H3 index resolution 10 strings are 15 chars long max
  @Column({ name: 'hex_id', length: 20 })
  hexId: string;

  @CreateDateColumn({ name: 'visited_at' })
  visitedAt: Date;
}
