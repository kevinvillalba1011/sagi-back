import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  ALLOW_PASSWORD_CHANGE_KEY,
  AuthUser,
  IS_PUBLIC_KEY,
  PERMISSIONS_KEY,
} from '../decorators/index.js';
import { Perm } from '../../modules/roles/permissions.constants.js';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) return true;

    const user: AuthUser | undefined = context.switchToHttp().getRequest().user;
    if (!user) throw new ForbiddenException('Acceso denegado');

    const allowPwd = this.reflector.getAllAndOverride<boolean>(ALLOW_PASSWORD_CHANGE_KEY, targets);
    if (user.mustChangePassword && !allowPwd) {
      throw new ForbiddenException({
        statusCode: 403,
        code: 'PASSWORD_CHANGE_REQUIRED',
        message: 'Debes cambiar tu contraseña antes de continuar',
      });
    }

    const required = this.reflector.getAllAndOverride<Perm[]>(PERMISSIONS_KEY, targets) ?? [];
    if (required.length === 0 || user.role.isSuperAdmin) return true;
    if (required.every((p) => user.permissions.includes(p))) return true;
    throw new ForbiddenException('No tienes permisos para realizar esta acción');
  }
}
