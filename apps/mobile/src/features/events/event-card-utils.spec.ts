import { describe, expect, it } from 'vitest';
import type { EventSummary } from './event-card-utils';
import {
  formatEventDate,
  formatEventOccupancy,
  getEventAccessibilityLabel,
} from './event-card-utils';

const event: EventSummary = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  title: 'Волейбол вечером',
  category: {
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    name: 'Спорт',
    slug: 'sport',
  },
  city: {
    id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    name: 'Казань',
    slug: 'kazan',
    timeZone: 'Europe/Moscow',
  },
  meetingPlace: 'Площадка у парка',
  startsAt: '2026-08-07T09:00:00.000Z',
  endsAt: null,
  imageUrl: null,
  participationMode: 'automatic',
  participantsCount: 3,
  capacity: 8,
  isFull: false,
  status: 'published',
  contentVersion: 1,
};

describe('formatEventDate', () => {
  it('formats the event in the city timezone', () => {
    expect(formatEventDate(event.startsAt, 'Europe/Moscow')).toContain('12:00');
    expect(formatEventDate(event.startsAt, 'UTC')).toContain('09:00');
  });
});

describe('event card labels', () => {
  it('describes available places accessibly', () => {
    expect(formatEventOccupancy(event)).toBe('3 из 8 участников.');
    expect(getEventAccessibilityLabel(event)).toContain(
      'Место: Площадка у парка',
    );
    expect(getEventAccessibilityLabel(event)).toContain('3 из 8 участников.');
  });

  it('announces when an event is full', () => {
    const fullEvent = { ...event, participantsCount: 8, isFull: true };

    expect(formatEventOccupancy(fullEvent)).toBe(
      '8 из 8 участников. Мест нет.',
    );
  });
});
