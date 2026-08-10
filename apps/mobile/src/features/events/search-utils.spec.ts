import { describe, expect, it } from 'vitest';
import { normalizeSearchQuery } from './search-utils';

describe('normalizeSearchQuery', () => {
  it('trims and collapses repeated whitespace', () => {
    expect(normalizeSearchQuery('  настольные   игры  ')).toBe(
      'настольные игры',
    );
  });

  it('returns an empty value for whitespace-only input', () => {
    expect(normalizeSearchQuery('   ')).toBe('');
  });

  it('limits the normalized query to 100 characters', () => {
    expect(normalizeSearchQuery('а'.repeat(101))).toHaveLength(100);
  });
});
