import type { components } from '@vmeste/api-client';

export type EventSummary = components['schemas']['EventSummaryDto'];

export function formatEventDate(value: string, timeZone?: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    ...(timeZone ? { timeZone } : {}),
  }).format(new Date(value));
}

export function formatEventOccupancy(event: EventSummary): string {
  return event.isFull
    ? `${event.participantsCount} из ${event.capacity} участников. Мест нет.`
    : `${event.participantsCount} из ${event.capacity} участников.`;
}

export function getEventAccessibilityLabel(event: EventSummary): string {
  return [
    event.category.name,
    event.title,
    formatEventDate(event.startsAt, event.city.timeZone),
    `Место: ${event.meetingPlace}`,
    formatEventOccupancy(event),
  ].join('. ');
}
