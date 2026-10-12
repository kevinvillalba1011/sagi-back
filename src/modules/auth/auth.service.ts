import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomBytes } from 'crypto';
import { IsNull, LessThan, Repository } from 'typeorm';
import { AuthUser } from '../../common/decorators/index.js';
import { User } from '../users/entities/user.entity.js';
import { RefreshToken } from './entities/refresh-token.entity.js';
import { toAuthUser } from './jwt.strategy.js';
import { PasswordService } from './password.service.js';

export interface ClientMeta {
  ip?: string;
  userAgent?: string;
}
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');
const INVALID = 'Credenciales inválidas';

@Injectable()
export class AuthService {
  private readonly accessTtl: number;
  readonly refreshTtl: number;
  private dummyHash?: Promise<string>;

  constructor(
    config: ConfigService,
    private readonly jwt: JwtService,
    private readonly passwords: PasswordService,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(RefreshToken) private readonly tokens: Repository<RefreshToken>,
  ) {
    this.accessTtl = config.getOrThrow<number>('JWT_ACCESS_TTL_SECONDS');
    this.refreshTtl = config.getOrThrow<number>('REFRESH_TTL_SECONDS');
  }

  async login(username: string, password: string, meta: ClientMeta) {
    const user = await this.users
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .leftJoinAndSelect('u.role', 'role')
      .leftJoinAndSelect('role.permissions', 'perm')
      .where('u.username = :username', { username })
      .getOne();

    // Siempre se verifica un hash para no revelar (por tiempo) si el usuario existe.
    this.dummyHash ??= this.passwords.hash('dummy-password-1');
    const ok = await this.passwords.verify(user?.passwordHash ?? (await this.dummyHash), password);
    if (!user || !ok || !user.isActive) throw new UnauthorizedException(INVALID);

    await this.users.update(user.id, { lastLoginAt: new Date() });
    const tokens = await this.issueTokens(user.id, meta);
    return { tokens, user: toAuthUser(user) };
  }

  async refresh(rawToken: string | undefined, meta: ClientMeta) {
    if (!rawToken) throw new UnauthorizedException('Sesión no válida');
    const stored = await this.tokens.findOne({ where: { tokenHash: sha256(rawToken) } });
    if (!stored) throw new UnauthorizedException('Sesión no válida');

    if (stored.revokedAt) {
      // Reutilización de un token ya rotado: posible robo → se cierran todas las sesiones.
      await this.revokeAllForUser(stored.userId);
      throw new UnauthorizedException('Sesión no válida');
    }
    if (stored.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Sesión expirada por inactividad');
    }
    const user = await this.users.findOne({
      where: { id: stored.userId },
      relations: { role: { permissions: true } },
    });
    if (!user || !user.isActive) throw new UnauthorizedException('Sesión no válida');

    await this.tokens.update(stored.id, { revokedAt: new Date() });
    const tokens = await this.issueTokens(user.id, meta);
    return { tokens, user: toAuthUser(user) };
  }

  async logout(rawToken: string | undefined) {
    if (!rawToken) return;
    await this.tokens.update({ tokenHash: sha256(rawToken), revokedAt: IsNull() }, { revokedAt: new Date() });
  }

  async changePassword(userId: string, current: string, next: string, meta: ClientMeta) {
    const user = await this.users
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .leftJoinAndSelect('u.role', 'role')
      .leftJoinAndSelect('role.permissions', 'perm')
      .where('u.id = :userId', { userId })
      .getOneOrFail();
    if (!(await this.passwords.verify(user.passwordHash, current))) {
      throw new BadRequestException('La contraseña actual es incorrecta');
    }
    if (current === next) throw new BadRequestException('La nueva contraseña debe ser distinta');
    await this.users.update(userId, {
      passwordHash: await this.passwords.hash(next),
      mustChangePassword: false,
    });
    await this.revokeAllForUser(userId);
    user.mustChangePassword = false;
    return { tokens: await this.issueTokens(userId, meta), user: toAuthUser(user) };
  }

  revokeAllForUser(userId: string) {
    return this.tokens.update({ userId, revokedAt: IsNull() }, { revokedAt: new Date() });
  }

  me(user: AuthUser) {
    return user;
  }

  private async issueTokens(userId: string, meta: ClientMeta): Promise<TokenPair> {
    const accessToken = await this.jwt.signAsync({ sub: userId }, { expiresIn: this.accessTtl, algorithm: 'HS256' });
    const refreshToken = randomBytes(48).toString('base64url');
    await this.tokens.save(
      this.tokens.create({
        userId,
        tokenHash: sha256(refreshToken),
        expiresAt: new Date(Date.now() + this.refreshTtl * 1000),
        ip: meta.ip?.slice(0, 64) ?? null,
        userAgent: meta.userAgent?.slice(0, 255) ?? null,
      }),
    );
    // Limpieza oportunista de tokens vencidos del usuario.
    await this.tokens.delete({ userId, expiresAt: LessThan(new Date(Date.now() - 86_400_000)) });
    return { accessToken, refreshToken, expiresIn: this.accessTtl };
  }
}
