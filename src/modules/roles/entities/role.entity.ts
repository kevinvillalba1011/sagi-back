import { Column, Entity, JoinTable, ManyToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities.base.js';
import { Permission } from './permission.entity.js';

@Entity('roles')
export class Role extends BaseEntity {
  @Column({ unique: true, length: 60 }) name: string;
  @Column({ type: 'varchar', length: 255, nullable: true }) description: string | null;
  /** El super administrador tiene acceso total y no puede modificarse ni eliminarse. */
  @Column({ default: false }) isSuperAdmin: boolean;
  /** Roles del documento de requerimientos: no se pueden eliminar ni renombrar. */
  @Column({ default: false }) isSystem: boolean;

  @ManyToMany(() => Permission, { eager: false })
  @JoinTable({ name: 'role_permissions' })
  permissions: Permission[];
}
