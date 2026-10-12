import * as argon2 from 'argon2';
import { pathToFileURL } from 'node:url';
import type { DataSource } from 'typeorm';
import dataSource from './data-source.js';
import { Permission } from '../modules/roles/entities/permission.entity.js';
import { Role } from '../modules/roles/entities/role.entity.js';
import { User } from '../modules/users/entities/user.entity.js';
import {
  DEFAULT_ROLES,
  PERMISSION_CATALOG,
  permissionModule,
  SUPER_ADMIN_ROLE,
} from '../modules/roles/permissions.constants.js';

/**
 * Seed idempotente: sincroniza el catálogo de permisos, crea los roles base
 * (solo si no existen) y el primer super administrador (solo si no hay ninguno).
 * Requiere que las migraciones ya estén aplicadas.
 */
export async function runSeed(ds: DataSource) {
  {
    await ds.transaction(async (em) => {
      // 1) Permisos (se actualizan descripciones, nunca se borran)
      for (const p of PERMISSION_CATALOG) {
        await em.upsert(Permission, { code: p.code, description: p.description, module: permissionModule(p.code) }, ['code']);
      }
      const allPerms = await em.find(Permission);
      const byCode = new Map(allPerms.map((p) => [p.code, p]));

      // 2) Roles base
      for (const def of DEFAULT_ROLES) {
        let role = await em.findOne(Role, { where: { name: def.name }, relations: { permissions: true } });
        if (!role) {
          role = em.create(Role, {
            name: def.name,
            description: def.description,
            isSuperAdmin: def.isSuperAdmin ?? false,
            isSystem: true,
            permissions: def.permissions.map((c) => byCode.get(c)!),
          });
          await em.save(role);
          console.log(`+ rol creado: ${def.name}`);
        } else if (role.isSuperAdmin) {
          // El super admin siempre conserva todos los permisos del catálogo.
          role.permissions = allPerms;
          await em.save(role);
        }
        // Los demás roles ya existentes NO se tocan: pueden haber sido editados desde la API.
      }

      // 3) Primer super administrador
      const superRole = await em.findOneOrFail(Role, { where: { name: SUPER_ADMIN_ROLE } });
      const existing = await em.count(User, { where: { roleId: superRole.id } });
      if (existing === 0) {
        const username = (process.env.SEED_SUPERADMIN_USERNAME ?? '').trim().toLowerCase();
        const email = (process.env.SEED_SUPERADMIN_EMAIL ?? '').trim().toLowerCase();
        const fullName = (process.env.SEED_SUPERADMIN_FULLNAME ?? 'Super Administrador').trim();
        const password = process.env.SEED_SUPERADMIN_PASSWORD ?? '';
        if (!username || !email || password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
          throw new Error(
            'Define SEED_SUPERADMIN_USERNAME, SEED_SUPERADMIN_EMAIL y SEED_SUPERADMIN_PASSWORD (mín. 8 caracteres, letras y números)',
          );
        }
        await em.save(
          em.create(User, {
            username,
            email,
            fullName,
            roleId: superRole.id,
            passwordHash: await argon2.hash(password, { type: argon2.argon2id }),
            mustChangePassword: true,
          }),
        );
        console.log(`+ super administrador creado: ${username} (deberá cambiar la contraseña al ingresar)`);
      } else {
        console.log('= ya existe un super administrador; no se crea otro');
      }
    });
    console.log('Seed completado.');
  }
}

async function main() {
  await dataSource.initialize();
  try {
    await runSeed(dataSource);
  } finally {
    await dataSource.destroy();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
