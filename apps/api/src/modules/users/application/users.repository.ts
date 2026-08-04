import type { ProfilePatch } from '../domain/profile';

export interface ProfileCity {
  id: string;
  slug: string;
  name: string;
  timeZone: string;
}

export interface ProfileCategory {
  id: string;
  slug: string;
  name: string;
  sortOrder: number;
}

export interface ProfileRecord {
  id: string;
  email: string;
  birthDate: Date;
  displayName: string | null;
  showAge: boolean;
  avatarObjectKey: string | null;
  bio: string | null;
  city: ProfileCity | null;
  interests: ProfileCategory[];
  onboardingCompletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export const USERS_REPOSITORY = Symbol('USERS_REPOSITORY');

export interface UsersRepository {
  findMe(userId: string): Promise<ProfileRecord | null>;
  updateProfile(userId: string, patch: ProfilePatch): Promise<ProfileRecord>;
}
