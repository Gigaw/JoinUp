import { Inject, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { EventStatus, ParticipationStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../platform/database/prisma.service';
import type {
  ChatListDto,
  EventMessageDto,
  EventMessageListDto,
} from '../../../platform/http/api.dto';
import { DomainError } from '../../../platform/http/domain.error';
import type { CreateEventMessageDto } from '../transport/http/chat.dto';

const RETENTION_DAYS = 30;

@Injectable()
export class ChatsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list(
    actorId: string,
    _cursor?: string,
    limit = 30,
  ): Promise<ChatListDto> {
    const pageSize = this.pageSize(limit);
    const events = await this.prisma.event.findMany({
      where: {
        status: {
          in: [
            EventStatus.published,
            EventStatus.cancelled,
            EventStatus.completed,
          ],
        },
        participations: {
          some: { userId: actorId, status: ParticipationStatus.going },
        },
      },
      include: {
        messages: {
          select: { createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: [{ startsAt: 'desc' }, { id: 'desc' }],
      take: pageSize,
    });
    return {
      items: events
        .filter((event) => !this.isExpired(event))
        .map((event) => ({
          eventId: event.id,
          title: event.title,
          startsAt: event.startsAt.toISOString(),
          eventStatus: event.status,
          lastMessageAt: event.messages[0]?.createdAt.toISOString() ?? null,
          readOnly: !this.canWrite(event),
        })),
      nextCursor: null,
    };
  }

  async messages(
    eventId: string,
    actorId: string,
    cursor?: string,
    limit = 30,
  ): Promise<EventMessageListDto> {
    const pageSize = this.pageSize(limit);
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        status: true,
        startsAt: true,
        endsAt: true,
        cancelledAt: true,
        participations: {
          where: { userId: actorId },
          select: { status: true },
        },
      },
    });
    this.requireReadable(event);

    const cursorMessage = cursor
      ? await this.prisma.eventMessage.findFirst({
          where: { id: cursor, eventId },
          select: { id: true, createdAt: true },
        })
      : null;
    if (cursor && !cursorMessage) this.notFound();

    const items = await this.prisma.eventMessage.findMany({
      where: {
        eventId,
        ...(cursorMessage
          ? {
              OR: [
                { createdAt: { lt: cursorMessage.createdAt } },
                {
                  createdAt: cursorMessage.createdAt,
                  id: { lt: cursorMessage.id },
                },
              ],
            }
          : {}),
      },
      include: {
        author: {
          select: { id: true, displayName: true, avatarObjectKey: true },
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: pageSize + 1,
    });
    const hasMore = items.length > pageSize;
    const page = hasMore ? items.slice(0, pageSize) : items;
    return {
      items: page.map((message) => this.message(message)),
      nextCursor: hasMore ? (page.at(-1)?.id ?? null) : null,
      readOnly: !this.canWrite(event),
    };
  }

  async create(
    eventId: string,
    actorId: string,
    idempotencyKey: string | undefined,
    input: CreateEventMessageDto,
  ): Promise<EventMessageDto> {
    const key = this.idempotencyKey(idempotencyKey);
    return this.idempotent(
      actorId,
      `events.messages.create:${eventId}`,
      key,
      input,
      async (transaction) => {
        await this.lockEvent(transaction, eventId);
        const event = await transaction.event.findUnique({
          where: { id: eventId },
          select: {
            id: true,
            status: true,
            startsAt: true,
            endsAt: true,
            cancelledAt: true,
            participations: {
              where: { userId: actorId },
              select: { status: true },
            },
          },
        });
        this.requireReadable(event);
        if (!this.canWrite(event)) {
          throw new DomainError(
            409,
            'CHAT_READ_ONLY',
            'Чат доступен только для чтения.',
          );
        }
        const message = await transaction.eventMessage.create({
          data: { eventId, authorId: actorId, text: input.text },
          include: {
            author: {
              select: { id: true, displayName: true, avatarObjectKey: true },
            },
          },
        });
        console.info('event_message_created', {
          eventId,
          actorId,
          messageId: message.id,
        });
        return this.message(message);
      },
    );
  }

  private requireReadable(
    event: {
      status: EventStatus;
      startsAt: Date;
      endsAt: Date | null;
      cancelledAt: Date | null;
      participations: Array<{ status: ParticipationStatus }>;
    } | null,
  ): asserts event is NonNullable<typeof event> {
    if (
      !event ||
      event.participations[0]?.status !== ParticipationStatus.going ||
      this.isExpired(event)
    ) {
      this.notFound();
    }
  }

  private canWrite(event: { status: EventStatus; startsAt: Date }): boolean {
    return (
      event.status === EventStatus.published && event.startsAt > new Date()
    );
  }

  private isExpired(event: {
    status: EventStatus;
    startsAt: Date;
    endsAt: Date | null;
    cancelledAt: Date | null;
  }): boolean {
    const terminalAt =
      event.status === EventStatus.cancelled && event.cancelledAt
        ? event.cancelledAt
        : (event.endsAt ?? event.startsAt);
    return (
      terminalAt.getTime() + RETENTION_DAYS * 24 * 60 * 60 * 1000 <= Date.now()
    );
  }

  private message(message: {
    id: string;
    text: string;
    createdAt: Date;
    author: {
      id: string;
      displayName: string | null;
      avatarObjectKey: string | null;
    };
  }): EventMessageDto {
    return {
      id: message.id,
      text: message.text,
      createdAt: message.createdAt.toISOString(),
      author: {
        id: message.author.id,
        displayName: message.author.displayName ?? 'Участник',
        avatarUrl: message.author.avatarObjectKey
          ? `/v1/media/${message.author.avatarObjectKey}`
          : null,
      },
    };
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

  private async idempotent<T>(
    actorId: string,
    operation: string,
    key: string,
    input: unknown,
    mutation: (transaction: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    const hash = createHash('sha256')
      .update(JSON.stringify(input))
      .digest('hex');
    const replay = await this.replay<T>(actorId, operation, key, hash);
    if (replay) return replay;
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const record = await transaction.idempotencyRecord.create({
          data: {
            userId: actorId,
            operation,
            key,
            requestHash: hash,
            expiresAt: new Date(Date.now() + 7 * 86400000),
          },
        });
        const result = await mutation(transaction);
        await transaction.idempotencyRecord.update({
          where: { id: record.id },
          data: {
            responseStatus: 201,
            responseBody: result as Prisma.InputJsonValue,
            resourceId: (result as { id?: string }).id,
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
        const concurrent = await this.replay<T>(actorId, operation, key, hash);
        if (concurrent) return concurrent;
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
    hash: string,
  ): Promise<T | null> {
    const record = await this.prisma.idempotencyRecord.findUnique({
      where: { userId_operation_key: { userId: actorId, operation, key } },
    });
    if (!record) return null;
    if (record.requestHash !== hash)
      throw new DomainError(
        409,
        'IDEMPOTENCY_KEY_REUSED',
        'Этот Idempotency-Key уже использован для другого запроса.',
      );
    return record.completedAt && record.responseBody !== null
      ? (record.responseBody as T)
      : null;
  }

  private idempotencyKey(value: string | undefined): string {
    const key = value?.trim();
    if (!key || key.length > 128)
      throw new DomainError(
        409,
        'IDEMPOTENCY_KEY_REQUIRED',
        'Передайте корректный Idempotency-Key.',
      );
    return key;
  }

  private pageSize(value: number): number {
    const normalized = Number(value);
    return Number.isInteger(normalized) && normalized >= 1 && normalized <= 50
      ? normalized
      : 30;
  }

  private notFound(): never {
    throw new DomainError(404, 'RESOURCE_NOT_FOUND', 'Чат не найден.');
  }
}
