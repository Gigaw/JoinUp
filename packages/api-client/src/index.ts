import createClient from 'openapi-fetch';
import type { paths } from './schema.js';

export type { components, paths } from './schema.js';

export function createApiClient(baseUrl: string, token?: string | null) {
  return createClient<paths>({
    baseUrl,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
}
