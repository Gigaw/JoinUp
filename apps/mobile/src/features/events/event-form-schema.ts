import type { components } from '@vmeste/api-client';
import { z } from 'zod';

export const eventFormSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(3, 'Название должно содержать минимум 3 символа.')
      .max(80, 'Название должно содержать не больше 80 символов.'),
    categoryId: z.string().uuid('Выберите категорию.'),
    description: z
      .string()
      .trim()
      .min(10, 'Описание должно содержать минимум 10 символов.')
      .max(2000, 'Описание должно содержать не больше 2000 символов.'),
    cityId: z.string().uuid('Выберите город.'),
    meetingPlace: z
      .string()
      .trim()
      .min(3, 'Место встречи должно содержать минимум 3 символа.')
      .max(300, 'Место встречи должно содержать не больше 300 символов.'),
    startsAt: z.date(),
    endsAt: z.date().nullable(),
    capacity: z
      .number({ error: 'Введите количество участников.' })
      .int('Количество участников должно быть целым числом.')
      .min(2, 'Минимум 2 участника.')
      .max(10_000, 'Максимум 10 000 участников.'),
    participationMode: z.enum(['automatic', 'approval_required']),
  })
  .superRefine((values, context) => {
    if (values.startsAt.getTime() <= Date.now()) {
      context.addIssue({
        code: 'custom',
        message: 'Дата начала должна быть в будущем.',
        path: ['startsAt'],
      });
    }
    if (values.endsAt && values.endsAt.getTime() <= values.startsAt.getTime()) {
      context.addIssue({
        code: 'custom',
        message: 'Дата окончания должна быть позже даты начала.',
        path: ['endsAt'],
      });
    }
  });

export type EventFormValues = z.infer<typeof eventFormSchema>;
export type CreateEventBody = components['schemas']['CreateEventDto'];
export type UpdateEventBody = components['schemas']['UpdateEventDto'];
export type RestoredUpdateEventBody = UpdateEventBody & CreateEventBody;

export function toCreateEventBody(values: EventFormValues): CreateEventBody {
  return {
    title: values.title.trim(),
    categoryId: values.categoryId,
    description: values.description.trim(),
    cityId: values.cityId,
    meetingPlace: values.meetingPlace.trim(),
    startsAt: values.startsAt.toISOString(),
    endsAt: values.endsAt?.toISOString() ?? null,
    capacity: values.capacity,
    participationMode: values.participationMode,
  };
}

export function toUpdateEventBody(
  values: EventFormValues,
  expectedVersion: number,
): UpdateEventBody {
  return { expectedVersion, ...toCreateEventBody(values) };
}

export function fromEventBody(body: CreateEventBody): EventFormValues {
  return {
    title: body.title,
    categoryId: body.categoryId,
    description: body.description,
    cityId: body.cityId,
    meetingPlace: body.meetingPlace,
    startsAt: new Date(body.startsAt),
    endsAt: body.endsAt ? new Date(body.endsAt) : null,
    capacity: body.capacity,
    participationMode: body.participationMode,
  };
}

export function pendingUpdateMatchesValues(
  pending: RestoredUpdateEventBody,
  values: EventFormValues,
): boolean {
  const pendingValues: CreateEventBody = {
    title: pending.title,
    categoryId: pending.categoryId,
    description: pending.description,
    cityId: pending.cityId,
    meetingPlace: pending.meetingPlace,
    startsAt: pending.startsAt,
    endsAt: pending.endsAt,
    capacity: pending.capacity,
    participationMode: pending.participationMode,
  };
  return (
    JSON.stringify(pendingValues) === JSON.stringify(toCreateEventBody(values))
  );
}

export function isCreateEventBody(value: unknown): value is CreateEventBody {
  if (!value || typeof value !== 'object') return false;
  const body = value as Partial<CreateEventBody>;
  return (
    typeof body.title === 'string' &&
    typeof body.categoryId === 'string' &&
    typeof body.description === 'string' &&
    typeof body.cityId === 'string' &&
    typeof body.meetingPlace === 'string' &&
    typeof body.startsAt === 'string' &&
    (body.endsAt === undefined ||
      body.endsAt === null ||
      typeof body.endsAt === 'string') &&
    typeof body.capacity === 'number' &&
    (body.participationMode === 'automatic' ||
      body.participationMode === 'approval_required')
  );
}

export function isUpdateEventBody(
  value: unknown,
): value is RestoredUpdateEventBody {
  return (
    isCreateEventBody(value) &&
    typeof (value as Partial<UpdateEventBody>).expectedVersion === 'number'
  );
}
