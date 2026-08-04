import { describe, expect, it } from 'vitest';
import { onboardingSchema } from './onboarding-schema';

describe('onboardingSchema', () => {
  const validValues = {
    displayName: '  Ева  ',
    cityId: '11111111-1111-4111-8111-111111111111',
    categoryIds: ['22222222-2222-4222-8222-222222222222'],
    showAge: false,
  };

  it('requires a name, city and at least one interest', () => {
    expect(
      onboardingSchema.safeParse({
        displayName: ' ',
        cityId: '',
        categoryIds: [],
        showAge: false,
      }).success,
    ).toBe(false);
  });

  it('trims the public display name', () => {
    expect(onboardingSchema.parse(validValues).displayName).toBe('Ева');
  });
});
