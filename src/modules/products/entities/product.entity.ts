import { Check, Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities.base.js';
import { Category } from '../../categories/entities/category.entity.js';

@Entity('products')
@Check('"stock" >= 0')
@Check('"min_stock" >= 0')
export class Product extends BaseEntity {
  /** Único e inmutable (RF01.1 / RF01.2). */
  @Index({ unique: true }) @Column({ length: 50 }) code: string;
  @Index() @Column({ length: 160 }) name: string;
  @Column({ type: 'varchar', length: 500, nullable: true }) description: string | null;

  @Column() categoryId: string;
  @ManyToOne(() => Category, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'category_id' })
  category: Category;

  /** Saldo actual. Solo cambia mediante movimientos (RF01.2 / RF03). */
  @Column({ type: 'int', default: 0 }) stock: number;
  @Column({ type: 'int', default: 0 }) minStock: number;
  @Index() @Column({ default: true }) isActive: boolean;

  @Column({ type: 'uuid', nullable: true }) createdById: string | null;
  @Column({ type: 'uuid', nullable: true }) updatedById: string | null;
}
