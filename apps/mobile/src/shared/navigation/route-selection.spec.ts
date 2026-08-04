import { describe, expect, it } from 'vitest';
import { selectRootDestination } from './route-selection';

describe('selectRootDestination', () => {
  it.each([
    [
      { restoring: true, hasToken: false, meLoading: false, meError: false },
      'loading',
    ],
    [
      { restoring: false, hasToken: false, meLoading: false, meError: false },
      'sign-in',
    ],
    [
      { restoring: false, hasToken: true, meLoading: true, meError: false },
      'loading',
    ],
    [
      {
        restoring: false,
        hasToken: true,
        meLoading: false,
        meError: false,
        onboardingCompleted: false,
      },
      'onboarding',
    ],
    [
      {
        restoring: false,
        hasToken: true,
        meLoading: false,
        meError: false,
        onboardingCompleted: true,
      },
      'events',
    ],
    [
      { restoring: false, hasToken: true, meLoading: false, meError: true },
      'error',
    ],
  ] as const)('maps %o to %s', (state, destination) => {
    expect(selectRootDestination(state)).toBe(destination);
  });
});
