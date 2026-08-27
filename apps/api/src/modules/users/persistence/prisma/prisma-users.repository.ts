import { Inject, Injectable } from '@nestjs/common';
import { EventStatus, ParticipationStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../../platform/database/prisma.service';
import type {
  ProfileRecord,
  ActivityRecord,
  ActivitiesResult,
  ActivitiesScope,
  PublicProfileRecord,
  UsersRepository,
} from '../../application/users.repository';
import {
  canCompleteOnboarding,
  type ProfilePatch,
  ProfileUpdateError,
} from '../../domain/profile';

const profileInclude = Prisma.validator<Prisma.UserInclude>()({
  _count: { select: { organizedEvents: true } },
  city: true,
  interests: { include: { category: true } },
});

type PrismaProfile = Prisma.UserGetPayload<{ include: typeof profileInclude }>;

const activityInclude = Prisma.validator<Prisma.EventInclude>()({
  category: true,
  city: true,
  participations: true,
});

type PrismaActivity = Prisma.EventGetPayload<{
  include: typeof activityInclude;
}>;

@Injectable()
export class PrismaUsersRepository implements UsersRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async findMe(userId: string): Promise<ProfileRecord | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: profileInclude,
    });
    return user ? this.map(user) : null;
  }

  async findPublicProfile(userId: string): Promise<PublicProfileRecord | null> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, onboardingCompletedAt: { not: null } },
      include: {
        ...profileInclude,
        organizedEvents: {
          where: {
            status: EventStatus.published,
            startsAt: { gt: new Date() },
          },
          include: activityInclude,
          orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
          take: 10,
        },
      },
    });
    if (!user || !user.displayName) return null;
    return {
      profile: this.map(user),
      upcomingEvents: user.organizedEvents.map((event) => ({
        id: event.id,
        category: event.category,
        city: event.city,
        title: event.title,
        meetingPlace: event.meetingPlace,
        startsAt: event.startsAt,
        endsAt: event.endsAt,
        imageObjectKey: event.imageObjectKey,
        participationMode: event.participationMode,
        capacity: event.capacity,
        status: event.status,
        contentVersion: event.contentVersion,
        participations: event.participations,
      })),
    };
  }

  async findActivities(
    userId: string,
    scope: ActivitiesScope,
    limit: number,
  ): Promise<ActivitiesResult> {
    const now = new Date();
    const participantRelation: Prisma.EventWhereInput = {
      organizerId: { not: userId },
      participations: { some: { userId } },
    };
    const archiveConditions: Prisma.EventWhereInput = {
      OR: [
        {
          status: {
            in: [EventStatus.cancelled, EventStatus.completed],
          },
        },
        { startsAt: { lte: now } },
        {
          participations: {
            some: {
              userId,
              status: {
                in: [
                  ParticipationStatus.rejected,
                  ParticipationStatus.withdrawn,
                  ParticipationStatus.cancelled,
                ],
              },
            },
          },
        },
      ],
    };
    const where: Prisma.EventWhereInput =
      scope === 'plans'
        ? {
            organizerId: { not: userId },
            status: EventStatus.published,
            startsAt: { gt: now },
            participations: {
              some: { userId, status: ParticipationStatus.going },
            },
          }
        : scope === 'organizing'
          ? {
              organizerId: userId,
              status: EventStatus.published,
              startsAt: { gt: now },
            }
          : scope === 'organizing_archive'
            ? {
                organizerId: userId,
                AND: [archiveConditions],
              }
            : { AND: [participantRelation, archiveConditions] };
    const orderBy =
      scope === 'archive' || scope === 'organizing_archive'
        ? [{ startsAt: 'desc' as const }, { id: 'asc' as const }]
        : [{ startsAt: 'asc' as const }, { id: 'asc' as const }];
    const pendingOutgoingWhere: Prisma.EventParticipationWhereInput = {
      userId,
      status: ParticipationStatus.pending,
      event: { status: EventStatus.published, startsAt: { gt: now } },
    };
    const pendingIncomingWhere: Prisma.EventParticipationWhereInput = {
      status: ParticipationStatus.pending,
      event: {
        organizerId: userId,
        status: EventStatus.published,
        startsAt: { gt: now },
      },
    };
    const [
      totalCount,
      pendingOutgoingApplicationsCount,
      pendingIncomingApplicationsCount,
      events,
    ] = await this.prisma.$transaction([
      this.prisma.event.count({ where }),
      this.prisma.eventParticipation.count({
        where: pendingOutgoingWhere,
      }),
      this.prisma.eventParticipation.count({
        where: pendingIncomingWhere,
      }),
      this.prisma.event.findMany({
        where,
        include: activityInclude,
        orderBy,
        take: limit,
      }),
    ]);
    return {
      items: events.map((event) => this.mapActivity(event)),
      totalCount,
      pendingOutgoingApplicationsCount,
      pendingIncomingApplicationsCount,
    };
  }

  async findPendingApplications(
    userId: string,
    limit: number,
  ): Promise<ActivitiesResult> {
    const now = new Date();
    const where: Prisma.EventWhereInput = {
      participations: {
        some: {
          userId,
          status: ParticipationStatus.pending,
          event: { status: EventStatus.published, startsAt: { gt: now } },
        },
      },
    };
    const pendingOutgoingWhere: Prisma.EventParticipationWhereInput = {
      userId,
      status: ParticipationStatus.pending,
      event: { status: EventStatus.published, startsAt: { gt: now } },
    };
    const pendingIncomingWhere: Prisma.EventParticipationWhereInput = {
      status: ParticipationStatus.pending,
      event: {
        organizerId: userId,
        status: EventStatus.published,
        startsAt: { gt: now },
      },
    };
    const [
      totalCount,
      pendingOutgoingApplicationsCount,
      pendingIncomingApplicationsCount,
      events,
    ] = await this.prisma.$transaction([
      this.prisma.event.count({ where }),
      this.prisma.eventParticipation.count({
        where: pendingOutgoingWhere,
      }),
      this.prisma.eventParticipation.count({
        where: pendingIncomingWhere,
      }),
      this.prisma.event.findMany({
        where,
        include: activityInclude,
        orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
        take: limit,
      }),
    ]);
    return {
      items: events.map((event) => this.mapActivity(event)),
      totalCount,
      pendingOutgoingApplicationsCount,
      pendingIncomingApplicationsCount,
    };
  }

  private mapActivity(event: PrismaActivity): ActivityRecord {
    return {
      id: event.id,
      organizerId: event.organizerId,
      category: event.category,
      city: event.city,
      title: event.title,
      meetingPlace: event.meetingPlace,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      imageObjectKey: event.imageObjectKey,
      participationMode: event.participationMode,
      capacity: event.capacity,
      status: event.status,
      contentVersion: event.contentVersion,
      participations: event.participations,
    };
  }

  async updateProfile(
    userId: string,
    patch: ProfilePatch,
  ): Promise<ProfileRecord> {
    return this.prisma.$transaction(async (transaction) => {
      const current = await transaction.user.findUnique({
        where: { id: userId },
        include: profileInclude,
      });
      if (!current) throw new ProfileUpdateError('USER_NOT_FOUND');

      let hasSupportedCity = current.city?.isSupported ?? false;
      if (patch.cityId !== undefined) {
        const city = await transaction.city.findFirst({
          where: { id: patch.cityId, isSupported: true },
          select: { id: true },
        });
        if (!city) throw new ProfileUpdateError('CITY_NOT_SUPPORTED');
        hasSupportedCity = true;
      }

      let activeInterestsCount = current.interests.filter(
        ({ category }) => category.isActive,
      ).length;
      if (patch.categoryIds !== undefined) {
        const categories = await transaction.category.findMany({
          where: { id: { in: patch.categoryIds }, isActive: true },
          select: { id: true },
        });
        if (categories.length !== patch.categoryIds.length) {
          throw new ProfileUpdateError('CATEGORY_NOT_ACTIVE');
        }
        activeInterestsCount = categories.length;
      }

      const displayName = patch.displayName ?? current.displayName;
      const completesOnboarding = canCompleteOnboarding({
        displayName,
        hasSupportedCity,
        activeInterestsCount,
      });
      const onboardingCompletedAt =
        current.onboardingCompletedAt ??
        (completesOnboarding ? new Date() : null);

      await transaction.user.update({
        where: { id: userId },
        data: {
          ...(patch.displayName !== undefined
            ? { displayName: patch.displayName }
            : {}),
          ...(patch.showAge !== undefined ? { showAge: patch.showAge } : {}),
          ...(patch.bio !== undefined ? { bio: patch.bio } : {}),
          ...(patch.cityId !== undefined ? { cityId: patch.cityId } : {}),
          onboardingCompletedAt,
        },
      });

      if (patch.categoryIds !== undefined) {
        await transaction.userInterest.deleteMany({ where: { userId } });
        await transaction.userInterest.createMany({
          data: patch.categoryIds.map((categoryId) => ({ userId, categoryId })),
        });
      }

      const updated = await transaction.user.findUnique({
        where: { id: userId },
        include: profileInclude,
      });
      if (!updated) throw new ProfileUpdateError('USER_NOT_FOUND');
      return this.map(updated);
    });
  }

  private map(user: PrismaProfile): ProfileRecord {
    return {
      id: user.id,
      email: user.email,
      birthDate: user.birthDate,
      displayName: user.displayName,
      showAge: user.showAge,
      avatarObjectKey: user.avatarObjectKey,
      bio: user.bio,
      city: user.city
        ? {
            id: user.city.id,
            slug: user.city.slug,
            name: user.city.name,
            timeZone: user.city.timeZone,
          }
        : null,
      interests: user.interests.map(({ category }) => ({
        id: category.id,
        slug: category.slug,
        name: category.name,
        sortOrder: category.sortOrder,
      })),
      createdEventsCount: user._count.organizedEvents,
      onboardingCompletedAt: user.onboardingCompletedAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
