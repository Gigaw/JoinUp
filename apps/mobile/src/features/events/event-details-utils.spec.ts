import { describe, expect, it } from 'vitest';
import {
  formatEventTime,
  freePlacesLabel,
  participationModeLabel,
} from './event-details-utils';

describe('event detail presentation', () => {
  it('formats start and end in the event city timezone', () => {
    expect(
      formatEventTime({
        startsAt: '2026-08-11T09:00:00.000Z',
        endsAt: '2026-08-11T11:00:00.000Z',
        city: {
          id: 'city-id',
          slug: 'moscow',
          name: 'Москва',
          timeZone: 'Europe/Moscow',
        },
      }),
    ).toContain('12:00–14:00');
  });

  it('explains capacity and the participation mode', () => {
    expect(freePlacesLabel({ capacity: 6, participantsCount: 6 })).toBe(
      'Свободных мест нет',
    );
    expect(participationModeLabel('approval_required')).toContain(
      'подтверждает организатор',
    );
  });
});
