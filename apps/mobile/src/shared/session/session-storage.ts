export interface StoredSession {
  token: string;
  expiresAt: string;
}

export function serializeSession(session: StoredSession): string {
  return JSON.stringify(session);
}

export function parseSession(
  value: string | null,
  now = new Date(),
): StoredSession | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<StoredSession>;
    if (
      typeof parsed.token !== 'string' ||
      parsed.token.length === 0 ||
      typeof parsed.expiresAt !== 'string'
    ) {
      return null;
    }
    const expiresAt = new Date(parsed.expiresAt);
    if (Number.isNaN(expiresAt.getTime()) || expiresAt <= now) return null;
    return { token: parsed.token, expiresAt: expiresAt.toISOString() };
  } catch {
    return null;
  }
}
