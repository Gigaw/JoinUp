import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function createOpenApiDocument(
  app: INestApplication,
): ReturnType<typeof SwaggerModule.createDocument> {
  const config = new DocumentBuilder()
    .setTitle('Вместе API')
    .setDescription('API первого сквозного сценария MVP')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  return SwaggerModule.createDocument(app, config);
}
