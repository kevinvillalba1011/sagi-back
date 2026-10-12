import path from 'node:path';
import { DataSourceOptions } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { ALL_ENTITIES } from './entities.js';

export interface DbEnv {
  DB_HOST: string;
  DB_PORT: number;
  DB_USER: string;
  DB_PASSWORD: string;
  DB_NAME: string;
  DB_SSL: boolean;
  DB_SSL_REJECT_UNAUTHORIZED?: boolean;
}

/** `withMigrations`: solo la CLI (data-source.ts) necesita cargar las migraciones; la API no las ejecuta. */
export function buildDataSourceOptions(env: DbEnv, withMigrations = false): DataSourceOptions {
  return {
    type: 'postgres',
    host: env.DB_HOST,
    port: env.DB_PORT,
    username: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    ssl: env.DB_SSL ? { rejectUnauthorized: env.DB_SSL_REJECT_UNAUTHORIZED ?? true } : false,
    namingStrategy: new SnakeNamingStrategy(),
    entities: ALL_ENTITIES,
    migrations: withMigrations ? [path.join(import.meta.dirname, 'migrations', '*.{ts,js}')] : [],
    // Nunca sincronizar el esquema automáticamente: todo cambio va por migraciones.
    uuidExtension: 'pgcrypto', // gen_random_uuid() nativo (PostgreSQL 13+)
    installExtensions: false,
    synchronize: false,
    migrationsRun: false,
  };
}
