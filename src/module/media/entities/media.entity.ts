import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';
import { EMediaType } from '../enums/media.enum';

@Entity('media_objects')
export class MediaObject {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  publicId: string;

  @Column({ type: 'int', nullable: true })
  width: number;

  @Column({ type: 'int', nullable: true })
  height: number;

  @Column({ nullable: true })
  format: string;

  @Column({ type: 'enum', enum: EMediaType, nullable: false })
  resourceType: EMediaType;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'int', nullable: true })
  bytes: number;

  @Column()
  secureUrl: string;

  @Column({ type: 'float', nullable: true })
  duration: number;
}
