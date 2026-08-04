import { describe, expect, it } from 'vitest';
import { canCompleteOnboarding } from './profile';

describe('canCompleteOnboarding', () => {
  it('requires a name, supported city and active interest', () => {
    expect(
      canCompleteOnboarding({
        displayName: 'Мария',
        hasSupportedCity: true,
        activeInterestsCount: 1,
      }),
    ).toBe(true);
  });

  it.each([
    { displayName: null, hasSupportedCity: true, activeInterestsCount: 1 },
    { displayName: '   ', hasSupportedCity: true, activeInterestsCount: 1 },
    { displayName: 'Мария', hasSupportedCity: false, activeInterestsCount: 1 },
    { displayName: 'Мария', hasSupportedCity: true, activeInterestsCount: 0 },
  ])('rejects an incomplete profile: %o', (profile) => {
    expect(canCompleteOnboarding(profile)).toBe(false);
  });
});
