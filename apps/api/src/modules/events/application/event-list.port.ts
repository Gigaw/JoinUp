export const EVENT_LIST_REPOSITORY = Symbol('EVENT_LIST_REPOSITORY');

export function normalizeEventSearchQuery(
  value: string | undefined,
): string | undefined {
  const normalized = value?.trim().replace(/\s+/g, ' ');
  return normalized || undefined;
}

export type EventListFilters = {
  cityId: string;
  categoryIds: readonly string[];
  q?: string;
  cursor?: string;
  limit: number;
};

export type EventListPage = {
  eventIds: string[];
  nextCursor: string | null;
};

export interface EventListRepository {
  list(filters: EventListFilters): Promise<EventListPage>;
}

export class InvalidEventCursorError extends Error {
  constructor() {
    super('Invalid event list cursor.');
    this.name = 'InvalidEventCursorError';
  }
}
