import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { AuthUser } from '../../common/decorators/index.js';
import { User } from '../users/entities/user.entity.js';

export interface JwtPayload {
  sub: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      algorithms: ['HS256'],
      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  /** Se consulta el usuario en cada petición: cambios de rol/estado aplican de inmediato. */
  async validate(payload: JwtPayload): Promise<AuthUser> {
    const user = await this.users.findOne({
      where: { id: payload.sub },
      relations: { role: { permissions: true } },
    });
    if (!user || !user.isActive) throw new UnauthorizedException();
    return toAuthUser(user);
  }
}

export function toAuthUser(user: User): AuthUser {
  return {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    email: user.email,
    mustChangePassword: user.mustChangePassword,
    role: { id: user.role.id, name: user.role.name, isSuperAdmin: user.role.isSuperAdmin },
    permissions: (user.role.permissions ?? []).map((p) => p.code),
  };
}
