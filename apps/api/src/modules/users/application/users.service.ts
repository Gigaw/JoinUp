import { Inject, Injectable } from '@nestjs/common';
import {
  EventStatus,
  ParticipationMode,
  ParticipationStatus,
} from '@prisma/client';
import type {
  ActivitiesListDto,
  ActivityItemDto,
  EventSummaryDto,
  MeDto,
  PublicUserDto,
} from '../../../platform/http/api.dto';
import { DomainError } from '../../../platform/http/domain.error';
import { ProfileUpdateError, type ProfilePatch } from '../domain/profile';
import {
  USERS_REPOSITORY,
  type ProfileRecord,
  type ActivitiesTab,
  type ActivityRecord,
  type PublicProfileRecord,
  type UsersRepository,
} from './users.repository';

@Injectable()
export class UsersService {
  constructor(
    @Inject(USERS_REPOSITORY) private readonly repository: UsersRepository,
  ) {}

  async getMe(userId: string): Promise<MeDto> {
    const profile = await this.repository.findMe(userId);
    if (!profile) throw this.notFound();
    return this.present(profile);
  }

  async getPublicProfile(userId: string): Promise<PublicUserDto> {
    const publicProfile = await this.repository.findPublicProfile(userId);
    if (!publicProfile) throw this.notFound();
    const { profile, upcomingEvents } = publicProfile;
    const result: PublicUserDto = {
      id: profile.id,
      displayName: profile.displayName ?? 'Участник',
      avatarUrl: profile.avatarObjectKey
        ? `/v1/media/${profile.avatarObjectKey}`
        : null,
      bio: profile.bio,
      city: profile.city,
      interests: [...profile.interests]
        .sort((left, right) => left.sortOrder - right.sortOrder)
        .map(({ id, slug, name }) => ({ id, slug, name })),
      upcomingEvents: upcomingEvents.map((event) =>
        this.presentPublicEvent(event),
      ),
    };
    if (profile.showAge) result.age = this.age(profile.birthDate);
    return result;
  }

  async updateMe(userId: string, patch: ProfilePatch): Promise<MeDto> {
    try {
      const normalizedPatch = {
        ...patch,
        ...(patch.displayName !== undefined
          ? { displayName: patch.displayName.trim() }
          : {}),
      };
      if (normalizedPatch.displayName !== undefined) {
        const length = normalizedPatch.displayName.length;
        if (length < 1 || length > 80) {
          throw new DomainError(
            400,
            'VALIDATION_ERROR',
            'Имя должно содержать от 1 до 80 символов.',
          );
        }
      }
      return this.present(
        await this.repository.updateProfile(userId, normalizedPatch),
      );
    } catch (error) {
      if (!(error instanceof ProfileUpdateError)) throw error;
      if (error.code === 'CITY_NOT_SUPPORTED') {
        throw new DomainError(409, error.code, 'Город пока не поддерживается.');
      }
      if (error.code === 'CATEGORY_NOT_ACTIVE') {
        throw new DomainError(409, error.code, 'Одна из категорий недоступна.');
      }
      throw this.notFound();
    }
  }

  async getActivities(
    userId: string,
    tab: ActivitiesTab,
    limit: number,
  ): Promise<ActivitiesListDto> {
    const activities = await this.repository.findActivities(userId, tab, limit);
    return {
      items: activities.map((activity) =>
        this.presentActivity(activity, userId),
      ),
      nextCursor: null,
    };
  }

  private presentActivity(
    activity: ActivityRecord,
    userId: string,
  ): ActivityItemDto {
    const own = activity.participations.find((item) => item.userId === userId);
    const participantsCount = activity.participations.filter(
      (item) => item.status === ParticipationStatus.going,
    ).length;
    const hasEventUpdates = Boolean(
      own && own.seenEventVersion < activity.contentVersion,
    );
    const availableActions: string[] = [];
    if (
      activity.status === EventStatus.published &&
      activity.startsAt > new Date()
    ) {
      if (activity.organizerId === userId) {
        availableActions.push('edit', 'cancel');
        if (activity.participationMode === ParticipationMode.approval_required)
          availableActions.push('reviewApplications');
      } else if (own?.status === ParticipationStatus.going)
        availableActions.push('leave');
      else if (own?.status === ParticipationStatus.pending)
        availableActions.push('withdraw');
      else if (!own && participantsCount < activity.capacity) {
        availableActions.push(
          activity.participationMode === ParticipationMode.automatic
            ? 'join'
            : 'apply',
        );
      }
    }
    return {
      id: activity.id,
      title: activity.title,
      category: activity.category,
      city: activity.city,
      meetingPlace: activity.meetingPlace,
      startsAt: activity.startsAt.toISOString(),
      endsAt: activity.endsAt?.toISOString() ?? null,
      imageUrl: activity.imageObjectKey
        ? `/v1/media/${activity.imageObjectKey}`
        : null,
      participationMode: activity.participationMode,
      participantsCount,
      capacity: activity.capacity,
      isFull: participantsCount >= activity.capacity,
      status: activity.status,
      contentVersion: activity.contentVersion,
      myParticipation: own
        ? {
            id: own.id,
            status: own.status,
            seenEventVersion: own.seenEventVersion,
            hasEventUpdates,
          }
        : null,
      hasEventUpdates,
      availableActions,
      pendingApplicationsCount:
        activity.organizerId === userId &&
        activity.participationMode === ParticipationMode.approval_required
          ? activity.participations.filter(
              (item) => item.status === ParticipationStatus.pending,
            ).length
          : null,
    };
  }

  private present(profile: ProfileRecord): MeDto {
    return {
      id: profile.id,
      email: profile.email,
      birthDate: profile.birthDate.toISOString().slice(0, 10),
      displayName: profile.displayName,
      showAge: profile.showAge,
      avatarUrl: profile.avatarObjectKey
        ? `/v1/media/${profile.avatarObjectKey}`
        : null,
      bio: profile.bio,
      city: profile.city,
      interests: [...profile.interests]
        .sort((left, right) => left.sortOrder - right.sortOrder)
        .map(({ id, slug, name }) => ({ id, slug, name })),
      onboardingCompleted: profile.onboardingCompletedAt !== null,
      createdAt: profile.createdAt.toISOString(),
      updatedAt: profile.updatedAt.toISOString(),
    };
  }

  private presentPublicEvent(
    event: PublicProfileRecord['upcomingEvents'][number],
  ): EventSummaryDto {
    const participantsCount = event.participations.filter(
      (item) => item.status === ParticipationStatus.going,
    ).length;
    return {
      id: event.id,
      title: event.title,
      category: event.category,
      city: event.city,
      meetingPlace: event.meetingPlace,
      startsAt: event.startsAt.toISOString(),
      endsAt: event.endsAt?.toISOString() ?? null,
      imageUrl: event.imageObjectKey
        ? `/v1/media/${event.imageObjectKey}`
        : null,
      participationMode: event.participationMode,
      participantsCount,
      capacity: event.capacity,
      isFull: participantsCount >= event.capacity,
      status: event.status,
      contentVersion: event.contentVersion,
    };
  }

  private age(birthDate: Date, now = new Date()): number {
    let value = now.getUTCFullYear() - birthDate.getUTCFullYear();
    const beforeBirthday =
      now.getUTCMonth() < birthDate.getUTCMonth() ||
      (now.getUTCMonth() === birthDate.getUTCMonth() &&
        now.getUTCDate() < birthDate.getUTCDate());
    if (beforeBirthday) value -= 1;
    return value;
  }

  private notFound(): DomainError {
    return new DomainError(404, 'RESOURCE_NOT_FOUND', 'Профиль не найден.');
  }
}
