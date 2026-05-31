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
  // On Vercel serverless the swagger-ui-dist static assets are not bundled
  // into the function, so swagger-ui.css / swagger-ui-bundle.js 404 and the
  // page renders blank. Load the assets from a CDN instead.
  const SWAGGER_CDN = 'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5';
  SwaggerModule.setup('docs', app, document, {
    useGlobalPrefix: true,
    swaggerOptions: { persistAuthorization: true },
    customCssUrl: `${SWAGGER_CDN}/swagger-ui.css`,
    customJs: [
      `${SWAGGER_CDN}/swagger-ui-bundle.js`,
      `${SWAGGER_CDN}/swagger-ui-standalone-preset.js`,
    ],
  });

  await app.init();

  return app;
}

export default async function handler(req: any, res: any) {
  const nestApp = await bootstrap();
  nestApp.getHttpAdapter().getInstance()(req, res);
}
