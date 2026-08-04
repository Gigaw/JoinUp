import { describe, expect, it } from 'vitest';
import { parseSession, serializeSession } from './session-storage';

describe('session storage', () => {
  const now = new Date('2026-08-04T10:00:00.000Z');

  it('restores a valid token with expiry metadata', () => {
    const value = serializeSession({
      token: 'opaque-token',
      expiresAt: '2026-09-04T10:00:00.000Z',
    });
    expect(parseSession(value, now)).toEqual({
      token: 'opaque-token',
      expiresAt: '2026-09-04T10:00:00.000Z',
    });
  });

  it('rejects expired, legacy and malformed values', () => {
    expect(
      parseSession(
        serializeSession({
          token: 'expired',
          expiresAt: '2026-08-04T09:59:59.000Z',
        }),
        now,
      ),
    ).toBeNull();
    expect(parseSession('legacy-raw-token', now)).toBeNull();
    expect(parseSession('{broken', now)).toBeNull();
  });
});
