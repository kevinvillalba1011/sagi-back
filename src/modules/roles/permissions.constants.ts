export enum Perm {
  USERS_READ = 'users:read',
  USERS_CREATE = 'users:create',
  USERS_UPDATE = 'users:update',
  ROLES_READ = 'roles:read',
  ROLES_MANAGE = 'roles:manage',
  CATEGORIES_READ = 'categories:read',
  CATEGORIES_MANAGE = 'categories:manage',
  PRODUCTS_READ = 'products:read',
  PRODUCTS_CREATE = 'products:create',
  PRODUCTS_UPDATE = 'products:update',
  PRODUCTS_DEACTIVATE = 'products:deactivate',
  MOVEMENTS_CREATE = 'movements:create',
  MOVEMENTS_READ = 'movements:read',
  INVENTORY_READ = 'inventory:read',
  ALERTS_READ = 'alerts:read',
}

export const PERMISSION_CATALOG: { code: Perm; description: string }[] = [
  { code: Perm.USERS_READ, description: 'Consultar usuarios' },
  { code: Perm.USERS_CREATE, description: 'Crear usuarios' },
  { code: Perm.USERS_UPDATE, description: 'Modificar usuarios, asignar rol y activar/desactivar' },
  { code: Perm.ROLES_READ, description: 'Consultar roles y permisos' },
  { code: Perm.ROLES_MANAGE, description: 'Crear, modificar y eliminar roles' },
  { code: Perm.CATEGORIES_READ, description: 'Consultar categorías' },
  { code: Perm.CATEGORIES_MANAGE, description: 'Crear y modificar categorías' },
  { code: Perm.PRODUCTS_READ, description: 'Consultar productos' },
  { code: Perm.PRODUCTS_CREATE, description: 'Registrar producto' },
  { code: Perm.PRODUCTS_UPDATE, description: 'Modificar producto' },
  { code: Perm.PRODUCTS_DEACTIVATE, description: 'Desactivar / reactivar producto' },
  { code: Perm.MOVEMENTS_CREATE, description: 'Registrar entradas y salidas' },
  { code: Perm.MOVEMENTS_READ, description: 'Consultar historial de movimientos' },
  { code: Perm.INVENTORY_READ, description: 'Consultar inventario y resumen' },
  { code: Perm.ALERTS_READ, description: 'Consultar alertas de stock' },
];

export const permissionModule = (code: string) => code.split(':')[0];

export const SUPER_ADMIN_ROLE = 'SUPER_ADMIN';

/** Roles de la matriz del documento (sección 7.8). Editables luego desde la API. */
export const DEFAULT_ROLES: {
  name: string;
  description: string;
  isSuperAdmin?: boolean;
  permissions: Perm[];
}[] = [
  {
    name: SUPER_ADMIN_ROLE,
    description: 'Acceso total. Crea usuarios y asigna roles.',
    isSuperAdmin: true,
    permissions: Object.values(Perm),
  },
  {
    name: 'Administrador',
    description: 'Administración y seguimiento del inventario.',
    permissions: [
      Perm.PRODUCTS_READ, Perm.PRODUCTS_CREATE, Perm.PRODUCTS_UPDATE, Perm.PRODUCTS_DEACTIVATE,
      Perm.CATEGORIES_READ, Perm.CATEGORIES_MANAGE, Perm.MOVEMENTS_CREATE, Perm.MOVEMENTS_READ,
      Perm.INVENTORY_READ, Perm.ALERTS_READ,
    ],
  },
  {
    name: 'Otro administrador',
    description: 'Funciones delegadas por el administrador.',
    permissions: [
      Perm.PRODUCTS_READ, Perm.PRODUCTS_CREATE, Perm.PRODUCTS_UPDATE, Perm.CATEGORIES_READ,
      Perm.MOVEMENTS_CREATE, Perm.INVENTORY_READ,
    ],
  },
  {
    name: 'Encargado de inventario',
    description: 'Usuario operativo: productos y movimientos.',
    permissions: [
      Perm.PRODUCTS_READ, Perm.PRODUCTS_CREATE, Perm.PRODUCTS_UPDATE, Perm.CATEGORIES_READ,
      Perm.MOVEMENTS_CREATE, Perm.INVENTORY_READ,
    ],
  },
  {
    name: 'Personal de compras',
    description: 'Consulta orientada a reposición.',
    permissions: [Perm.PRODUCTS_READ, Perm.CATEGORIES_READ, Perm.INVENTORY_READ, Perm.ALERTS_READ],
  },
  {
    name: 'Gerencia o propietario',
    description: 'Consulta para toma de decisiones.',
    permissions: [Perm.INVENTORY_READ, Perm.MOVEMENTS_READ, Perm.PRODUCTS_READ],
  },
];
