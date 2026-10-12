import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { configureApp } from './app.setup.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  const config = app.get(ConfigService);

  if (config.get<boolean>('SWAGGER_ENABLED')) {
    const doc = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('SAGI API')
        .setDescription('Sistema Automatizado de Gestión de Inventario')
        .setVersion('1.0')
        .addBearerAuth()
        .build(),
    );
    SwaggerModule.setup('api/docs', app, doc);
  }

  app.enableShutdownHooks();
  const port = config.getOrThrow<number>('PORT');
  await app.listen(port);
  new Logger('Bootstrap').log(`SAGI API escuchando en http://localhost:${port}/api/v1 (docs: /api/docs)`);
}
void bootstrap();
