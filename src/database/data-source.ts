import 'dotenv/config';
import { DataSource } from 'typeorm';
import { buildDataSourceOptions } from './database.config.js';

// Usado por la CLI de TypeORM (migraciones) y por el seed.
export default new DataSource(
  buildDataSourceOptions(
    {
      DB_HOST: process.env.DB_HOST ?? 'localhost',
      DB_PORT: parseInt(process.env.DB_PORT ?? '5432', 10),
      DB_USER: process.env.DB_USER ?? '',
      DB_PASSWORD: process.env.DB_PASSWORD ?? '',
      DB_NAME: process.env.DB_NAME ?? '',
      DB_SSL: (process.env.DB_SSL ?? 'false') === 'true',
      DB_SSL_REJECT_UNAUTHORIZED: (process.env.DB_SSL_REJECT_UNAUTHORIZED ?? 'true') !== 'false',
    },
    true,
  ),
);
