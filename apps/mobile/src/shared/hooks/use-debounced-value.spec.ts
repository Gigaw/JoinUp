import { beforeEach, describe, expect, it, vi } from 'vitest';

const reactMock = vi.hoisted(() => ({
  cleanups: [] as Array<void | (() => void)>,
  setValue: vi.fn(),
}));

vi.mock('react', () => ({
  useEffect: (effect: () => void | (() => void)) => {
    reactMock.cleanups.push(effect());
  },
  useState: (initialValue: unknown) => [initialValue, reactMock.setValue],
}));

import { useDebouncedValue } from './use-debounced-value';

describe('useDebouncedValue', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    reactMock.cleanups.length = 0;
    reactMock.setValue.mockClear();
  });

  it('updates once after the debounce delay', () => {
    expect(useDebouncedValue('вол', 350)).toBe('вол');

    vi.advanceTimersByTime(349);
    expect(reactMock.setValue).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(reactMock.setValue).toHaveBeenCalledTimes(1);
    expect(reactMock.setValue).toHaveBeenCalledWith('вол');
  });

  it('cleans up the previous timer before scheduling a new value', () => {
    useDebouncedValue('вол', 350);
    const cleanup = reactMock.cleanups[0];
    cleanup?.();

    useDebouncedValue('волейбол', 350);
    vi.advanceTimersByTime(350);

    expect(reactMock.setValue).toHaveBeenCalledTimes(1);
    expect(reactMock.setValue).toHaveBeenCalledWith('волейбол');
  });
});
