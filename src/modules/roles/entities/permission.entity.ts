import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../../common/entities.base.js';

@Entity('permissions')
export class Permission extends BaseEntity {
  /** Código estable, p. ej. "products:create". */
  @Column({ unique: true, length: 80 }) code: string;
  @Column({ length: 200 }) description: string;
  @Column({ length: 40 }) module: string;
}
