import 'reflect-metadata';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createApp } from '../../bootstrap';
import { createOpenApiDocument } from './openapi';

async function exportOpenApi(): Promise<void> {
  const app = await createApp();
  const document = createOpenApiDocument(app);
  const target = resolve(
    process.cwd(),
    '../../packages/api-client/openapi.json',
  );
  await writeFile(target, `${JSON.stringify(document, null, 2)}\n`, 'utf8');
  await app.close();
}

void exportOpenApi();
