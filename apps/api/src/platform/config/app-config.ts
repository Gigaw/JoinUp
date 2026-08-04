export interface AppConfig {
  databaseUrl: string;
  port: number;
  sessionTtlDays: number;
}

export function readConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const databaseUrl = env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }

  const port = Number(env.PORT ?? 3000);
  const sessionTtlDays = Number(env.SESSION_TTL_DAYS ?? 30);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('PORT must be a valid TCP port');
  }
  if (!Number.isInteger(sessionTtlDays) || sessionTtlDays < 1) {
    throw new Error('SESSION_TTL_DAYS must be a positive integer');
  }

  return { databaseUrl, port, sessionTtlDays };
}
