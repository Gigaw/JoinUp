import createClient from 'openapi-fetch';
import type { paths } from './schema.js';

export type { components, paths } from './schema.js';

export function createApiClient(
  baseUrl: string,
  token?: string | null,
  onUnauthorized?: () => void | Promise<void>,
) {
  const client = createClient<paths>({
    baseUrl,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (onUnauthorized) {
    client.use({
      onResponse({ response }) {
        if (response.status === 401) void onUnauthorized();
        return response;
      },
    });
  }
  return client;
}
