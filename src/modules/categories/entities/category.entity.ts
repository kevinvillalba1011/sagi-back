import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../../common/entities.base.js';

@Entity('categories')
export class Category extends BaseEntity {
  @Column({ unique: true, length: 80 }) name: string;
  @Column({ type: 'varchar', length: 255, nullable: true }) description: string | null;
  @Column({ default: true }) isActive: boolean;
}
