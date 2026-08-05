import { Inject, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
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
import {
  CreateEventDto,
  hasEventChanges,
  UpdateEventDto,
} from '../transport/http/event-mutation.dto';

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

  async create(
    actorId: string,
    idempotencyKey: string | undefined,
    input: CreateEventDto,
  ): Promise<EventDetailsDto> {
    const key = this.idempotencyKey(idempotencyKey);
    this.validateTimes(input.startsAt, input.endsAt ?? null);

    return this.idempotent(
      actorId,
      'events.create',
      key,
      input,
      201,
      async (transaction) => {
        const user = await transaction.user.findUnique({
          where: { id: actorId },
          select: { onboardingCompletedAt: true },
        });
        if (!user?.onboardingCompletedAt) {
          throw new DomainError(
            409,
            'ONBOARDING_INCOMPLETE',
            'Сначала завершите профиль.',
          );
        }
        await this.validateReferences(
          transaction,
          input.cityId,
          input.categoryId,
        );

        const event = await transaction.event.create({
          data: {
            organizerId: actorId,
            cityId: input.cityId,
            categoryId: input.categoryId,
            title: input.title,
            description: input.description,
            meetingPlace: input.meetingPlace,
            startsAt: new Date(input.startsAt),
            endsAt: input.endsAt ? new Date(input.endsAt) : null,
            capacity: input.capacity,
            participationMode: input.participationMode,
            participations: {
              create: {
                userId: actorId,
                status: ParticipationStatus.going,
                seenEventVersion: 1,
              },
            },
          },
          include: eventInclude,
        });
        return this.details(event, actorId);
      },
    );
  }

  async update(
    eventId: string,
    actorId: string,
    idempotencyKey: string | undefined,
    input: UpdateEventDto,
  ): Promise<EventDetailsDto> {
    const key = this.idempotencyKey(idempotencyKey);
    if (!hasEventChanges(input)) {
      throw new DomainError(
        400,
        'VALIDATION_ERROR',
        'Укажите хотя бы одно изменение.',
      );
    }

    return this.idempotent(
      actorId,
      `events.update:${eventId}`,
      key,
      input,
      200,
      async (transaction) => {
        await this.lockEvent(transaction, eventId);
        const current = await transaction.event.findUnique({
          where: { id: eventId },
          include: eventInclude,
        });
        if (!current) this.notFound();
        this.requireOrganizer(current, actorId);
        this.requireMutable(current);
        if (current.version !== input.expectedVersion) {
          throw new DomainError(
            409,
            'EVENT_VERSION_CONFLICT',
            'Событие уже было изменено. Обновите данные и повторите.',
          );
        }

        const startsAt = input.startsAt
          ? new Date(input.startsAt)
          : current.startsAt;
        const endsAt =
          input.endsAt === undefined
            ? current.endsAt
            : input.endsAt
              ? new Date(input.endsAt)
              : null;
        this.validateTimes(
          startsAt.toISOString(),
          endsAt?.toISOString() ?? null,
        );

        const cityId = input.cityId ?? current.cityId;
        const categoryId = input.categoryId ?? current.categoryId;
        if (input.cityId || input.categoryId) {
          await this.validateReferences(transaction, cityId, categoryId);
        }

        const capacity = input.capacity ?? current.capacity;
        const participantsCount = current.participations.filter(
          ({ status }) => status === ParticipationStatus.going,
        ).length;
        if (capacity < participantsCount) {
          throw new DomainError(
            409,
            'CAPACITY_BELOW_PARTICIPANTS',
            'Вместимость меньше текущего числа участников.',
          );
        }

        const contentChanged =
          startsAt.getTime() !== current.startsAt.getTime() ||
          endsAt?.getTime() !== current.endsAt?.getTime() ||
          cityId !== current.cityId ||
          (input.meetingPlace !== undefined &&
            input.meetingPlace !== current.meetingPlace);
        const updated = await transaction.event.update({
          where: { id: eventId },
          data: {
            title: input.title,
            categoryId: input.categoryId,
            description: input.description,
            cityId: input.cityId,
            meetingPlace: input.meetingPlace,
            startsAt: input.startsAt ? startsAt : undefined,
            endsAt: input.endsAt !== undefined ? endsAt : undefined,
            capacity: input.capacity,
            participationMode: input.participationMode,
            version: { increment: 1 },
            contentVersion: contentChanged ? { increment: 1 } : undefined,
          },
          include: eventInclude,
        });
        return this.details(updated, actorId);
      },
    );
  }

  async cancel(
    eventId: string,
    actorId: string,
    idempotencyKey: string | undefined,
  ): Promise<EventDetailsDto> {
    const key = this.idempotencyKey(idempotencyKey);
    return this.idempotent(
      actorId,
      `events.cancel:${eventId}`,
      key,
      { eventId },
      200,
      async (transaction) => {
        await this.lockEvent(transaction, eventId);
        const current = await transaction.event.findUnique({
          where: { id: eventId },
          include: eventInclude,
        });
        if (!current) this.notFound();
        this.requireOrganizer(current, actorId);
        if (current.status === EventStatus.cancelled) {
          return this.details(current, actorId);
        }
        this.requireMutable(current);
        const cancelled = await transaction.event.update({
          where: { id: eventId },
          data: {
            status: EventStatus.cancelled,
            cancelledAt: new Date(),
            version: { increment: 1 },
            contentVersion: { increment: 1 },
          },
          include: eventInclude,
        });
        return this.details(cancelled, actorId);
      },
    );
  }

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

  private async idempotent<T>(
    actorId: string,
    operation: string,
    key: string,
    requestBody: unknown,
    responseStatus: number,
    mutation: (transaction: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    const requestHash = this.hash(requestBody);
    const replay = await this.replay<T>(actorId, operation, key, requestHash);
    if (replay !== null) return replay;

    try {
      return await this.prisma.$transaction(async (transaction) => {
        const record = await transaction.idempotencyRecord.create({
          data: {
            userId: actorId,
            operation,
            key,
            requestHash,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        });
        const result = await mutation(transaction);
        const resourceId = this.resourceId(result);
        await transaction.idempotencyRecord.update({
          where: { id: record.id },
          data: {
            responseStatus,
            responseBody: result as Prisma.InputJsonValue,
            resourceId,
            completedAt: new Date(),
          },
        });
        return result;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const concurrentReplay = await this.replay<T>(
          actorId,
          operation,
          key,
          requestHash,
        );
        if (concurrentReplay !== null) return concurrentReplay;
        throw new DomainError(
          409,
          'IDEMPOTENCY_IN_PROGRESS',
          'Операция с этим ключом ещё выполняется.',
        );
      }
      throw error;
    }
  }

  private async replay<T>(
    actorId: string,
    operation: string,
    key: string,
    requestHash: string,
  ): Promise<T | null> {
    const record = await this.prisma.idempotencyRecord.findUnique({
      where: { userId_operation_key: { userId: actorId, operation, key } },
    });
    if (!record) return null;
    if (record.requestHash !== requestHash) {
      throw new DomainError(
        409,
        'IDEMPOTENCY_KEY_REUSED',
        'Этот Idempotency-Key уже использован для другого запроса.',
      );
    }
    if (!record.completedAt || record.responseBody === null) return null;
    return record.responseBody as T;
  }

  private hash(value: unknown): string {
    return createHash('sha256')
      .update(JSON.stringify(this.canonical(value)))
      .digest('hex');
  }

  private canonical(value: unknown): unknown {
    if (Array.isArray(value)) return value.map((item) => this.canonical(item));
    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>)
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([key, item]) => [key, this.canonical(item)]),
      );
    }
    return value;
  }

  private resourceId(result: unknown): string | undefined {
    if (!result || typeof result !== 'object') return undefined;
    const id = (result as { id?: unknown }).id;
    return typeof id === 'string' ? id : undefined;
  }

  private idempotencyKey(value: string | undefined): string {
    const key = value?.trim();
    if (!key || key.length > 128) {
      throw new DomainError(
        409,
        'IDEMPOTENCY_KEY_REQUIRED',
        'Передайте корректный Idempotency-Key.',
      );
    }
    return key;
  }

  private validateTimes(
    startsAtValue: string,
    endsAtValue: string | null,
  ): void {
    const startsAt = new Date(startsAtValue);
    const endsAt = endsAtValue ? new Date(endsAtValue) : null;
    if (startsAt <= new Date()) {
      throw new DomainError(
        400,
        'VALIDATION_ERROR',
        'Дата начала должна быть в будущем.',
      );
    }
    if (endsAt && endsAt <= startsAt) {
      throw new DomainError(
        400,
        'VALIDATION_ERROR',
        'Дата окончания должна быть позже даты начала.',
      );
    }
  }

  private async validateReferences(
    transaction: Prisma.TransactionClient,
    cityId: string,
    categoryId: string,
  ): Promise<void> {
    const [city, category] = await Promise.all([
      transaction.city.findFirst({
        where: { id: cityId, isSupported: true },
        select: { id: true },
      }),
      transaction.category.findFirst({
        where: { id: categoryId, isActive: true },
        select: { id: true },
      }),
    ]);
    if (!city) {
      throw new DomainError(
        409,
        'CITY_NOT_SUPPORTED',
        'Город пока не поддерживается.',
      );
    }
    if (!category) {
      throw new DomainError(
        409,
        'CATEGORY_NOT_ACTIVE',
        'Категория пока недоступна.',
      );
    }
  }

  private async lockEvent(
    transaction: Prisma.TransactionClient,
    eventId: string,
  ): Promise<void> {
    const locked = await transaction.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM events WHERE id = ${eventId}::uuid FOR UPDATE
    `;
    if (locked.length === 0) this.notFound();
  }

  private requireOrganizer(event: EventRecord, actorId: string): void {
    if (event.organizerId !== actorId) {
      throw new DomainError(
        403,
        'FORBIDDEN',
        'Изменять событие может только организатор.',
      );
    }
  }

  private requireMutable(event: EventRecord): void {
    if (event.status === EventStatus.cancelled) {
      throw new DomainError(409, 'EVENT_CANCELLED', 'Событие отменено.');
    }
    if (event.status !== EventStatus.published) this.notFound();
    if (event.startsAt <= new Date()) {
      throw new DomainError(409, 'EVENT_STARTED', 'Событие уже началось.');
    }
  }

  private notFound(): never {
    throw new DomainError(404, 'RESOURCE_NOT_FOUND', 'Событие не найдено.');
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
    if (event.status === EventStatus.published && event.startsAt > new Date()) {
      if (event.organizerId === actorId) {
        actions.push('edit', 'cancel');
        if (event.participationMode === ParticipationMode.approval_required) {
          actions.push('reviewApplications');
        }
      } else if (own?.status === ParticipationStatus.going) {
        actions.push('leave');
      } else if (own?.status === ParticipationStatus.pending) {
        actions.push('withdraw');
      } else if (!own && !summary.isFull) {
        actions.push(
          event.participationMode === ParticipationMode.automatic
            ? 'join'
            : 'apply',
        );
      }
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
