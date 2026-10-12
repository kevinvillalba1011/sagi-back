import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthUser } from '../../common/decorators/index.js';
import { paginated } from '../../common/dto/pagination.dto.js';
import { escapeLike, rethrowUnique } from '../../common/utils/db-errors.js';
import { AuthService } from '../auth/auth.service.js';
import { PasswordService } from '../auth/password.service.js';
import { Role } from '../roles/entities/role.entity.js';
import { CreateUserDto, ListUsersQueryDto, UpdateUserDto } from './dto/user.dto.js';
import { User } from './entities/user.entity.js';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Role) private readonly roles: Repository<Role>,
    private readonly passwords: PasswordService,
    private readonly auth: AuthService,
  ) {}

  async create(dto: CreateUserDto, actor: AuthUser) {
    await this.getRole(dto.roleId);
    try {
      const user = await this.users.save(
        this.users.create({
          username: dto.username,
          email: dto.email,
          fullName: dto.fullName,
          roleId: dto.roleId,
          passwordHash: await this.passwords.hash(dto.password),
          mustChangePassword: true,
          createdById: actor.id,
        }),
      );
      return this.findOne(user.id);
    } catch (e) {
      rethrowUnique(e, 'El usuario o el correo ya están registrados');
    }
  }

  async list(q: ListUsersQueryDto) {
    const qb = this.users.createQueryBuilder('u').leftJoinAndSelect('u.role', 'role');
    if (q.search) {
      qb.andWhere(
        "(u.username ILIKE :s ESCAPE '\\' OR u.full_name ILIKE :s ESCAPE '\\' OR u.email ILIKE :s ESCAPE '\\')",
        { s: `%${escapeLike(q.search)}%` },
      );
    }
    if (q.roleId) qb.andWhere('u.role_id = :roleId', { roleId: q.roleId });
    if (q.isActive !== undefined) qb.andWhere('u.is_active = :a', { a: q.isActive });
    const [data, total] = await qb
      .orderBy('u.createdAt', 'DESC')
      .skip((q.page - 1) * q.limit)
      .take(q.limit)
      .getManyAndCount();
    return paginated(data, total, q);
  }

  async findOne(id: string) {
    const user = await this.users.findOne({ where: { id }, relations: { role: true } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  async update(id: string, dto: UpdateUserDto, actor: AuthUser) {
    const user = await this.findOne(id);
    const isSelf = id === actor.id;
    if (isSelf && (dto.roleId !== undefined || dto.isActive === false)) {
      throw new ForbiddenException('No puedes cambiar tu propio rol ni desactivarte');
    }

    const leavingSuperAdmin =
      user.role.isSuperAdmin &&
      ((dto.roleId !== undefined && dto.roleId !== user.roleId) || dto.isActive === false);
    if (leavingSuperAdmin) await this.assertAnotherSuperAdmin(id);

    if (dto.roleId !== undefined && dto.roleId !== user.roleId) {
      user.role = await this.getRole(dto.roleId);
      user.roleId = dto.roleId;
    }
    if (dto.email !== undefined) user.email = dto.email;
    if (dto.fullName !== undefined) user.fullName = dto.fullName;
    if (dto.isActive !== undefined) user.isActive = dto.isActive;

    try {
      await this.users.save(user);
    } catch (e) {
      rethrowUnique(e, 'El correo ya está registrado');
    }
    if (dto.isActive === false) await this.auth.revokeAllForUser(id);
    return this.findOne(id);
  }

  async resetPassword(id: string, password: string) {
    await this.findOne(id);
    await this.users.update(id, { passwordHash: await this.passwords.hash(password), mustChangePassword: true });
    await this.auth.revokeAllForUser(id);
  }

  private async getRole(roleId: string) {
    const role = await this.roles.findOne({ where: { id: roleId } });
    if (!role) throw new BadRequestException('El rol indicado no existe');
    return role;
  }

  private async assertAnotherSuperAdmin(excludeId: string) {
    const others = await this.users
      .createQueryBuilder('u')
      .innerJoin('u.role', 'r')
      .where('r.is_super_admin = true AND u.is_active = true AND u.id <> :id', { id: excludeId })
      .getCount();
    if (others === 0) throw new ForbiddenException('Debe existir al menos un super administrador activo');
  }
}
