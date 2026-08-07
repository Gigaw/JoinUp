import { describe, expect, it } from 'vitest';
import { calculateAge, formatAge } from './age';

describe('calculateAge', () => {
  it('does not advance age before the birthday', () => {
    expect(calculateAge('2000-08-07', new Date(2026, 7, 6))).toBe(25);
  });

  it('advances age on the birthday', () => {
    expect(calculateAge('2000-08-06', new Date(2026, 7, 6))).toBe(26);
  });
});

describe('formatAge', () => {
  it('uses Russian plural forms', () => {
    expect(formatAge(21)).toBe('21 год');
    expect(formatAge(22)).toBe('22 года');
    expect(formatAge(25)).toBe('25 лет');
    expect(formatAge(11)).toBe('11 лет');
  });
});
