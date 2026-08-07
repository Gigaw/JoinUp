import { describe, expect, it } from 'vitest';
import { profileRequestBody, profileSchema } from './profile-schema';

const values = {
  displayName: 'Ева',
  bio: '',
  cityId: '11111111-1111-4111-8111-111111111111',
  categoryIds: ['22222222-2222-4222-8222-222222222222'],
  showAge: false,
};

describe('profileRequestBody', () => {
  it('clears an empty bio without sending an empty public value', () => {
    const parsed = profileSchema.parse(values);
    expect(profileRequestBody(parsed).bio).toBeNull();
  });
});
