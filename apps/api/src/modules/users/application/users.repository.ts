import type { ProfilePatch } from '../domain/profile';
import type {
  EventStatus,
  ParticipationMode,
  ParticipationStatus,
} from '@prisma/client';

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

export type ActivitiesTab =
  'upcoming' | 'applications' | 'created' | 'past' | 'cancelled';

export interface ActivityRecord {
  id: string;
  organizerId: string;
  category: ProfileCategory;
  city: ProfileCity;
  title: string;
  meetingPlace: string;
  startsAt: Date;
  endsAt: Date | null;
  imageObjectKey: string | null;
  participationMode: ParticipationMode;
  capacity: number;
  status: EventStatus;
  contentVersion: number;
  participations: Array<{
    id: string;
    userId: string;
    status: ParticipationStatus;
    seenEventVersion: number;
  }>;
}

export interface PublicProfileRecord {
  profile: ProfileRecord;
  upcomingEvents: Array<{
    id: string;
    category: ProfileCategory;
    city: ProfileCity;
    title: string;
    meetingPlace: string;
    startsAt: Date;
    endsAt: Date | null;
    imageObjectKey: string | null;
    participationMode: ParticipationMode;
    capacity: number;
    status: EventStatus;
    contentVersion: number;
    participations: Array<{ status: ParticipationStatus }>;
  }>;
}

export const USERS_REPOSITORY = Symbol('USERS_REPOSITORY');

export interface UsersRepository {
  findMe(userId: string): Promise<ProfileRecord | null>;
  findPublicProfile(userId: string): Promise<PublicProfileRecord | null>;
  findActivities(
    userId: string,
    tab: ActivitiesTab,
    limit: number,
  ): Promise<ActivityRecord[]>;
  updateProfile(userId: string, patch: ProfilePatch): Promise<ProfileRecord>;
}
