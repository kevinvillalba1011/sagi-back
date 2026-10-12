import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities.base.js';
import { Role } from '../../roles/entities/role.entity.js';

@Entity('users')
export class User extends BaseEntity {
  @Index({ unique: true }) @Column({ length: 50 }) username: string;
  @Index({ unique: true }) @Column({ length: 160 }) email: string;
  @Column({ length: 120 }) fullName: string;
  @Column({ select: false }) passwordHash: string;
  @Column({ default: true }) isActive: boolean;
  /** true cuando la contraseña fue asignada por un administrador: obliga a cambiarla. */
  @Column({ default: true }) mustChangePassword: boolean;
  @Column({ type: 'timestamptz', nullable: true }) lastLoginAt: Date | null;

  @Column() roleId: string;
  @ManyToOne(() => Role, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @Column({ type: 'uuid', nullable: true }) createdById: string | null;
}
