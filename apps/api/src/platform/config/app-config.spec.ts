import { describe, expect, it } from 'vitest';
import { readConfig } from './app-config';

const requiredConfig = {
  DATABASE_URL: 'postgresql://vmeste:password@localhost:5432/vmeste',
};

describe('readConfig', () => {
  it('disables CORS when no origins are configured', () => {
    expect(readConfig(requiredConfig).corsOrigins).toEqual([]);
  });

  it('normalizes and deduplicates configured origins', () => {
    expect(
      readConfig({
        ...requiredConfig,
        CORS_ORIGINS:
          'https://app.example.test, http://localhost:8081, https://app.example.test',
      }).corsOrigins,
    ).toEqual(['https://app.example.test', 'http://localhost:8081']);
  });

  it('rejects a CORS origin with a path', () => {
    expect(() =>
      readConfig({
        ...requiredConfig,
        CORS_ORIGINS: 'https://app.example.test/path',
      }),
    ).toThrow('CORS_ORIGINS must contain comma-separated HTTP origins');
  });
});
