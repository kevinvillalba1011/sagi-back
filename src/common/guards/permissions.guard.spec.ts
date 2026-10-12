import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it } from 'vitest';
import { Perm } from '../../modules/roles/permissions.constants.js';
import { PermissionsGuard } from './permissions.guard.js';

const ctx = (user: unknown, meta: Record<string, unknown>) => {
  const reflector = { getAllAndOverride: (k: string) => meta[k] } as unknown as Reflector;
  const context = {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
  return { guard: new PermissionsGuard(reflector), context };
};
const user = (permissions: string[], extra: object = {}) => ({
  id: '1', permissions, mustChangePassword: false, role: { id: 'r', name: 'x', isSuperAdmin: false }, ...extra,
});

describe('PermissionsGuard', () => {
  it('permite rutas públicas', () => {
    const { guard, context } = ctx(undefined, { isPublic: true });
    expect(guard.canActivate(context)).toBe(true);
  });
  it('exige todos los permisos requeridos', () => {
    const meta = { permissions: [Perm.PRODUCTS_CREATE] };
    expect(ctx(user([Perm.PRODUCTS_CREATE]), meta).guard.canActivate(ctx(user([Perm.PRODUCTS_CREATE]), meta).context)).toBe(true);
    const { guard, context } = ctx(user([Perm.PRODUCTS_READ]), meta);
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
  it('el super admin siempre pasa', () => {
    const u = user([], { role: { id: 'r', name: 'SUPER_ADMIN', isSuperAdmin: true } });
    const { guard, context } = ctx(u, { permissions: [Perm.USERS_CREATE] });
    expect(guard.canActivate(context)).toBe(true);
  });
  it('bloquea todo si debe cambiar la contraseña, salvo rutas permitidas', () => {
    const u = user([Perm.PRODUCTS_READ], { mustChangePassword: true });
    expect(() => ctx(u, {}).guard.canActivate(ctx(u, {}).context)).toThrow(ForbiddenException);
    const { guard, context } = ctx(u, { allowPasswordChange: true });
    expect(guard.canActivate(context)).toBe(true);
  });
});
