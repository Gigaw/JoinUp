import type { components } from '@vmeste/api-client';

type EventDetails = components['schemas']['EventDetailsDto'];

export function formatEventTime(
  event: Pick<EventDetails, 'startsAt' | 'endsAt' | 'city'>,
): string {
  const date = new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    timeZone: event.city.timeZone,
  }).format(new Date(event.startsAt));
  const time = new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: event.city.timeZone,
  });
  const startsAt = time.format(new Date(event.startsAt));
  const endsAt = event.endsAt ? `–${time.format(new Date(event.endsAt))}` : '';
  return `${date}, ${startsAt}${endsAt}`;
}

export function freePlacesLabel(
  event: Pick<EventDetails, 'capacity' | 'participantsCount'>,
): string {
  const places = event.capacity - event.participantsCount;
  if (places <= 0) return 'Свободных мест нет';
  return `Свободных мест: ${places}`;
}

export function participationModeLabel(
  mode: EventDetails['participationMode'],
): string {
  return mode === 'automatic'
    ? 'Присоединение подтверждается сразу.'
    : 'Участие подтверждает организатор после заявки.';
}
