import { describe, expect, it } from 'vitest';
import type { DomainError } from '../../../platform/http/domain.error';
import { AgePolicy } from './age.policy';

describe('AgePolicy', () => {
  const now = new Date('2026-08-04T12:00:00.000Z');

  it('accepts the exact eighteenth birthday', () => {
    expect(AgePolicy.assertAdult('2008-08-04', now)).toBeInstanceOf(Date);
  });

  it('rejects a user one day before the eighteenth birthday', () => {
    expect(() => AgePolicy.assertAdult('2008-08-05', now)).toThrowError(
      expect.objectContaining<Partial<DomainError>>({
        code: 'AGE_RESTRICTION',
      }),
    );
  });

  it('rejects an impossible calendar date', () => {
    expect(() => AgePolicy.assertAdult('2000-02-30', now)).toThrowError(
      expect.objectContaining<Partial<DomainError>>({
        code: 'VALIDATION_ERROR',
      }),
    );
  });
});
