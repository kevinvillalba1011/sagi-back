import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { Perm } from '../../modules/roles/permissions.constants.js';

export const IS_PUBLIC_KEY = 'isPublic';
export const PERMISSIONS_KEY = 'permissions';
export const ALLOW_PASSWORD_CHANGE_KEY = 'allowPasswordChange';

/** Ruta sin autenticación. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
/** Exige TODOS los permisos indicados (el super admin siempre pasa). */
export const RequirePermissions = (...p: Perm[]) => SetMetadata(PERMISSIONS_KEY, p);
/** Permite la ruta aunque el usuario deba cambiar su contraseña. */
export const AllowPasswordChange = () => SetMetadata(ALLOW_PASSWORD_CHANGE_KEY, true);

export interface AuthUser {
  id: string;
  username: string;
  fullName: string;
  email: string;
  mustChangePassword: boolean;
  role: { id: string; name: string; isSuperAdmin: boolean };
  permissions: string[];
}

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthUser => {
  return ctx.switchToHttp().getRequest().user;
});
