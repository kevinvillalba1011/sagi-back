import {
  Check, Column, CreateDateColumn, Entity, Generated, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn,
} from 'typeorm';
import { Product } from '../../products/entities/product.entity.js';
import { User } from '../../users/entities/user.entity.js';

export enum MovementType {
  IN = 'IN',
  OUT = 'OUT',
}

/** Motivos permitidos (alineados con el mockup del front y las reglas del documento). */
export enum MovementReason {
  PURCHASE = 'Compra',
  RETURN = 'Devolución',
  ADJUSTMENT = 'Ajuste de inventario',
  INTERNAL_USE = 'Consumo interno',
  SALE = 'Entrega o venta',
  LOSS = 'Merma o daño',
  INITIAL = 'Inventario inicial',
}

export const REASONS_BY_TYPE: Record<MovementType, MovementReason[]> = {
  [MovementType.IN]: [MovementReason.PURCHASE, MovementReason.RETURN, MovementReason.ADJUSTMENT],
  [MovementType.OUT]: [
    MovementReason.INTERNAL_USE,
    MovementReason.SALE,
    MovementReason.LOSS,
    MovementReason.ADJUSTMENT,
  ],
};

/** Inmutable: nunca se actualiza ni elimina (RF02). Los errores se corrigen con otro movimiento. */
@Entity('inventory_movements')
@Check('"quantity" > 0')
@Index(['productId', 'createdAt'])
export class InventoryMovement {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column() productId: string;
  @ManyToOne(() => Product, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ type: 'enum', enum: MovementType, enumName: 'movement_type' }) type: MovementType;
  @Column({ type: 'int' }) quantity: number;
  /** Existencia resultante tras aplicar el movimiento (permite reconstruir el saldo). */
  @Column({ type: 'int' }) balanceAfter: number;
  @Column({ type: 'varchar', length: 40 }) reason: MovementReason;
  @Column({ type: 'varchar', length: 255, nullable: true }) observation: string | null;

  @Column() userId: string;
  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  /** clock_timestamp(): hora real de inserción (ya con el bloqueo del producto), no la de inicio de la transacción. */
  @Index() @CreateDateColumn({ type: 'timestamptz', default: () => 'clock_timestamp()' }) createdAt: Date;

  /** Orden estricto de registro; desempata movimientos con la misma marca de tiempo. */
  @Column({ type: 'bigint' }) @Generated('increment') seq: string;
}
