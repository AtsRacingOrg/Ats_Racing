import { NestFactory } from '@nestjs/core';
import { ValidationPipe, INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
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

  // Swagger UI served at /api/docs (useGlobalPrefix prepends the "api" prefix).
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Ats Racing API')
    .setDescription('Ats Racing backend API documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, {
    useGlobalPrefix: true,
    swaggerOptions: { persistAuthorization: true },
  });

  await app.init();

  return app;
}

export default async function handler(req: any, res: any) {
  const nestApp = await bootstrap();
  nestApp.getHttpAdapter().getInstance()(req, res);
}
