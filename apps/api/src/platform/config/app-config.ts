import { access, mkdir } from 'node:fs/promises';
import { constants } from 'node:fs';
import { resolve } from 'node:path';

export interface AppConfig {
  databaseUrl: string;
  port: number;
  sessionTtlDays: number;
  corsOrigins: string[];
}

export interface MediaConfig {
  mediaRoot: string;
}

export function readConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const databaseUrl = env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }

  const port = Number(env.PORT ?? 3000);
  const sessionTtlDays = Number(env.SESSION_TTL_DAYS ?? 30);
  const corsOrigins = parseCorsOrigins(env.CORS_ORIGINS);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('PORT must be a valid TCP port');
  }
  if (!Number.isInteger(sessionTtlDays) || sessionTtlDays < 1) {
    throw new Error('SESSION_TTL_DAYS must be a positive integer');
  }

  return { databaseUrl, port, sessionTtlDays, corsOrigins };
}

function parseCorsOrigins(value: string | undefined): string[] {
  if (!value?.trim()) return [];

  const origins = value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  for (const origin of origins) {
    let url: URL;
    try {
      url = new URL(origin);
    } catch {
      throw new Error('CORS_ORIGINS must contain comma-separated HTTP origins');
    }
    if (
      (url.protocol !== 'http:' && url.protocol !== 'https:') ||
      url.origin !== origin
    ) {
      throw new Error('CORS_ORIGINS must contain comma-separated HTTP origins');
    }
  }

  return [...new Set(origins)];
}

export function readMediaConfig(
  env: NodeJS.ProcessEnv = process.env,
): MediaConfig {
  const value = env.MEDIA_ROOT?.trim();
  if (!value) {
    throw new Error('MEDIA_ROOT is required');
  }
  return { mediaRoot: resolve(value) };
}

export async function ensureMediaRoot(mediaRoot: string): Promise<void> {
  await mkdir(mediaRoot, { recursive: true });
  await access(mediaRoot, constants.R_OK | constants.W_OK);
}
