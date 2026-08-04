import { Inject, Injectable } from '@nestjs/common';
import {
  EventStatus,
  ParticipationMode,
  ParticipationStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../platform/database/prisma.service';
import type {
  EventDetailsDto,
  EventListDto,
  EventSummaryDto,
  JoinEventDto,
  MyParticipationDto,
  ParticipantDto,
} from '../../../platform/http/api.dto';
import { DomainError } from '../../../platform/http/domain.error';

const eventInclude = Prisma.validator<Prisma.EventInclude>()({
  category: true,
  city: true,
  organizer: true,
  participations: {
    include: { user: true },
    orderBy: { createdAt: 'asc' },
  },
});

type EventRecord = Prisma.EventGetPayload<{ include: typeof eventInclude }>;

@Injectable()
export class EventsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list(cityId: string, limit: number): Promise<EventListDto> {
    const city = await this.prisma.city.findFirst({
      where: { id: cityId, isSupported: true },
      select: { id: true },
    });
    if (!city) {
      throw new DomainError(
        409,
        'CITY_NOT_SUPPORTED',
        'Город пока не поддерживается.',
      );
    }

    const events = await this.prisma.event.findMany({
      where: {
        cityId,
        status: EventStatus.published,
        startsAt: { gt: new Date() },
      },
      include: eventInclude,
      orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
      take: limit,
    });
    return {
      items: events.map((event) => this.summary(event)),
      nextCursor: null,
    };
  }

  async get(eventId: string, actorId: string): Promise<EventDetailsDto> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: eventInclude,
    });
    if (!event || !this.canRead(event, actorId)) {
      throw new DomainError(404, 'RESOURCE_NOT_FOUND', 'Событие не найдено.');
    }
    return this.details(event, actorId);
  }

  async join(eventId: string, actorId: string): Promise<JoinEventDto> {
    return this.prisma.$transaction(async (transaction) => {
      const locked = await transaction.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM events WHERE id = ${eventId}::uuid FOR UPDATE
      `;
      if (locked.length === 0) {
        throw new DomainError(404, 'RESOURCE_NOT_FOUND', 'Событие не найдено.');
      }

      const event = await transaction.event.findUnique({
        where: { id: eventId },
        include: { participations: true },
      });
      if (!event) {
        throw new DomainError(404, 'RESOURCE_NOT_FOUND', 'Событие не найдено.');
      }
      if (event.organizerId === actorId) {
        throw new DomainError(
          409,
          'ORGANIZER_ALREADY_PARTICIPATES',
          'Организатор уже участвует в событии.',
        );
      }
      if (event.status === EventStatus.cancelled) {
        throw new DomainError(409, 'EVENT_CANCELLED', 'Событие отменено.');
      }
      if (event.status !== EventStatus.published) {
        throw new DomainError(404, 'RESOURCE_NOT_FOUND', 'Событие не найдено.');
      }
      if (event.startsAt <= new Date()) {
        throw new DomainError(409, 'EVENT_STARTED', 'Событие уже началось.');
      }

      const existing = event.participations.find(
        (participation) => participation.userId === actorId,
      );
      const targetStatus =
        event.participationMode === ParticipationMode.automatic
          ? ParticipationStatus.going
          : ParticipationStatus.pending;
      if (existing) {
        if (existing.status === targetStatus) {
          return this.joinResult(event, existing);
        }
        throw new DomainError(
          409,
          'PARTICIPATION_TERMINAL',
          'Текущее участие нельзя активировать повторно.',
        );
      }

      const goingCount = event.participations.filter(
        ({ status }) => status === ParticipationStatus.going,
      ).length;
      if (goingCount >= event.capacity) {
        throw new DomainError(
          409,
          'EVENT_FULL',
          'В событии больше нет свободных мест.',
        );
      }

      const participation = await transaction.eventParticipation.create({
        data: {
          eventId,
          userId: actorId,
          status: targetStatus,
          seenEventVersion: event.contentVersion,
        },
      });
      return this.joinResult(
        { ...event, participations: [...event.participations, participation] },
        participation,
      );
    });
  }

  private joinResult(
    event: Pick<EventRecord, 'capacity' | 'contentVersion'> & {
      participations: Array<{ status: ParticipationStatus }>;
    },
    participation: {
      id: string;
      status: ParticipationStatus;
      seenEventVersion: number;
    },
  ): JoinEventDto {
    const participantsCount = event.participations.filter(
      ({ status }) => status === ParticipationStatus.going,
    ).length;
    return {
      participation: this.myParticipation(participation, event.contentVersion),
      participantsCount,
      capacity: event.capacity,
      isFull: participantsCount >= event.capacity,
    };
  }

  private canRead(event: EventRecord, actorId: string): boolean {
    return (
      event.status === EventStatus.published ||
      event.organizerId === actorId ||
      event.participations.some(({ userId }) => userId === actorId)
    );
  }

  private summary(event: EventRecord): EventSummaryDto {
    const participantsCount = event.participations.filter(
      ({ status }) => status === ParticipationStatus.going,
    ).length;
    return {
      id: event.id,
      title: event.title,
      category: {
        id: event.category.id,
        slug: event.category.slug,
        name: event.category.name,
      },
      city: {
        id: event.city.id,
        slug: event.city.slug,
        name: event.city.name,
        timeZone: event.city.timeZone,
      },
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

  private details(event: EventRecord, actorId: string): EventDetailsDto {
    const summary = this.summary(event);
    const own = event.participations.find(({ userId }) => userId === actorId);
    const actions: string[] = [];
    if (
      event.organizerId === actorId &&
      event.status === EventStatus.published
    ) {
      actions.push('edit', 'cancel');
      if (event.participationMode === ParticipationMode.approval_required) {
        actions.push('reviewApplications');
      }
    } else if (own?.status === ParticipationStatus.going) {
      actions.push('leave');
    } else if (own?.status === ParticipationStatus.pending) {
      actions.push('withdraw');
    } else if (!own && !summary.isFull && event.startsAt > new Date()) {
      actions.push(
        event.participationMode === ParticipationMode.automatic
          ? 'join'
          : 'apply',
      );
    }

    return {
      ...summary,
      description: event.description,
      organizer: this.participant(event.organizer),
      participants: event.participations
        .filter(({ status }) => status === ParticipationStatus.going)
        .map(({ user }) => this.participant(user)),
      version: event.version,
      createdAt: event.createdAt.toISOString(),
      updatedAt: event.updatedAt.toISOString(),
      myParticipation: own
        ? this.myParticipation(own, event.contentVersion)
        : null,
      availableActions: actions,
    };
  }

  private participant(user: EventRecord['organizer']): ParticipantDto {
    const participant: ParticipantDto = {
      id: user.id,
      displayName: user.displayName ?? 'Участник',
      avatarUrl: user.avatarObjectKey
        ? `/v1/media/${user.avatarObjectKey}`
        : null,
    };
    if (user.showAge) {
      participant.age = this.age(user.birthDate);
    }
    return participant;
  }

  private myParticipation(
    participation: {
      id: string;
      status: ParticipationStatus;
      seenEventVersion: number;
    },
    contentVersion: number,
  ): MyParticipationDto {
    return {
      id: participation.id,
      status: participation.status,
      seenEventVersion: participation.seenEventVersion,
      hasEventUpdates: participation.seenEventVersion < contentVersion,
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
}
