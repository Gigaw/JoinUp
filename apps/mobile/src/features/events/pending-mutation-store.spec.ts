import { beforeEach, describe, expect, it, vi } from 'vitest';

const storage = new Map<string, string>();
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn((key: string) => Promise.resolve(storage.get(key) ?? null)),
    setItem: vi.fn((key: string, value: string) => {
      storage.set(key, value);
      return Promise.resolve();
    }),
    removeItem: vi.fn((key: string) => {
      storage.delete(key);
      return Promise.resolve();
    }),
  },
}));

import {
  beginPendingMutation,
  completePendingMutation,
} from './pending-mutation-store';

describe('pending mutation store', () => {
  beforeEach(() => storage.clear());

  it('reuses the key for an equivalent normalized request', async () => {
    const first = await beginPendingMutation('events.create', { b: 2, a: 1 });
    const retry = await beginPendingMutation('events.create', { a: 1, b: 2 });

    expect(retry.idempotencyKey).toBe(first.idempotencyKey);
  });

  it('creates a new key for a new intent and removes only the active one', async () => {
    const first = await beginPendingMutation('events.create', { title: 'A' });
    const second = await beginPendingMutation('events.create', { title: 'B' });
    await completePendingMutation('events.create', first.idempotencyKey);
    const retry = await beginPendingMutation('events.create', { title: 'B' });

    expect(second.idempotencyKey).not.toBe(first.idempotencyKey);
    expect(retry.idempotencyKey).toBe(second.idempotencyKey);
    await completePendingMutation('events.create', second.idempotencyKey);
    const afterSuccess = await beginPendingMutation('events.create', {
      title: 'B',
    });
    expect(afterSuccess.idempotencyKey).not.toBe(second.idempotencyKey);
  });
});
