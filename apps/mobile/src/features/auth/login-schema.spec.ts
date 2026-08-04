import { describe, expect, it } from 'vitest';
import { loginSchema } from './login-schema';

describe('loginSchema', () => {
  it('accepts a valid email and password', () => {
    expect(
      loginSchema.safeParse({
        email: 'user@example.com',
        password: 'safe-password',
      }).success,
    ).toBe(true);
  });

  it('rejects an invalid email and a short password', () => {
    expect(
      loginSchema.safeParse({ email: 'not-an-email', password: 'short' })
        .success,
    ).toBe(false);
  });
});
