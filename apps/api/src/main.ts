import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { patchNestJsSwagger } from 'nestjs-zod';
import { AppModule } from './app.module';

export function configureApp(app: INestApplication): void {
  const cookieSecret =
    process.env.COOKIE_SECRET ?? 'terrahunt-dev-cookie-signing-secret-change-in-prod';

  app.use(cookieParser(cookieSecret));
  app.setGlobalPrefix('api/v1');

  const corsOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:5173';
  app.enableCors({
    origin: corsOrigin.split(',').map((o) => o.trim()),
    credentials: true,
  });

  patchNestJsSwagger();
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Geodle API')
    .setDescription('REST API for Geodle — Country Attribute Deduction Game')
    .setVersion('1.0.0')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  console.log(`[Geodle API] Listening on http://localhost:${port}/api/v1 (Docs: /api/docs)`);
}

if (require.main === module) {
  void bootstrap();
}
