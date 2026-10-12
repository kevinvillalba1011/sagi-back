import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { rethrowUnique } from '../../common/utils/db-errors.js';
import { User } from '../users/entities/user.entity.js';
import { CreateRoleDto, UpdateRoleDto } from './dto/role.dto.js';
import { Permission } from './entities/permission.entity.js';
import { Role } from './entities/role.entity.js';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role) private readonly roles: Repository<Role>,
    @InjectRepository(Permission) private readonly perms: Repository<Permission>,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  listPermissions() {
    return this.perms.find({ order: { module: 'ASC', code: 'ASC' } });
  }

  list() {
    return this.roles.find({ relations: { permissions: true }, order: { name: 'ASC' } });
  }

  async findOne(id: string) {
    const role = await this.roles.findOne({ where: { id }, relations: { permissions: true } });
    if (!role) throw new NotFoundException('Rol no encontrado');
    return role;
  }

  async create(dto: CreateRoleDto) {
    const permissions = await this.resolvePermissions(dto.permissions);
    try {
      const role = await this.roles.save(
        this.roles.create({ name: dto.name.trim(), description: dto.description ?? null, permissions }),
      );
      return this.findOne(role.id);
    } catch (e) {
      rethrowUnique(e, 'Ya existe un rol con ese nombre');
    }
  }

  async update(id: string, dto: UpdateRoleDto) {
    const role = await this.findOne(id);
    if (role.isSuperAdmin) throw new ForbiddenException('El rol de super administrador no se puede modificar');
    if (dto.name !== undefined) {
      if (role.isSystem && dto.name.trim() !== role.name) {
        throw new ForbiddenException('Los roles del sistema no se pueden renombrar');
      }
      role.name = dto.name.trim();
    }
    if (dto.description !== undefined) role.description = dto.description;
    if (dto.permissions) role.permissions = await this.resolvePermissions(dto.permissions);
    try {
      await this.roles.save(role);
    } catch (e) {
      rethrowUnique(e, 'Ya existe un rol con ese nombre');
    }
    return this.findOne(id);
  }

  async remove(id: string) {
    const role = await this.findOne(id);
    if (role.isSystem || role.isSuperAdmin) {
      throw new ForbiddenException('Los roles del sistema no se pueden eliminar');
    }
    const inUse = await this.users.count({ where: { roleId: id } });
    if (inUse > 0) throw new ConflictException(`El rol está asignado a ${inUse} usuario(s)`);
    await this.roles.remove(role);
  }

  private async resolvePermissions(codes: string[]) {
    const found = codes.length ? await this.perms.find({ where: { code: In(codes) } }) : [];
    const missing = codes.filter((c) => !found.some((p) => p.code === c));
    if (missing.length) throw new BadRequestException(`Permisos inexistentes: ${missing.join(', ')}`);
    return found;
  }
}
