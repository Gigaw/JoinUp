import { describe, expect, it } from 'vitest';
import { eventFormSchema, toCreateEventBody } from './event-form-schema';

function valuesWithDates(startsAt: Date, endsAt: Date) {
  return {
    title: '  Прогулка по центру  ',
    categoryId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    description: '  Гуляем по историческому центру города.  ',
    cityId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    meetingPlace: '  У главного входа  ',
    startsAt,
    endsAt,
    capacity: 8,
    participationMode: 'automatic' as const,
  };
}

describe('eventFormSchema', () => {
  it('accepts a valid future event and maps it to the API contract', () => {
    const startsAt = new Date(Date.now() + 60 * 60 * 1000);
    const endsAt = new Date(startsAt.getTime() + 2 * 60 * 60 * 1000);
    const validValues = valuesWithDates(startsAt, endsAt);
    const values = eventFormSchema.parse(validValues);

    expect(toCreateEventBody(values)).toEqual({
      title: 'Прогулка по центру',
      categoryId: validValues.categoryId,
      description: 'Гуляем по историческому центру города.',
      cityId: validValues.cityId,
      meetingPlace: 'У главного входа',
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      capacity: 8,
      participationMode: 'automatic',
    });
  });

  it('rejects a past start and an end before it', () => {
    const startsAt = new Date(Date.now() - 60 * 60 * 1000);
    const endsAt = new Date(startsAt.getTime() - 60 * 60 * 1000);
    const result = eventFormSchema.safeParse(valuesWithDates(startsAt, endsAt));

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path[0])).toEqual([
        'startsAt',
        'endsAt',
      ]);
    }
  });
});
