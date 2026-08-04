export interface ProfilePatch {
  displayName?: string;
  showAge?: boolean;
  bio?: string | null;
  cityId?: string;
  categoryIds?: string[];
}

export type ProfileUpdateErrorCode =
  'USER_NOT_FOUND' | 'CITY_NOT_SUPPORTED' | 'CATEGORY_NOT_ACTIVE';

export class ProfileUpdateError extends Error {
  constructor(readonly code: ProfileUpdateErrorCode) {
    super(code);
    this.name = 'ProfileUpdateError';
  }
}

export function canCompleteOnboarding(input: {
  displayName: string | null;
  hasSupportedCity: boolean;
  activeInterestsCount: number;
}): boolean {
  return (
    Boolean(input.displayName?.trim()) &&
    input.hasSupportedCity &&
    input.activeInterestsCount > 0
  );
}
