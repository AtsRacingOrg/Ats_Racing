import { NestFactory } from '@nestjs/core';
import { ValidationPipe, INestApplication } from '@nestjs/common';
import { AppModule } from '../apps/api/src/app/app.module';

let app: INestApplication;

async function bootstrap(): Promise<INestApplication> {
  if (app) return app;

  app = await NestFactory.create(AppModule, { logger: ['error', 'warn'] });

  app.enableCors({ origin: true, credentials: true });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('api');
  await app.init();

  return app;
}

export default async function handler(req: any, res: any) {
  const nestApp = await bootstrap();
  nestApp.getHttpAdapter().getInstance()(req, res);
}
