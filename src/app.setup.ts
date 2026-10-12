import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

/** Configuración común a la app real y a los tests e2e. */
export function configureApp(app: INestApplication) {
  const config = app.get(ConfigService);
  const origins = (config.get<string>('CORS_ORIGINS') ?? '').split(',').map((o) => o.trim()).filter(Boolean);

  if (config.get<boolean>('TRUST_PROXY')) (app as NestExpressApplication).set('trust proxy', 1);
  app.use(helmet());
  app.use(cookieParser());
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.enableCors({ origin: origins, credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );
}
