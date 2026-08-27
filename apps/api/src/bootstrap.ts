import { ValidationPipe } from '@nestjs/common';
import multipart from '@fastify/multipart';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { ApiExceptionFilter } from './platform/http/api-exception.filter';
import { RequestIdInterceptor } from './platform/http/request-id.interceptor';
import { MAX_MEDIA_FILE_SIZE } from './platform/media/media-storage.port';

export interface CreateAppOptions {
  corsOrigins?: string[];
}

export async function createApp(
  options: CreateAppOptions = {},
): Promise<NestFastifyApplication> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    { logger: ['error', 'warn', 'log'] },
  );
  await app.register(multipart, {
    limits: { files: 1, parts: 1, fileSize: MAX_MEDIA_FILE_SIZE },
    throwFileSizeLimit: true,
  });
  app.setGlobalPrefix('v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );
  app.useGlobalInterceptors(new RequestIdInterceptor());
  app.useGlobalFilters(new ApiExceptionFilter());
  if (options.corsOrigins?.length) {
    app.enableCors({ origin: options.corsOrigins });
  }
  return app;
}
