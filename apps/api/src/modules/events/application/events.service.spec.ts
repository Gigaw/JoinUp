import {
  EventStatus,
  ParticipationMode,
  ParticipationStatus,
} from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { EventsService } from './events.service';
import type { EventListRepository } from './event-list.port';

const eventId = '00000000-0000-4000-8000-000000000001';
const cityId = '00000000-0000-4000-8000-000000000002';
const categoryId = '00000000-0000-4000-8000-000000000003';

describe('EventsService.list', () => {
  it('passes normalized search filters and cursor to the list repository', async () => {
    const list = vi.fn<EventListRepository['list']>().mockResolvedValue({
      eventIds: [eventId],
      nextCursor: 'next-cursor',
    });
    const event = {
      id: eventId,
      title: 'Волейбол',
      description: 'Игра',
      meetingPlace: 'Парк',
      startsAt: new Date('2030-01-01T10:00:00.000Z'),
      endsAt: null,
      imageObjectKey: null,
      participationMode: ParticipationMode.automatic,
      participants: [],
      capacity: 8,
      status: EventStatus.published,
      contentVersion: 1,
      category: { id: categoryId, slug: 'sport', name: 'Спорт' },
      city: {
        id: cityId,
        slug: 'kazan',
        name: 'Казань',
        timeZone: 'Europe/Moscow',
      },
      organizer: { id: eventId, displayName: 'Мария', avatarObjectKey: null },
      participations: [
        { status: ParticipationStatus.going, userId: eventId, user: {} },
      ],
    };
    const prisma = {
      city: {
        findFirst: vi.fn().mockResolvedValue({ id: cityId }),
      },
      event: {
        findMany: vi.fn().mockResolvedValue([event]),
      },
    };
    const service = new EventsService(prisma as never, { list });

    const result = await service.list(
      cityId,
      20,
      [categoryId],
      '  волейбол   ',
      'cursor',
    );

    expect(list).toHaveBeenCalledWith({
      cityId,
      categoryIds: [categoryId],
      q: 'волейбол',
      cursor: 'cursor',
      limit: 20,
    });
    expect(result.nextCursor).toBe('next-cursor');
    expect(result.items[0]?.id).toBe(eventId);
  });
});
