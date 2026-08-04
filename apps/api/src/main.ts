import 'reflect-metadata';
import 'dotenv/config';
import { SwaggerModule } from '@nestjs/swagger';
import { createApp } from './bootstrap';
import { readConfig } from './platform/config/app-config';
import { createOpenApiDocument } from './platform/openapi/openapi';

async function bootstrap(): Promise<void> {
  const config = readConfig();
  const app = await createApp();
  const document = createOpenApiDocument(app);
  SwaggerModule.setup('openapi', app, document);
  await app.listen(config.port, '0.0.0.0');
}

void bootstrap();
