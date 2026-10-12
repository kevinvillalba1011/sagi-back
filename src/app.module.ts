import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from './common/guards/permissions.guard.js';
import { validateEnv } from './config/env.validation.js';
import { buildDataSourceOptions, DbEnv } from './database/database.config.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { CategoriesModule } from './modules/categories/categories.module.js';
import { HealthController } from './modules/health/health.controller.js';
import { InventoryModule } from './modules/inventory/inventory.module.js';
import { MovementsModule } from './modules/movements/movements.module.js';
import { ProductsModule } from './modules/products/products.module.js';
import { RolesModule } from './modules/roles/roles.module.js';
import { UsersModule } from './modules/users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true, validate: validateEnv }),
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 100 }],
      // Solo para pruebas e2e; jamás se desactiva en producción.
      skipIf: () => process.env.NODE_ENV === 'test' && process.env.THROTTLE_DISABLED === 'true',
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (c: ConfigService) =>
        buildDataSourceOptions({
          DB_HOST: c.getOrThrow('DB_HOST'),
          DB_PORT: c.getOrThrow('DB_PORT'),
          DB_USER: c.getOrThrow('DB_USER'),
          DB_PASSWORD: c.getOrThrow('DB_PASSWORD'),
          DB_NAME: c.getOrThrow('DB_NAME'),
          DB_SSL: c.get('DB_SSL') ?? false,
          DB_SSL_REJECT_UNAUTHORIZED: c.get('DB_SSL_REJECT_UNAUTHORIZED') ?? true,
        } as DbEnv),
    }),
    AuthModule,
    UsersModule,
    RolesModule,
    CategoriesModule,
    ProductsModule,
    MovementsModule,
    InventoryModule,
  ],
  controllers: [HealthController],
  providers: [
    // Orden: límite de peticiones → autenticación → permisos
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
